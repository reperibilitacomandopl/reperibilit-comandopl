import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const tenantId = session.user.tenantId
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

    const firstDay = new Date(Date.UTC(year, month - 1, 1))
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    const [agents, shifts, agendaEntries] = await Promise.all([
      prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, matricola: true } }),
      prisma.shift.findMany({ where: { tenantId, date: { gte: firstDay, lte: lastDay } } }),
      prisma.agendaEntry.findMany({ where: { tenantId, date: { gte: firstDay, lte: lastDay } } })
    ])

    const payrollData = agents.map(agent => {
      const gShifts = shifts.filter(s => s.userId === agent.id)
      const gAgenda = agendaEntries.filter(a => a.userId === agent.id)

      const map: Record<string, number> = {}

      gShifts.forEach(s => {
         const t = s.type.toUpperCase()
         // Basic mapping for Shifts that aren't rep
         if (t === "F" || t === "FERIE") map["0015"] = (map["0015"] || 0) + 1 // Ferie Base
         else if (t === "MALATTIA") map["0018"] = (map["0018"] || 0) + 1
         else if (t === "104") map["0031"] = (map["0031"] || 0) + 1
      })

      gAgenda.forEach(a => {
         map[a.code] = (map[a.code] || 0) + (a.hours || 1) // Sum hours or fallback to 1 (if daily)
      })

      return {
        id: agent.id,
        nome: agent.name,
        matricola: agent.matricola,
        codici: map
      }
    })

    return NextResponse.json(payrollData)
  } catch (error) {
    console.error("Export paghe error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
