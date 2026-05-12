import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

export async function GET(req: Request) {
  const session = await auth()
  
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  const isSelf = userId === session?.user?.id
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.canManageShifts || session?.user?.canManageUsers

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Accesso Non Autorizzato" }, { status: 401 })
  }
  const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1 + "")
  const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "")
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

    const startOfYear = new Date(Date.UTC(year, 0, 1))
    const endOfYear = new Date(Date.UTC(year + 1, 0, 1))

    const [shifts, requests, clockRecords, agenda, balances, settings, yearShifts] = await Promise.all([
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
      }),
      prisma.shift.findMany({
        where: { userId, date: { gte: startOfYear, lt: endOfYear }, ...tf },
        select: { type: true }
      })
    ])

    const usedFerie = yearShifts.filter((s: any) => {
      const t = (s.type || "").toUpperCase()
      return t === "FERIE" || t === "FERIE_" || t === "FERIE_AP" || t === "(F)" || t === "F" || t === "0015" || t === "0016"
    }).length

    const usedMalattia = yearShifts.filter((s: any) => {
      const t = (s.type || "").toUpperCase()
      return t === "MALATT" || t === "MALATTIA" || t === "MAL" || t === "M" || t === "(M)" || t === "MAL_FI" || t === "MAL_FIGLIO"
    }).length

    return NextResponse.json({
       agents,
       shifts,
       requests,
       clockRecords,
       agenda,
       balances,
       settings,
       yearlyStats: {
         usedFerie,
         usedMalattia
       }
    })

  } catch (error) {
    console.error("[CARTELLINO API ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
