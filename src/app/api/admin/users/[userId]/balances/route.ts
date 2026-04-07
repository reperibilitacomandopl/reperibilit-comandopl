// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  try {
    const tenantId = session.user.tenantId

    // 1. Get Initial Balances (AgentBalance + BalanceDetail)
    const balance = await prisma.agentBalance.findUnique({
      where: { userId_year_tenantId: { userId, year, tenantId: tenantId || "" } },
      include: { details: true }
    })

    // 2. Get Actual Usage (Absences and Shifts with specific codes)
    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
    
    // Usage from Absences (F, M, 104, etc.)
    const absences = await prisma.absence.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, tenantId: tenantId || null }
    })

    // Usage from AgendaEntry (Historical/Detailed)
    const agendaEntries = await prisma.agendaEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate }, tenantId: tenantId || null }
    })

    // 3. Get Pending Requests (AgentRequest with status PENDING)
    const pendingRequests = await prisma.agentRequest.findMany({
      where: { userId, status: "PENDING", date: { gte: startDate, lte: endDate }, tenantId: tenantId || null }
    })

    return NextResponse.json({
      balance,
      usage: {
        absences,
        agendaEntries
      },
      requests: pendingRequests
    })
  } catch (error) {
    console.error("[USER BALANCES GET]", error)
    return NextResponse.json({ error: "Errore caricamento saldi operatore" }, { status: 500 })
  }
}
