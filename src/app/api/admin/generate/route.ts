import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

// Block codes from CONFIGURAZIONE - agent cannot do REP if their base shift is one of these
const BLOCK_CODES = ["F", "FERIE", "M", "MALATTIA", "104", "RR", "RP", "RPS", "CONGEDO",
  "ASS", "INFR", "CS", "PNR", "SD", "RF", "AM", "AP"]

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getDayOfWeek(day: number, month: number, year: number): number {
  return new Date(year, month, day).getDay() // 0=Sun, 6=Sat
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // === SETTINGS ===
    const { year: reqYear, month: reqMonth } = await req.json().catch(() => ({}))
    const settings = await prisma.globalSettings.findFirst()
    const year = reqYear ? parseInt(reqYear, 10) : (settings?.annoCorrente ?? 2026)
    const month = reqMonth ? parseInt(reqMonth, 10) - 1 : ((settings?.meseCorrente ?? 4) - 1) // JS months are 0-indexed
    const daysInMonth = getDaysInMonth(month, year)

    // === CONFIGURATION PARAMETERS ===
    const repPerAgenteBase = 5     // Reperibilita' base per agente
    const repPerUfficialeBase = 6  // Reperibilita' base per ufficiale
    const minGiorno = 7            // Min reperibili al giorno
    const maxGiorno = 8            // Max reperibili al giorno
    const usaProporzionale = true  // Proporzionalita' assenze attiva
    const festiviTarget = 2        // 2 festivi al mese: preferibilmente 1 Sab + 1 Dom

    // === LOAD AGENTS ===
    const agents = await prisma.user.findMany({
      where: { role: "AGENTE" },
      orderBy: { name: "asc" }
    })

    if (agents.length === 0) {
      return NextResponse.json({ error: "Nessun agente trovato nel database" }, { status: 400 })
    }

    // === LOAD BASE SHIFTS ===
    const existingShifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, month, 1)),
          lt: new Date(Date.UTC(year, month + 1, 1))
        }
      }
    })

    // Build lookup: baseShifts[agentId][day] = "M7" / "P14" etc.
    const baseShifts: Record<string, Record<number, string>> = {}
    for (const agent of agents) {
      baseShifts[agent.id] = {}
    }
    for (const s of existingShifts) {
      const day = new Date(s.date).getUTCDate()
      if (baseShifts[s.userId]) {
        baseShifts[s.userId][day] = s.type
      }
    }

    // === DATE FLAGS ===
    const isFestivo: Record<number, boolean> = {}
    const isSab: Record<number, boolean> = {}
    const isDom: Record<number, boolean> = {}
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = getDayOfWeek(d, month, year)
      isSab[d] = dow === 6
      isDom[d] = dow === 0
      isFestivo[d] = isHoliday(new Date(year, month, d))
    }

    // === BLOCKING FUNCTION ===
    function isBlocked(agentId: string, day: number): boolean {
      const shift = (baseShifts[agentId]?.[day] || "").toUpperCase().replace(/[()]/g, "")
      if (!shift) return true // No shift = day off = blocked
      if (shift.startsWith("F") || shift.startsWith("R")) return true
      for (const bc of BLOCK_CODES) {
        if (shift === bc) return true
      }
      return false
    }

    // === CALCULATE PROPORTIONAL TARGETS ===
    const repTarget: Record<string, number> = {}
    const fesTarget: Record<string, number> = {}
    const ferTarget: Record<string, number> = {}
    let totalTargetGlobal = 0

    for (const agent of agents) {
      const isUff = agent.isUfficiale
      // Use individual massimale from DB, fallback to defaults
      const baseTarget = agent.massimale || (isUff ? repPerUfficialeBase : repPerAgenteBase)

      // Count available days (not blocked)
      let availableDays = 0
      for (let d = 1; d <= daysInMonth; d++) {
        if (!isBlocked(agent.id, d)) {
          availableDays++
        }
      }

      if (usaProporzionale) {
        const baselineDays = Math.max(1, daysInMonth - 6)
        const rawTarget = (availableDays / baselineDays) * baseTarget
        let target = Math.round(rawTarget)
        if (target > baseTarget) target = baseTarget
        if (availableDays > 0 && target < 1) target = 1
        repTarget[agent.id] = target
      } else {
        repTarget[agent.id] = baseTarget
      }

      totalTargetGlobal += repTarget[agent.id]

      // Festivi target: 2 per agent (1 Sab + 1 Dom idealmente)
      fesTarget[agent.id] = festiviTarget
      ferTarget[agent.id] = repTarget[agent.id] - fesTarget[agent.id]
    }

    // === DAILY TARGETS ===
    const dayTarget: Record<number, number> = {}
    let basePerDay = Math.floor(totalTargetGlobal / daysInMonth)
    if (basePerDay < minGiorno) basePerDay = minGiorno
    if (basePerDay > maxGiorno) basePerDay = maxGiorno

    for (let d = 1; d <= daysInMonth; d++) {
      dayTarget[d] = basePerDay
    }

    // Distribute extra slots
    let extraNeeded = totalTargetGlobal - (basePerDay * daysInMonth)
    if (extraNeeded > 0) {
      for (let d = 1; d <= daysInMonth && extraNeeded > 0; d++) {
        if (dayTarget[d] < maxGiorno) {
          dayTarget[d]++
          extraNeeded--
        }
      }
    }

    // === INIT COUNTERS ===
    const repCount: Record<string, number> = {}
    const repFesCount: Record<string, number> = {}
    const repFerCount: Record<string, number> = {}
    const numSabati: Record<string, number> = {}
    const numDomeniche: Record<string, number> = {}
    const assignedDays: Record<string, number[]> = {}
    const dayAssigned: Record<number, number> = {}
    const uffAssigned: Record<number, number> = {}

    for (const agent of agents) {
      repCount[agent.id] = 0
      repFesCount[agent.id] = 0
      repFerCount[agent.id] = 0
      numSabati[agent.id] = 0
      numDomeniche[agent.id] = 0
      assignedDays[agent.id] = []
    }
    for (let d = 1; d <= daysInMonth; d++) {
      dayAssigned[d] = 0
      uffAssigned[d] = 0
    }

    // Result map
    const repResults: Record<string, Record<number, string>> = {}
    for (const agent of agents) repResults[agent.id] = {}

    // === PRE-LOAD FIXED REPS (From Excel / Manual) ===
    for (const s of existingShifts) {
      if (s.repType?.toUpperCase().includes("REP") && repCount[s.userId] !== undefined) {
        const day = new Date(s.date).getUTCDate()
        const agent = agents.find(a => a.id === s.userId)
        
        repResults[s.userId][day] = s.repType
        repCount[s.userId]++
        assignedDays[s.userId].push(day)
        dayAssigned[day]++
        
        if (agent?.isUfficiale) {
          uffAssigned[day]++
        }
        
        if (isSab[day]) numSabati[s.userId]++
        if (isDom[day]) numDomeniche[s.userId]++
        if (isFestivo[day]) repFesCount[s.userId]++
        else repFerCount[s.userId]++
      }
    }

    // === PHASE 0: ASSIGN 1 UFFICIALE PER DAY ===
    const ufficiali = agents.filter(a => a.isUfficiale)
    
    if (ufficiali.length > 0) {
      for (let day = 1; day <= daysInMonth; day++) {
        if (uffAssigned[day] >= 1) continue // Skip if an officer is already assigned (fixed or manual)
        
        const candidates: { agentId: string, score: number }[] = []

        for (const uff of ufficiali) {
          if (repCount[uff.id] >= repTarget[uff.id]) continue
          if (repResults[uff.id][day]) continue // Already has a shift this day
          if (isBlocked(uff.id, day)) continue
          if (day < daysInMonth && isBlocked(uff.id, day + 1)) continue

          // Spacing rule
          const tooClose = assignedDays[uff.id].some(d => Math.abs(day - d) <= 2)
          if (tooClose) continue

          // Strict weekend: skip if already did a Sat/Sun
          if (isSab[day] && numSabati[uff.id] >= 1) continue
          if (isDom[day] && numDomeniche[uff.id] >= 1) continue

          let score = (repCount[uff.id] / Math.max(1, repTarget[uff.id])) * 10000
          score += isFestivo[day] ? repFesCount[uff.id] * 1000 : repFerCount[uff.id] * 1000

          const baseShift = (baseShifts[uff.id]?.[day] || "").toUpperCase()
          if (baseShift.startsWith("M")) score -= 500
          if (baseShift.startsWith("P")) score += 300

          candidates.push({ agentId: uff.id, score })
        }

        candidates.sort((a, b) => a.score - b.score)

        if (candidates.length > 0) {
          const best = candidates[0]
          repResults[best.agentId][day] = "REP 22-07"
          repCount[best.agentId]++
          assignedDays[best.agentId].push(day)
          dayAssigned[day]++
          uffAssigned[day] = 1

          if (isFestivo[day]) repFesCount[best.agentId]++
          else repFerCount[best.agentId]++
          if (isSab[day]) numSabati[best.agentId]++
          if (isDom[day]) numDomeniche[best.agentId]++
        }
      }
    }

    // === PHASE 1: MAIN GENERATION PASS ===
    for (let day = 1; day <= daysInMonth; day++) {
      let assignToday = dayAssigned[day]
      const todayFes = isFestivo[day]

      const candidates: { agentId: string, score: number }[] = []

      for (const agent of agents) {
        if (repCount[agent.id] >= repTarget[agent.id]) continue
        if (repResults[agent.id][day]) continue // already assigned (e.g. ufficiale)

        if (isBlocked(agent.id, day)) continue
        if (day < daysInMonth && isBlocked(agent.id, day + 1)) continue

        // Spacing: at least 2 days gap
        const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= 2)
        if (tooClose) continue

        // Weekend: max 1 Sabato e 1 Domenica per agente
        let weekendPenalty = 0
        if (isSab[day] && numSabati[agent.id] >= 1) weekendPenalty = 1000000
        if (isDom[day] && numDomeniche[agent.id] >= 1) weekendPenalty = 1000000

        // Score (lower is better)
        let score = (repCount[agent.id] / Math.max(1, repTarget[agent.id])) * 10000
        score += todayFes ? repFesCount[agent.id] * 1000 : repFerCount[agent.id] * 1000
        score += weekendPenalty

        // Festivi balance: penalize if already at festivi target (2)
        if (todayFes) {
          if (repFesCount[agent.id] >= fesTarget[agent.id]) score += 5000
        } else {
          if (repFerCount[agent.id] >= ferTarget[agent.id]) score += 5000
        }

        // STRONG preference for morning shifts (M7, M8, etc.) for night REP
        const baseShift = (baseShifts[agent.id]?.[day] || "").toUpperCase()
        if (baseShift.startsWith("M")) score -= 500   // forte preferenza mattina
        if (baseShift.startsWith("P")) score += 300   // penalità pomeriggio

        candidates.push({ agentId: agent.id, score })
      }

      // Sort by score ascending
      candidates.sort((a, b) => a.score - b.score)

      // Assign up to dayTarget
      for (const cand of candidates) {
        if (assignToday >= dayTarget[day]) break
        // Skip high-penalty candidates if we already have minimum
        if (cand.score >= 1000000 && assignToday >= minGiorno) continue

        repResults[cand.agentId][day] = "REP 22-07"
        repCount[cand.agentId]++
        assignedDays[cand.agentId].push(day)
        dayAssigned[day]++
        assignToday++

        if (todayFes) repFesCount[cand.agentId]++
        else repFerCount[cand.agentId]++
        if (isSab[day]) numSabati[cand.agentId]++
        if (isDom[day]) numDomeniche[cand.agentId]++
      }
    }

    // === PHASE 2: FILL PASS (Relaxed spacing) ===
    for (let pass = 1; pass <= 2; pass++) {
      for (let day = 1; day <= daysInMonth; day++) {
        if (dayAssigned[day] >= minGiorno) continue

        for (const agent of agents) {
          if (dayAssigned[day] >= minGiorno) break
          if (repCount[agent.id] >= repTarget[agent.id]) continue
          if (repResults[agent.id][day]) continue
          if (isBlocked(agent.id, day)) continue
          if (day < daysInMonth && isBlocked(agent.id, day + 1)) continue

          // Relaxed spacing: reduce minimum gap each pass
          const minSpacing = Math.max(0, 2 - pass)
          const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= minSpacing)
          if (tooClose) continue

          repResults[agent.id][day] = "REP 22-07"
          repCount[agent.id]++
          assignedDays[agent.id].push(day)
          dayAssigned[day]++

          if (isFestivo[day]) repFesCount[agent.id]++
          else repFerCount[agent.id]++
          if (isSab[day]) numSabati[agent.id]++
          if (isDom[day]) numDomeniche[agent.id]++
        }
      }
    }

    // === SAVE TO DATABASE ===
    // 1. Clear old REP assignments for this month
    await prisma.shift.updateMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, month, 1)),
          lt: new Date(Date.UTC(year, month + 1, 1))
        }
      },
      data: { repType: null }
    })

    // 2. Insert new REP shifts with upsert into repType
    let totalAssigned = 0
    for (const agent of agents) {
      for (let day = 1; day <= daysInMonth; day++) {
        if (repResults[agent.id][day]) {
          await prisma.shift.upsert({
            where: {
              userId_date: {
                userId: agent.id,
                date: new Date(Date.UTC(year, month, day))
              }
            },
            update: { repType: repResults[agent.id][day] },
            create: {
              userId: agent.id,
              date: new Date(Date.UTC(year, month, day)),
              type: "", // No base shift if created from scratch
              repType: repResults[agent.id][day]
            }
          })
          totalAssigned++
        }
      }
    }

    // Build summary
    const summary = agents.map(a => ({
      name: a.name,
      total: repCount[a.id],
      target: repTarget[a.id],
      feriali: repFerCount[a.id],
      festivi: repFesCount[a.id]
    }))

    // Days without enough REP
    const emptyDays: number[] = []
    const warningDays: number[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      if (dayAssigned[d] === 0) emptyDays.push(d)
      else if (dayAssigned[d] < minGiorno) warningDays.push(d)
    }

    // Warning about missing officers
    const noOfficerDays: number[] = []
    if (ufficiali.length > 0) {
      for (let d = 1; d <= daysInMonth; d++) {
        if (uffAssigned[d] === 0) noOfficerDays.push(d)
      }
    }

    return NextResponse.json({
      success: true,
      totalAssigned,
      emptyDays,
      warningDays,
      noOfficerDays,
      summary
    })
  } catch (error) {
    console.error("[GENERATE ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
