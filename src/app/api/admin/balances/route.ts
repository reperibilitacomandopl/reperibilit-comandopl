import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", ...tf },
      select: { 
        id: true, 
        name: true, 
        matricola: true,
        hasL104: true,
        l104Assistiti: true,
        hasStudyLeave: true,
        hasParentalLeave: true,
        hasChildSicknessLeave: true
      },
      orderBy: { name: "asc" }
    })

    const balances = await prisma.agentBalance.findMany({
      where: { year, ...tf },
      include: { details: true }
    })

    // Pre-calculate usage for this year
    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
    
    // Grouped counts for main display
    const shiftsCount = await prisma.shift.groupBy({
      by: ['userId', 'type'],
      where: { date: { gte: startDate, lte: endDate }, ...tf },
      _count: { _all: true }
    })

    const agendaSums = await prisma.agendaEntry.groupBy({
      by: ['userId', 'code'],
      where: { date: { gte: startDate, lte: endDate }, ...tf },
      _sum: { hours: true },
      _count: { _all: true }
    })

    const overtimeSums = await prisma.shift.groupBy({
      by: ['userId'],
      where: { date: { gte: startDate, lte: endDate }, overtimeHours: { gt: 0 }, ...tf },
      _sum: { overtimeHours: true }
    })

    return NextResponse.json({ 
      agents, 
      balances, 
      usage: { 
        shiftsCount, 
        agendaSums, 
        overtimeSums 
      } 
    })
  } catch (error) {
    console.error("[BALANCES GET]", error)
    return NextResponse.json({ error: "Errore caricamento saldi" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { year, updates } = await req.json()
    const tenantId = session.user.tenantId

    for (const update of updates) {
      const { userId, code, label, initialValue, unit } = update

      // 1. Get or create the AgentBalance for user/year
      let balance = await prisma.agentBalance.findFirst({
        where: { 
          userId, 
          year, 
          ...(tenantId ? { tenantId } : { tenantId: null }) 
        }
      })

      if (!balance) {
        balance = await prisma.agentBalance.create({
          data: { userId, year, tenantId: tenantId || null }
        })
      }

      // 2. Upsert the BalanceDetail
      const existingDetail = await prisma.balanceDetail.findFirst({
         where: { balanceId: balance.id, code }
      })
      
      if (existingDetail) {
         if (existingDetail.initialValue !== initialValue) {
             await logAudit({
                tenantId,
                adminId: session.user.id,
                adminName: session.user.name || undefined,
                action: "MODIFICA_SALDO",
                targetId: userId,
                details: `Modificato saldo ${code} da ${existingDetail.initialValue} a ${initialValue}`
             })
         }
         await prisma.balanceDetail.update({
            where: { id: existingDetail.id },
            data: { initialValue, unit, label }
         })
      } else {
         await prisma.balanceDetail.create({
            data: { balanceId: balance.id, code, label, initialValue, unit }
         })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[BALANCES PUT]", error)
    return NextResponse.json({ error: "Errore salvataggio saldi" }, { status: 500 })
  }
}

// Carry Over logic: Year N-1 -> Year N
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { fromYear, toYear } = await req.json()
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}
    
    // 1. Get all balances of fromYear
    const oldBalances = await prisma.agentBalance.findMany({
      where: { year: fromYear, ...tf },
      include: { details: true }
    })

    // 2. Get usage for fromYear to calculate "Residue"
    const startDate = new Date(Date.UTC(fromYear, 0, 1))
    const endDate = new Date(Date.UTC(fromYear, 11, 31, 23, 59, 59))
    const shiftsCount = await prisma.shift.groupBy({
      by: ['userId', 'type'],
      where: { date: { gte: startDate, lte: endDate }, ...tf },
      _count: { _all: true }
    })

    let count = 0
    for (const ob of oldBalances) {
      // Find Ferie (code 0015 usually) to move to Ferie Anni Precedenti (0016)
      const ferieDetail = ob.details.find(d => d.code === "0015" || d.code === "FERIE")
      if (!ferieDetail) continue

      const userUsage = shiftsCount.find((s:any) => s.userId === ob.userId && (s.type === "0015" || s.type === "FERIE"))?._count._all || 0
      const residue = Math.max(0, ferieDetail.initialValue - userUsage)

      if (residue > 0) {
        // Create/Update balance for toYear
        let nb = await prisma.agentBalance.findUnique({
          where: { userId_year_tenantId: { userId: ob.userId, year: toYear, tenantId: tenantId || "" } }
        })
        if (!nb) nb = await prisma.agentBalance.create({ data: { userId: ob.userId, year: toYear, tenantId: tenantId || null } })

        // Move to 0016 (Ferie Anni Precedenti)
        await prisma.balanceDetail.upsert({
          where: { balanceId_code: { balanceId: nb.id, code: "0016" } },
          update: { initialValue: residue },
          create: { balanceId: nb.id, code: "0016", label: "Ferie Anni Precedenti", initialValue: residue, unit: "DAYS" }
        })
        count++
      }
    }

    return NextResponse.json({ success: true, count, message: `Riportato saldo ferie per ${count} agenti.` })
  } catch (error) {
    console.error("[BALANCES POST]", error)
    return NextResponse.json({ error: "Errore riporto saldi" }, { status: 500 })
  }
}
