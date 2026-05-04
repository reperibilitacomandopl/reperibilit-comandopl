import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

export async function GET(req: Request) {
  const session = await auth()
  
  if (session?.user?.role !== "ADMIN" && (!session?.user?.canManageShifts && !session?.user?.canManageUsers)) {
    return NextResponse.json({ error: "Accesso Non Autorizzato" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1 + "")
  const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "")
  const userId = searchParams.get("userId")
  const tenantId = session.user.tenantId
  const tf = tenantId ? { tenantId } : {}

  try {
    // 1. Fetch Agenti Attivi
    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", isActive: true, ...tf },
      select: { id: true, name: true, matricola: true, qualifica: true },
      orderBy: { name: "asc" }
    })

    if (!userId) {
       return NextResponse.json({ agents })
    }

    // 2. Fetch Detailed Data for Agent
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    const [shifts, requests, clockRecords, agenda, balances, settings] = await Promise.all([
      prisma.shift.findMany({
        where: { userId, date: { gte: startDate, lt: endDate }, ...tf },
        orderBy: { date: "asc" }
      }),
      prisma.agentRequest.findMany({
        where: { userId, date: { gte: startDate, lt: endDate }, ...tf },
        orderBy: { date: "asc" }
      }),
      prisma.clockRecord.findMany({
        where: { userId, timestamp: { gte: startDate, lt: endDate }, ...tf },
        orderBy: { timestamp: "asc" }
      }),
      prisma.agendaEntry.findMany({
        where: { userId, date: { gte: startDate, lt: endDate }, ...tf },
        orderBy: { date: "asc" }
      }),
      prisma.agentBalance.findFirst({
        where: { userId, year, ...tf },
        include: { details: true }
      }),
      prisma.globalSettings.findUnique({
        where: { tenantId: tenantId || "default" }
      })
    ])

    return NextResponse.json({
       agents,
       shifts,
       requests,
       clockRecords,
       agenda,
       balances,
       settings
    })

  } catch (error) {
    console.error("[CARTELLINO API ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
