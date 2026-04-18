import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") || "1")
  const year = parseInt(searchParams.get("year") || "2024")

  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1, 23, 59, 59)) // Include il 1° del mese dopo

    const users = await prisma.user.findMany({ 
      where: { tenantId: session.user.tenantId, role: "AGENTE" },
      select: { id: true, name: true, rotationGroupId: true, rotationGroup: true, fixedRestDay: true }, 
      orderBy: { name: 'asc' } 
    })
    const shifts = await prisma.shift.findMany({
      where: { 
        tenantId: session.user.tenantId,
        date: { gte: startDate, lte: endDate } 
      },
      select: { id: true, userId: true, date: true, type: true, timeRange: true, isSyncedToVerbatel: true, repType: true }
    })

    // === INIEZIONE TURNI TEORICI ===
    const nextMonthFirst = new Date(Date.UTC(year, month, 1))
    const augmentedShifts = [...shifts]
    const { resolveTheoreticalShift } = await import("@/utils/theoretical-shift")

    users.forEach(user => {
      const hasNextDay = shifts.some(s => s.userId === user.id && new Date(s.date).getTime() === nextMonthFirst.getTime())
      if (!hasNextDay) {
        const theoretical = resolveTheoreticalShift({ user, date: nextMonthFirst })
        if (theoretical) {
          augmentedShifts.push({
            id: `theoretical-${user.id}`,
            userId: user.id,
            date: nextMonthFirst,
            type: theoretical,
            isTheoretical: true
          } as any)
        }
      }
    })

    return NextResponse.json({ users, shifts: augmentedShifts })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { updates } = await request.json()
    // updates: { userId, date (YYYY-MM-DD), type, timeRange? }[]
    
    if (!updates || updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const { inferTimeRangeFromMacro } = await import("@/utils/sync-shift")
    const { isAssenza } = await import("@/utils/shift-logic")
    const { Prisma } = await import("@prisma/client")

    // Pre-fetch existing shifts for all affected user+date combos in ONE query
    const userIds = Array.from(new Set<string>(updates.map((u: any) => u.userId)))
    const dates = Array.from(new Set<string>(updates.map((u: any) => u.date)))
    const minDate = new Date(dates.sort()[0] + "T00:00:00.000Z")
    const maxDate = new Date(dates.sort().pop()! + "T23:59:59.999Z")
    
    const existingShifts = await prisma.shift.findMany({
      where: {
        tenantId: session.user.tenantId,
        userId: { in: userIds },
        date: { gte: minDate, lte: maxDate }
      },
      select: { id: true, userId: true, date: true, repType: true, serviceCategoryId: true, serviceTypeId: true, vehicleId: true }
    })

    // Build a lookup map: "userId|date" -> existing shift
    const existingMap = new Map<string, any>()
    existingShifts.forEach(s => {
      const key = `${s.userId}|${s.date.toISOString().split('T')[0]}`
      existingMap.set(key, s)
    })

    // Split into updates vs inserts
    const toUpdate: any[] = []
    const toInsert: any[] = []

    for (const diff of updates) {
      if (!diff.type) continue
      
      const macroType = diff.type.trim().toUpperCase()
      let timeRange = diff.timeRange || null
      
      // Auto-derive timeRange if not provided
      if (!timeRange && !isAssenza(macroType)) {
        timeRange = inferTimeRangeFromMacro(macroType) || null
      }
      if (isAssenza(macroType)) timeRange = null

      const key = `${diff.userId}|${diff.date}`
      const existing = existingMap.get(key)

      if (existing) {
        toUpdate.push({
          id: existing.id,
          type: macroType,
          timeRange,
          // Preserve existing OdS fields
          repType: existing.repType,
          serviceCategoryId: isAssenza(macroType) ? null : existing.serviceCategoryId,
          serviceTypeId: isAssenza(macroType) ? null : existing.serviceTypeId,
          vehicleId: isAssenza(macroType) ? null : existing.vehicleId,
        })
      } else {
        toInsert.push({
          userId: diff.userId,
          date: diff.date,
          type: macroType,
          timeRange,
        })
      }
    }

    // BATCH 1: Bulk INSERT new shifts (single query)
    if (toInsert.length > 0) {
      const insertValues = toInsert.map(op =>
        Prisma.sql`(gen_random_uuid(), ${op.userId}, ${op.date + "T00:00:00.000Z"}::timestamp, ${op.type}, ${op.timeRange})`
      )
      await prisma.$executeRaw`
        INSERT INTO "Shift" ("id", "userId", "date", "type", "timeRange")
        VALUES ${Prisma.join(insertValues)}
        ON CONFLICT ("userId", "date") DO UPDATE SET 
          "type" = EXCLUDED."type",
          "timeRange" = EXCLUDED."timeRange"
      `
    }

    // BATCH 2: Bulk UPDATE existing shifts using a single transaction
    if (toUpdate.length > 0) {
      const BATCH = 200
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH)
        await prisma.$transaction(
          batch.map(op => prisma.shift.update({
            where: { id: op.id },
            data: {
              type: op.type,
              timeRange: op.timeRange,
              repType: op.repType,
              serviceCategoryId: op.serviceCategoryId,
              serviceTypeId: op.serviceTypeId,
              vehicleId: op.vehicleId,
            }
          }))
        )
      }
    }

    return NextResponse.json({ success: true, count: toUpdate.length + toInsert.length })
  } catch (error) {
    console.error("[MONTHLY SHIFTS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { year, month, months, userId } = await request.json()
    if (!year || (!month && !months)) return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })

    const monthList = months || [month]
    const { isAssenzaProtetta } = await import("@/utils/shift-logic")
    let totalDeleted = 0

    for (const m of monthList) {
      const startDate = new Date(Date.UTC(year, m - 1, 1))
      const lastDay = new Date(Date.UTC(year, m, 0, 23, 59, 59))

      const where: any = {
        tenantId: session.user.tenantId,
        date: { gte: startDate, lte: lastDay }
      }
      if (userId) where.userId = userId

      const allInMonth = await prisma.shift.findMany({ where })
      
      const idsToDelete = allInMonth
        .filter(s => !isAssenzaProtetta(s.type))
        .map(s => s.id)

      if (idsToDelete.length > 0) {
        await prisma.shift.deleteMany({
          where: { id: { in: idsToDelete } }
        })
        totalDeleted += idsToDelete.length
      }
    }

    return NextResponse.json({ success: true, count: totalDeleted })
  } catch (error) {
    console.error("[MONTHLY SHIFTS DELETE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
