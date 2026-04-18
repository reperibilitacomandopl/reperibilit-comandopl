import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  try {
    const tenantId = session.user.tenantId
    const userId = session.user.id

    const balance = await prisma.agentBalance.findUnique({
      where: { userId_year_tenantId: { userId, year, tenantId: tenantId || "" } },
      include: { details: true }
    })

    // Pre-calculate usage for this year (simplified: count shifts for each code)
    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
    
    const shiftsCount = await prisma.shift.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startDate, lte: endDate }, tenantId: tenantId || null },
      _count: { _all: true }
    })

    // Ore extra e agenda
    const agendaSums = await prisma.agendaEntry.groupBy({
      by: ['code'],
      where: { userId, date: { gte: startDate, lte: endDate }, tenantId: tenantId || null },
      _sum: { hours: true },
      _count: { _all: true }
    })

    const overtimeSums = await prisma.shift.aggregate({
      where: { userId, date: { gte: startDate, lte: endDate }, overtimeHours: { gt: 0 }, tenantId: tenantId || null },
      _sum: { overtimeHours: true }
    })

    return NextResponse.json({ balance, usage: { shiftsCount, agendaSums, overtimeSums } })
  } catch (error) {
    console.error("[AGENT BALANCES GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
