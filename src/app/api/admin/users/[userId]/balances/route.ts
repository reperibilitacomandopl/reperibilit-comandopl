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
    // 1. Get Initial Balances (AgentBalance + BalanceDetail)
    const balance = await prisma.agentBalance.findUnique({
      where: { userId_year: { userId, year } },
      include: { details: true }
    })

    // 2. Get Actual Usage (Absences and Shifts with specific codes)
    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59))
    
    // Usage from Absences (F, M, 104, etc.)
    const absences = await prisma.absence.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } }
    })

    // Usage from AgendaEntry (Historical/Detailed)
    const agendaEntries = await prisma.agendaEntry.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } }
    })

    // 3. Get Pending Requests (AgentRequest with status PENDING)
    const pendingRequests = await prisma.agentRequest.findMany({
      where: { userId, status: "PENDING", date: { gte: startDate, lte: endDate } }
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
