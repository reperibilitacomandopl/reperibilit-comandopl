import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/stats/monthly?year=2026&month=4
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Tenant mancante" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())

    const firstDay = new Date(Date.UTC(year, month - 1, 1))
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    // Fetch all agents
    const agents = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, matricola: true, qualifica: true, isUfficiale: true, squadra: true },
      orderBy: { name: "asc" }
    })

    // Fetch all shifts for this month
    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        date: { gte: firstDay, lte: lastDay }
      },
      select: { userId: true, date: true, type: true, durationHours: true, overtimeHours: true, timeRange: true }
    })

    // Fetch agenda entries (overtime, extras)
    const agendaEntries = await prisma.agendaEntry.findMany({
      where: {
        tenantId,
        date: { gte: firstDay, lte: lastDay }
      },
      select: { userId: true, code: true, hours: true, date: true }
    })

    // Build per-agent stats
    const agentStats = agents.map(agent => {
      const agentShifts = shifts.filter(s => s.userId === agent.id)
      const agentAgenda = agendaEntries.filter(e => e.userId === agent.id)

      let turniMattina = 0
      let turniPomeriggio = 0
      let riposiProgrammati = 0
      let ferie = 0
      let malattia = 0
      let permessi104 = 0
      let altreAssenze = 0
      let oreLavorate = 0
      let oreStraordinario = 0

      agentShifts.forEach(s => {
        const t = s.type.toUpperCase()
        if (t.startsWith("M") && t !== "MAL" && t !== "MALATTIA" && t !== "MAL_FIGLIO" && t !== "MISSIONE" && t !== "MOT_PERS") {
          turniMattina++
          oreLavorate += s.durationHours || 6
        } else if (t.startsWith("P") && t !== "PNR") {
          turniPomeriggio++
          oreLavorate += s.durationHours || 6
        } else if (t === "RP" || t === "RR" || t === "RPS") {
          riposiProgrammati++
        } else if (t === "F" || t === "FERIE" || t === "FERIE_AP" || t === "FEST_SOP") {
          ferie++
        } else if (t === "MAL" || t === "MALATTIA" || t === "MAL_FIGLIO" || t === "M") {
          // Careful: plain "M" could be malattia in old data
          if (t === "M" && !t.startsWith("M")) malattia++
          else malattia++
        } else if (t === "104") {
          permessi104++
        } else {
          // Other absence types
          const assenzaCodes = ["CONG_PAT", "CONG_PAR", "CONGEDO", "MOT_PERS", "ELETT", "CORSO", "SMART", "MISSIONE", "VISITA", "ALLATT", "DON_SANGUE"]
          if (assenzaCodes.includes(t)) altreAssenze++
        }

        oreStraordinario += s.overtimeHours || 0
      })

      // Add agenda overtime
      agentAgenda.forEach(e => {
        if (e.code === "STRAO" || e.code === "STRAORDINARIO") {
          oreStraordinario += e.hours || 0
        }
      })

      const giorniLavorati = turniMattina + turniPomeriggio
      const giorniAssenza = ferie + malattia + permessi104 + altreAssenze

      return {
        id: agent.id,
        name: agent.name,
        matricola: agent.matricola,
        qualifica: agent.qualifica,
        isUfficiale: agent.isUfficiale,
        squadra: agent.squadra,
        turniMattina,
        turniPomeriggio,
        giorniLavorati,
        riposiProgrammati,
        ferie,
        malattia,
        permessi104,
        altreAssenze,
        giorniAssenza,
        oreLavorate: Math.round(oreLavorate * 10) / 10,
        oreStraordinario: Math.round(oreStraordinario * 10) / 10,
      }
    })

    // Totali
    const totals = {
      totalAgents: agents.length,
      totalGiorniLavorati: agentStats.reduce((a, s) => a + s.giorniLavorati, 0),
      totalOreLavorate: Math.round(agentStats.reduce((a, s) => a + s.oreLavorate, 0) * 10) / 10,
      totalOreStraordinario: Math.round(agentStats.reduce((a, s) => a + s.oreStraordinario, 0) * 10) / 10,
      totalFerie: agentStats.reduce((a, s) => a + s.ferie, 0),
      totalMalattia: agentStats.reduce((a, s) => a + s.malattia, 0),
      totalPermessi104: agentStats.reduce((a, s) => a + s.permessi104, 0),
      tassoAssenteismo: agents.length > 0 
        ? Math.round((agentStats.reduce((a, s) => a + s.giorniAssenza, 0) / (agents.length * new Date(year, month, 0).getDate())) * 1000) / 10
        : 0,
    }

    return NextResponse.json({ agentStats, totals, year, month })
  } catch (e: any) {
    console.error("Monthly stats error:", e)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
