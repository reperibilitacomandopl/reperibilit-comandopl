import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

function hoursDiff(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.round((ms / 3600000) * 100) / 100
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canManageShifts)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const tenantId = session.user.tenantId

  try {
    const firstDay = new Date(Date.UTC(year, month - 1, 1))
    const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    const [agents, clockRecords, globalSettings] = await Promise.all([
      prisma.user.findMany({
        where: { role: "AGENTE", tenantId: tenantId || undefined },
        select: { id: true, name: true, matricola: true },
        orderBy: { name: "asc" }
      }),
      prisma.clockRecord.findMany({
        where: { tenantId, timestamp: { gte: firstDay, lte: lastDay } },
        orderBy: { timestamp: "asc" }
      }),
      prisma.globalSettings.findUnique({ where: { tenantId: tenantId || "" } })
    ])

    const bpContinuato = globalSettings?.bpTurnoContinuato ?? 7
    const bpMinT1 = globalSettings?.bpStaccoMinTurno1 ?? 6
    const bpMaxPausa = globalSettings?.bpStaccoMaxPausa ?? 2
    const bpMinT2 = globalSettings?.bpStaccoMinTurno2 ?? 2

    const results = agents.map((agent: any) => {
      const aClocks = clockRecords.filter((c: any) => c.userId === agent.id)
      
      // Raggruppa per giorno
      const clocksByDay: Record<string, any[]> = {}
      aClocks.forEach((c: any) => {
        const d = new Date(c.timestamp)
        const dayKey = d.toISOString().split('T')[0]
        if (!clocksByDay[dayKey]) clocksByDay[dayKey] = []
        clocksByDay[dayKey].push({ type: c.type, ts: new Date(c.timestamp) })
      })

      const bpDates: { date: string, type: 'CONTINUOUS' | 'SPLIT' | 'FALLBACK', details: string }[] = []

      Object.entries(clocksByDay).forEach(([date, records]) => {
        records.sort((a, b) => a.ts.getTime() - b.ts.getTime())
        
        const pairs: { inTime: Date, outTime: Date }[] = []
        for (let i = 0; i < records.length; i++) {
          if (records[i].type.startsWith("IN")) {
            for (let j = i + 1; j < records.length; j++) {
              if (records[j].type.startsWith("OUT")) {
                pairs.push({ inTime: records[i].ts, outTime: records[j].ts })
                i = j
                break
              }
            }
          }
        }

        if (pairs.length === 0) return

        let totalHours = pairs.reduce((sum, p) => sum + hoursDiff(p.inTime, p.outTime), 0)

        if (pairs.length === 1) {
          if (totalHours >= bpContinuato) {
            bpDates.push({ date, type: 'CONTINUOUS', details: `${totalHours}h continuative` })
          }
        } else if (pairs.length >= 2) {
          const t1 = hoursDiff(pairs[0].inTime, pairs[0].outTime)
          const pausa = hoursDiff(pairs[0].outTime, pairs[1].inTime)
          const t2 = hoursDiff(pairs[1].inTime, pairs[1].outTime)

          if (t1 >= bpMinT1 && pausa <= bpMaxPausa && t2 >= bpMinT2) {
            bpDates.push({ date, type: 'SPLIT', details: `Spezzato: ${t1}h + ${pausa}h pausa + ${t2}h` })
          } else if (totalHours >= bpContinuato) {
            bpDates.push({ date, type: 'FALLBACK', details: `Totale ${totalHours}h (non spezzato standard)` })
          }
        }
      })

      return {
        id: agent.id,
        name: agent.name,
        matricola: agent.matricola,
        bpCount: bpDates.length,
        bpDates
      }
    })

    return NextResponse.json(results)

  } catch (error: any) {
    console.error("[BP_CALC_ERROR]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
