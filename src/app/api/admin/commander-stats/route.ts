import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const tenantId = session.user.tenantId!

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // 1. Organico
    const totalAgents = await prisma.user.count({
      where: { tenantId, isActive: true, isSuperAdmin: false }
    })
    const totalOfficers = await prisma.user.count({
      where: { tenantId, isActive: true, isUfficiale: true }
    })

    // 2. Copertura mese corrente
    const shiftsThisMonth = await prisma.shift.count({
      where: { tenantId, date: { gte: startOfMonth, lte: endOfMonth }, type: { not: null } }
    })
    const daysInMonth = endOfMonth.getDate()
    const coverageRate = totalAgents > 0 ? Math.round((shiftsThisMonth / (totalAgents * daysInMonth)) * 100) : 0

    // 3. Assenze attive oggi
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const absencesToday = await prisma.absence.count({
      where: { tenantId, date: { gte: today, lt: tomorrow } }
    })

    // 4. Interventi ultimi 30 giorni
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const totalInterventions = await prisma.intervention.count({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } }
    })
    const completedInterventions = await prisma.intervention.count({
      where: { tenantId, status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } }
    })

    // 5. Richieste pendenti
    const pendingRequests = await prisma.agentRequest.count({
      where: { tenantId, status: { in: ["PENDING_OFFICER", "PENDING_ADMIN"] } }
    })

    // 6. Scadenze prossimi 30 giorni
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringDocs = await prisma.user.count({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { scadenzaPatente: { lte: next30, gte: now } },
          { scadenzaPortoArmi: { lte: next30, gte: now } }
        ]
      }
    })

    // 7. Straordinario mensile
    const overtimeShifts = await prisma.shift.findMany({
      where: { tenantId, date: { gte: startOfMonth, lte: endOfMonth }, overtimeHours: { gt: 0 } },
      select: { overtimeHours: true }
    })
    const totalOvertime = overtimeShifts.reduce((sum: number, s: { overtimeHours: number | null }) => sum + (s.overtimeHours || 0), 0)

    // 8. Tasso assenteismo mensile
    const totalShiftsPossible = totalAgents * daysInMonth
    const absenceCount = await prisma.absence.count({
      where: { tenantId, date: { gte: startOfMonth, lte: endOfMonth } }
    })
    const absenteeismRate = totalShiftsPossible > 0 ? Math.round((absenceCount / totalShiftsPossible) * 100) : 0

    // 9. Media interventi giornalieri (ultimi 30 gg)
    const avgDailyInterventions = (totalInterventions / 30).toFixed(1)

    return NextResponse.json({
      organico: { total: totalAgents, officers: totalOfficers },
      copertura: { rate: coverageRate, shifts: shiftsThisMonth, possible: totalShiftsPossible },
      interventi: { total: totalInterventions, completed: completedInterventions, avgDaily: avgDailyInterventions },
      assenze: { today: absencesToday, rate: absenteeismRate },
      richieste: { pending: pendingRequests },
      scadenze: { documenti: expiringDocs },
      straordinario: { ore: totalOvertime }
    })
  } catch (error) {
    console.error("[COMMANDER_STATS_ERROR]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
