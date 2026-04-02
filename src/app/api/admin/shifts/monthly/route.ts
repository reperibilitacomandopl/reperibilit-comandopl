import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get("month") || "1")
  const year = parseInt(searchParams.get("year") || "2024")

  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    const users = await prisma.user.findMany({ 
      select: { id: true, name: true, rotationGroupId: true, rotationGroup: true, fixedRestDay: true }, 
      orderBy: { name: 'asc' } 
    })
    const shifts = await prisma.shift.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { id: true, userId: true, date: true, type: true, timeRange: true }
    })

    return NextResponse.json({ users, shifts })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { updates } = await request.json()
    // updates: { userId, date (YYYY-MM-DD), type }[]
    
    const { normalizeShiftData } = await import("@/utils/sync-shift")

    // Process them transactionally or sequentially
    // To be safe with Postgres and Date matching, we do findFirst/upsert sequential
    for (const diff of updates) {
      if (!diff.type) {
        // delete if exists? Or do nothing? Let's just update to "Riposo" or delete
        continue;
      }
      
      const targetDate = new Date(diff.date + "T00:00:00.000Z")
      
      const existing = await prisma.shift.findFirst({
        where: { userId: diff.userId, date: targetDate }
      })

      const normalized = normalizeShiftData({
        macroType: diff.type,
        timeRange: diff.timeRange || existing?.timeRange,
        serviceCategoryId: existing?.serviceCategoryId,
        serviceTypeId: existing?.serviceTypeId,
        vehicleId: existing?.vehicleId,
        repType: existing?.repType
      })

      if (existing) {
        await prisma.shift.update({
          where: { id: existing.id },
          data: { 
             type: normalized.type,
             timeRange: normalized.timeRange,
             serviceCategoryId: normalized.serviceCategoryId,
             serviceTypeId: normalized.serviceTypeId,
             vehicleId: normalized.vehicleId,
             repType: normalized.repType
          }
        })
      } else {
        await prisma.shift.create({
          data: {
             userId: diff.userId,
             date: targetDate,
             type: normalized.type,
             timeRange: normalized.timeRange,
             serviceCategoryId: normalized.serviceCategoryId,
             serviceTypeId: normalized.serviceTypeId,
             vehicleId: normalized.vehicleId,
             repType: normalized.repType
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[MONTHLY SHIFTS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
