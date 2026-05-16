import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"
import { getLabel, AGENDA_CATEGORIES } from "@/utils/agenda-codes"

// ─── Helper: calcola ore tra due timestamp in centesimi ───
function hoursDiff(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.round((ms / 3600000) * 100) / 100
}

// ─── Helper: calcola ore notturne (22:00-06:00) tra due timestamp ───
function nightHoursBetween(start: Date, end: Date): number {
  if (end <= start) return 0
  let nightMinutes = 0
  const cursor = new Date(start)

  while (cursor < end) {
    const h = cursor.getHours()
    const isNight = h >= 22 || h < 6
    if (isNight) {
      nightMinutes++
    }
    cursor.setMinutes(cursor.getMinutes() + 1)
  }
  return Math.round((nightMinutes / 60) * 100) / 100
}

// ─── Helper: ore reperibilità dalla label ───
function repHoursFromLabel(repType: string): number {
  if (!repType) return 0
  const match = repType.match(/(\d{1,2})-(\d{1,2})/)
  if (match) {
    let start = parseInt(match[1])
    let end = parseInt(match[2])
    if (end <= start) end += 24
    return end - start
  }
  if (repType.includes("24")) return 24
  return 9 // default REP 22-07
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "ADMIN" && !session.user.canManageShifts)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}
    const { searchParams } = new URL(request.url)
    
    // Support sia formato vecchio (year/month) che nuovo (startDate/endDate)
    let firstDay: Date
    let lastDay: Date
    
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    
    if (startDateParam && endDateParam) {
      firstDay = new Date(`${startDateParam}T00:00:00.000Z`)
      lastDay = new Date(`${endDateParam}T23:59:59.999Z`)
    } else {
      const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
      const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
      firstDay = new Date(Date.UTC(year, month - 1, 1))
      lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59))
    }

    const [agents, shifts, agendaEntries, agentRequests, clockRecords, globalSettings] = await Promise.all([
      prisma.user.findMany({
        where: { role: "AGENTE", ...tf },
        select: { id: true, name: true, matricola: true, qualifica: true },
        orderBy: { name: "asc" }
      }),
      prisma.shift.findMany({
        where: { ...tf, date: { gte: firstDay, lte: lastDay } },
        select: { userId: true, type: true, repType: true, date: true, timeRange: true, durationHours: true, overtimeHours: true }
      }),
      prisma.agendaEntry.findMany({
        where: { ...tf, date: { gte: firstDay, lte: lastDay } },
        select: { userId: true, code: true, hours: true, date: true }
      }),
      prisma.agentRequest.findMany({
        where: { ...tf, date: { gte: firstDay, lte: lastDay }, status: 'APPROVED', code: 'STR_EXTRA' },
        select: { userId: true, hours: true, date: true }
      }),
      prisma.clockRecord.findMany({
        where: { ...tf, timestamp: { gte: firstDay, lte: lastDay } },
        select: { userId: true, timestamp: true, type: true },
        orderBy: { timestamp: "asc" }
      }),
      prisma.globalSettings.findFirst({ where: tf })
    ])

    // Parametri Buoni Pasto (configurabili dall'admin)
    const bpContinuato = (globalSettings as any)?.bpTurnoContinuato ?? 7
    const bpMinT1 = (globalSettings as any)?.bpStaccoMinTurno1 ?? 6
    const bpMaxPausa = (globalSettings as any)?.bpStaccoMaxPausa ?? 2
    const bpMinT2 = (globalSettings as any)?.bpStaccoMinTurno2 ?? 2

    // ─── CALCOLO PER AGENTE ───
    const payrollData = agents.map((agent: any) => {
      const aShifts = shifts.filter((s: any) => s.userId === agent.id)
      const aAgenda = agendaEntries.filter((a: any) => a.userId === agent.id)
      const aStrExtra = agentRequests.filter((r: any) => r.userId === agent.id)
      const aClocks = clockRecords.filter((c: any) => c.userId === agent.id)

      // 1. ASSENZE & CODICI (dalla pianificazione + agenda)
      const codiciMap: Record<string, { label: string, value: number, unit: string }> = {}

      aShifts.forEach((s: any) => {
        const t = (s.type || "").toUpperCase().trim()
        if (t === "FERIE" || t === "F") {
          const k = "0015"
          if (!codiciMap[k]) codiciMap[k] = { label: "Ferie Anno Corrente", value: 0, unit: "gg" }
          codiciMap[k].value += 1
        } else if (t === "FERIE_" || t === "FERIE_AP") {
          const k = "0016"
          if (!codiciMap[k]) codiciMap[k] = { label: "Ferie Anni Precedenti", value: 0, unit: "gg" }
          codiciMap[k].value += 1
        } else if (t === "MALATT" || t === "MALATTIA" || t === "MAL" || t === "M") {
          const k = "MALATTIA"
          if (!codiciMap[k]) codiciMap[k] = { label: "Malattia Standard", value: 0, unit: "gg" }
          codiciMap[k].value += 1
        } else if (t === "104" || t === "104_1") {
          const k = "0031"
          if (!codiciMap[k]) codiciMap[k] = { label: "Permessi L.104/92 Assistito 1", value: 0, unit: "gg" }
          codiciMap[k].value += 1
        } else if (t === "FEST_S") {
          const k = "0010"
          if (!codiciMap[k]) codiciMap[k] = { label: "Festività Soppresse", value: 0, unit: "gg" }
          codiciMap[k].value += 1
        } else {
          // Fallback: cerca dinamicamente in tutti i codici disponibili
          let foundCode = null
          let foundLabel = null
          for (const cat of AGENDA_CATEGORIES) {
            const match = cat.items.find(i => i.code === t || i.shortCode === t || (i as any).label?.toUpperCase() === t)
            if (match) {
              foundCode = match.code
              foundLabel = match.label
              break
            }
          }
          if (foundCode && foundLabel) {
             if (!codiciMap[foundCode]) codiciMap[foundCode] = { label: foundLabel, value: 0, unit: "gg" }
             codiciMap[foundCode].value += 1
          }
        }
      })

      aAgenda.forEach((a: any) => {
        const label = getLabel(a.code)
        if (!codiciMap[a.code]) codiciMap[a.code] = { label, value: 0, unit: a.hours ? "h" : "gg" }
        codiciMap[a.code].value += (a.hours || 1)
      })

      // 2. REPERIBILITÀ (dalla pianificazione, NO timbrature)
      let repFeriale = 0
      let repFestiva = 0

      aShifts.forEach((s: any) => {
        if (s.repType) {
          const hours = repHoursFromLabel(s.repType)
          const shiftDate = new Date(s.date)
          if (isHoliday(shiftDate)) {
            repFestiva += hours
          } else {
            repFeriale += hours
          }
        }
      })

      // 3. TIMBRATURE → Ore Lavorate e Buoni Pasto
      const clocksByDay: Record<string, { type: string, ts: Date }[]> = {}
      aClocks.forEach((c: any) => {
        const d = new Date(c.timestamp)
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        if (!clocksByDay[dayKey]) clocksByDay[dayKey] = []
        clocksByDay[dayKey].push({ type: c.type, ts: new Date(c.timestamp) })
      })

      let oreDiurne = 0
      let oreNotturne = 0
      let buoniPasto = 0
      
      let straordinarioDiurnoFeriale = 0
      let straordinarioDiurnoFestivo = 0
      let straordinarioNotturnoFeriale = 0
      let straordinarioNotturnoFestivo = 0

      // Mappa Turni Pianificati e Straordinari Approvati per giorno
      const plannedAuthByDay: Record<string, { nominalH: number, authOvertime: number, isFestivo: boolean }> = {}
      aShifts.forEach((s: any) => {
        const d = new Date(s.date)
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        let nominalH = 6
        if (s.durationHours) nominalH = s.durationHours
        else if (s.timeRange) {
           const match = s.timeRange.split("-")
           if (match.length === 2) {
              const [h1, m1] = match[0].split(":").map(Number)
              const [h2, m2] = match[1].split(":").map(Number)
              let diff = (h2 + (m2||0)/60) - (h1 + (m1||0)/60)
              if (diff < 0) diff += 24
              nominalH = diff
           }
        }
        if (!plannedAuthByDay[dayKey]) plannedAuthByDay[dayKey] = { nominalH: 0, authOvertime: 0, isFestivo: isHoliday(d) }
        plannedAuthByDay[dayKey].nominalH += nominalH
        plannedAuthByDay[dayKey].authOvertime += (s.overtimeHours || 0)
      })
      aStrExtra.forEach((req: any) => {
        const d = new Date(req.date)
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        if (!plannedAuthByDay[dayKey]) plannedAuthByDay[dayKey] = { nominalH: 0, authOvertime: 0, isFestivo: isHoliday(d) }
        plannedAuthByDay[dayKey].authOvertime += (req.hours || 0)
      })

      Object.entries(clocksByDay).forEach(([dayKey, records]) => {
        records.sort((a, b) => a.ts.getTime() - b.ts.getTime())
        
        // Accoppia IN/OUT
        const pairs: { inTime: Date, outTime: Date }[] = []
        for (let i = 0; i < records.length; i++) {
          if (records[i].type === "IN" || records[i].type === "INGRESSO") {
            for (let j = i + 1; j < records.length; j++) {
              if (records[j].type === "OUT" || records[j].type === "USCITA") {
                pairs.push({ inTime: records[i].ts, outTime: records[j].ts })
                i = j 
                break
              }
            }
          }
        }

        if (pairs.length === 0) return

        let totalHoursDay = 0
        let nightHoursDay = 0

        pairs.forEach(p => {
          const h = hoursDiff(p.inTime, p.outTime)
          const night = nightHoursBetween(p.inTime, p.outTime)
          nightHoursDay += night
          totalHoursDay += h
        })
        
        oreNotturne += nightHoursDay
        oreDiurne += (totalHoursDay - nightHoursDay)

        // ─── BUONI PASTO ───
        // INCROCIO: Viene dato il buono se la somma ore reali rispetta le regole minime
        if (pairs.length === 1) {
          if (totalHoursDay >= bpContinuato) buoniPasto++
        } else if (pairs.length >= 2) {
          const turno1Hours = hoursDiff(pairs[0].inTime, pairs[0].outTime)
          const pausa = hoursDiff(pairs[0].outTime, pairs[1].inTime)
          const turno2Hours = hoursDiff(pairs[1].inTime, pairs[1].outTime)
          if (turno1Hours >= bpMinT1 && pausa <= bpMaxPausa && turno2Hours >= bpMinT2) {
            buoniPasto++
          } else if (totalHoursDay >= bpContinuato) {
            buoniPasto++
          }
        }

        // ─── STRAORDINARI ───
        // Straordinario riconosciuto = Min(Auth Overtime, Actual Overtime)
        const plannedInfo = plannedAuthByDay[dayKey]
        if (plannedInfo && plannedInfo.authOvertime > 0) {
           const actualOvertime = Math.max(0, totalHoursDay - plannedInfo.nominalH)
           const payableOvertime = Math.min(actualOvertime, plannedInfo.authOvertime)
           
           if (payableOvertime > 0) {
              // Ripartizione Diurno/Notturno in base alla % di notturno nel turno extra
              // Per semplicità, se ha fatto notturno nel giorno, lo proporzioniamo o lo attribuiamo come priorità al notturno se l'OUT è di notte.
              // Approccio rigoroso: se l'ultimo OUT è > 22:00, l'extra è primariamente notturno.
              const lastOutTime = pairs[pairs.length - 1].outTime.getHours()
              let extraNott = 0
              if (lastOutTime >= 22 || lastOutTime < 6) {
                 // Ha staccato di notte. Diamo priorità allo straordinario notturno (fino al cap delle ore notturne totali fatte)
                 extraNott = Math.min(payableOvertime, nightHoursDay)
              }
              const extraDiur = payableOvertime - extraNott
              
              if (plannedInfo.isFestivo) {
                 straordinarioNotturnoFestivo += extraNott
                 straordinarioDiurnoFestivo += extraDiur
              } else {
                 straordinarioNotturnoFeriale += extraNott
                 straordinarioDiurnoFeriale += extraDiur
              }
           }
        }
      })

      // Arrotonda a centesimi
      oreDiurne = Math.round(oreDiurne * 100) / 100
      oreNotturne = Math.round(oreNotturne * 100) / 100
      straordinarioDiurnoFeriale = Math.round(straordinarioDiurnoFeriale * 100) / 100
      straordinarioDiurnoFestivo = Math.round(straordinarioDiurnoFestivo * 100) / 100
      straordinarioNotturnoFeriale = Math.round(straordinarioNotturnoFeriale * 100) / 100
      straordinarioNotturnoFestivo = Math.round(straordinarioNotturnoFestivo * 100) / 100

      return {
        id: agent.id,
        nome: agent.name,
        matricola: agent.matricola,
        qualifica: agent.qualifica || "",
        codici: codiciMap,
        repFeriale: Math.round(repFeriale * 100) / 100,
        repFestiva: Math.round(repFestiva * 100) / 100,
        oreDiurne,
        oreNotturne,
        buoniPasto,
        straordinarioDiurnoFeriale,
        straordinarioDiurnoFestivo,
        straordinarioNotturnoFeriale,
        straordinarioNotturnoFestivo
      }
    })

    return NextResponse.json(payrollData)
  } catch (error) {
    console.error("Export paghe error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
