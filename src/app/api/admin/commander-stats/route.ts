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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const today = new Date(); today.setUTCHours(0, 0, 0, 0)
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    const totalAgents = await prisma.user.count({ where: { tenantId, isActive: true, isSuperAdmin: false } })
    const totalOfficers = await prisma.user.count({ where: { tenantId, isActive: true, isUfficiale: true } })

    const shiftsThisMonth = await prisma.shift.count({ where: { tenantId, date: { gte: startOfMonth, lte: endOfMonth } } })
    const daysInMonth = endOfMonth.getDate()
    const coverageRate = totalAgents > 0 ? Math.round((shiftsThisMonth / (totalAgents * daysInMonth)) * 100) : 0

    const absencesToday = await prisma.absence.count({ where: { tenantId, date: { gte: today, lt: tomorrow } } })

    const pendingRequests = await prisma.agentRequest.count({ where: { tenantId, status: { in: ["PENDING_OFFICER", "PENDING_ADMIN"] } } })

    const expiringDocs = await prisma.user.count({
      where: { tenantId, isActive: true, OR: [
        { scadenzaPatente: { lte: next30, gte: now } },
        { scadenzaPortoArmi: { lte: next30, gte: now } }
      ]}
    })

    const overtimeShifts = await prisma.shift.findMany({
      where: { tenantId, date: { gte: startOfMonth, lte: endOfMonth }, overtimeHours: { gt: 0 } },
      select: { overtimeHours: true }
    })
    const totalOvertime = overtimeShifts.reduce((sum: number, s: { overtimeHours: number | null }) => sum + (s.overtimeHours || 0), 0)

    const totalShiftsPossible = totalAgents * daysInMonth
    const absenceCount = await prisma.absence.count({ where: { tenantId, date: { gte: startOfMonth, lte: endOfMonth } } })
    const absenteeismRate = totalShiftsPossible > 0 ? Math.round((absenceCount / totalShiftsPossible) * 100) : 0

    // Interventi — wrapped per evitare errori se la tabella non esiste
    let totalInterventions = 0, completedInterventions = 0
    try {
      totalInterventions = await prisma.intervention.count({ where: { tenantId, createdAt: { gte: thirtyDaysAgo } } })
      completedInterventions = await prisma.intervention.count({ where: { tenantId, status: "COMPLETED", createdAt: { gte: thirtyDaysAgo } } })
    } catch { /* tabella non disponibile */ }

    return NextResponse.json({
      organico: { total: totalAgents, officers: totalOfficers },
      copertura: { rate: coverageRate, shifts: shiftsThisMonth, possible: totalShiftsPossible },
      interventi: { total: totalInterventions, completed: completedInterventions, avgDaily: totalInterventions > 0 ? (totalInterventions / 30).toFixed(1) : "0" },
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
