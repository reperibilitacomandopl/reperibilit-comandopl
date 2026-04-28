import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
  const userId = session.user.id
  const tenantId = session.user.tenantId

  try {
    // 1. Fetch all AgendaEntries for the year
    const agendaEntries = await prisma.agendaEntry.findMany({
      where: {
        userId,
        tenantId,
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1))
        }
      },
      orderBy: { date: 'asc' }
    })

    // 2. Fetch all Shifts for the year
    const shifts = await prisma.shift.findMany({
      where: {
        userId,
        tenantId,
        date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1))
        }
      },
      orderBy: { date: 'asc' }
    })

    // 3. Fetch Balances for the year
    const balance = await prisma.agentBalance.findUnique({
      where: { userId_year_tenantId: { userId, year, tenantId: tenantId || "" } },
      include: { details: true }
    })

    // 4. Aggregate Monthly Data
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      workHours: 0,
      overtimeHours: 0,
      extraordinaryHours: 0,
      leaveDays: 0,
      sickDays: 0,
      recoveryHours: 0,
      repCount: 0
    }))

    const straCodes = ['2000','2050','2001','2002','2003','2020','2021','2022','2023','2026','10001','10002','10003']
    const ferieCodes = ['0015','0016','0010']
    const recCodes = ['0009','0067','0008','0081','0036','0037']
    const sickCodes = ['0018','0032','0003','0035']

    shifts.forEach((s: any) => {
      const m = new Date(s.date).getUTCMonth()
      monthlyStats[m].workHours += s.durationHours || 0
      monthlyStats[m].overtimeHours += s.overtimeHours || 0
      if (s.repType?.toUpperCase().includes("REP")) {
        monthlyStats[m].repCount++
      }
    })

    agendaEntries.forEach((e: any) => {
      const m = new Date(e.date).getUTCMonth()
      if (straCodes.includes(e.code)) monthlyStats[m].extraordinaryHours += e.hours || 0
      if (ferieCodes.includes(e.code)) monthlyStats[m].leaveDays++
      if (sickCodes.includes(e.code)) monthlyStats[m].sickDays++
      if (recCodes.includes(e.code)) monthlyStats[m].recoveryHours += e.hours || 0
    })

    return NextResponse.json({
      year,
      monthlyStats,
      balance,
      summary: {
        totalWorkHours: monthlyStats.reduce((sum, m) => sum + m.workHours, 0),
        totalOvertime: monthlyStats.reduce((sum, m) => sum + m.overtimeHours, 0),
        totalExtra: monthlyStats.reduce((sum, m) => sum + m.extraordinaryHours, 0),
        totalLeave: monthlyStats.reduce((sum, m) => sum + m.leaveDays, 0),
        totalSick: monthlyStats.reduce((sum, m) => sum + m.sickDays, 0),
        totalRep: monthlyStats.reduce((sum, m) => sum + m.repCount, 0),
      }
    })

  } catch (error: any) {
    console.error("[YEARLY_STATS_ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
