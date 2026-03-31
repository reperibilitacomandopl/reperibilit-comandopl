import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"
import { BLOCK_CODES } from "@/utils/constants"

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

    // === CONFIGURATION PARAMETERS (from DB settings) ===
    const repPerAgenteBase = settings?.massimaleAgente ?? 5
    const repPerUfficialeBase = settings?.massimaleUfficiale ?? 6
    const minSpacingGlobal = settings?.distaccoMinimo ?? 2
    const allowConsecutive = settings?.permettiConsecutivi ?? false
    const usaProporzionale = settings?.usaProporzionale ?? true
    const minUfficiali = settings?.minUfficiali ?? 1

    // === LOAD AGENTS ===
    const agents = await prisma.user.findMany({
      where: { role: "AGENTE" },
      orderBy: { name: "asc" }
    })

    if (agents.length === 0) {
      return NextResponse.json({ error: "Nessun agente trovato nel database" }, { status: 400 })
    }

    // === LOAD BASE SHIFTS (including 1st of next month for 'eve' rules) ===
    const existingShifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, month, 1)),
          lt: new Date(Date.UTC(year, month + 1, 2)) // Fetch til 1st of NEXT month
        }
      }
    })

    const baseShifts: Record<string, Record<string, string>> = {} // Use ISO string as key or day-month
    for (const agent of agents) baseShifts[agent.id] = {}
    
    for (const s of existingShifts) {
      const d = new Date(s.date)
      const key = `${d.getUTCDate()}-${d.getUTCMonth()}`
      if (baseShifts[s.userId]) {
        baseShifts[s.userId][key] = s.type
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
    // Can handle day > daysInMonth to check next month boundary
    function isBlocked(agentId: string, d: number): boolean {
      const checkDate = new Date(Date.UTC(year, month, d))
      const key = `${checkDate.getUTCDate()}-${checkDate.getUTCMonth()}`
      const shift = (baseShifts[agentId]?.[key] || "").toUpperCase().replace(/[()]/g, "")
      
      if (!shift) return false // If no data for next month yet, assume OK or handle as you wish. 
                               // But user says they load it, so it should be there.
      if (shift.startsWith("F") || shift.startsWith("R")) return true
      for (const bc of BLOCK_CODES) {
        if (shift === bc) return true
      }
      return false
    }

    function isVigilia(d: number): boolean {
      // Check if day d+1 is a holiday
      const nextDayDate = new Date(Date.UTC(year, month, d + 1))
      return isHoliday(nextDayDate)
    }

    // === CALCULATE TARGETS ===
    const repTarget: Record<string, number> = {}
    const fesTarget: Record<string, number> = {}
    const ferTarget: Record<string, number> = {}
    let totalTargetGlobal = 0

    for (const agent of agents) {
      const isUff = agent.isUfficiale
      const baseTarget = isUff ? repPerUfficialeBase : repPerAgenteBase

      let availableDays = 0
      for (let d = 1; d <= daysInMonth; d++) {
        if (!isBlocked(agent.id, d)) availableDays++
      }

      if (usaProporzionale) {
        const baselineDays = Math.max(1, daysInMonth - 6)
        const rawTarget = (availableDays / baselineDays) * baseTarget
        let target = Math.round(rawTarget)
        if (target > baseTarget) target = baseTarget
        // Officers: always full target if they have enough available days
        if (isUff && availableDays >= baseTarget) target = baseTarget
        if (availableDays > 0 && target < 1) target = 1
        repTarget[agent.id] = target
      } else {
        repTarget[agent.id] = baseTarget
      }

      totalTargetGlobal += repTarget[agent.id]
      fesTarget[agent.id] = 2 
      ferTarget[agent.id] = Math.max(0, repTarget[agent.id] - 2)
    }

    // === DAILY TARGETS ===
    const dayTarget: Record<number, number> = {}
    let basePerDay = Math.floor(totalTargetGlobal / daysInMonth)
    let minGiorno = basePerDay
    const maxGiorno = basePerDay + 1

    for (let d = 1; d <= daysInMonth; d++) dayTarget[d] = basePerDay

    let extraNeeded = totalTargetGlobal - (basePerDay * daysInMonth)
    if (extraNeeded > 0) {
      for (let d = 1; d <= daysInMonth && extraNeeded > 0; d++) {
        dayTarget[d]++
        extraNeeded--
      }
    }

    // === INIT COUNTERS ===
    const repCount: Record<string, number> = {}
    const repFesCount: Record<string, number> = {}
    const repFerCount: Record<string, number> = {}
    const numSabati: Record<string, number> = {}
    const numDomeniche: Record<string, number> = {}
    const assignedDays: Record<string, number[]> = {}
    const uffAssigned: Record<number, number> = {}
    const dayAssigned: Record<number, number> = {}
    const repResults: Record<string, Record<number, string>> = {}

    for (const a of agents) {
      repCount[a.id] = 0
      repFesCount[a.id] = 0
      repFerCount[a.id] = 0
      numSabati[a.id] = 0
      numDomeniche[a.id] = 0
      assignedDays[a.id] = []
      repResults[a.id] = {}
    }
    for (let d = 1; d <= daysInMonth; d++) {
      dayAssigned[d] = 0
      uffAssigned[d] = 0 // Track specifically how many officers per day
    }

    // === PHASE -1: IMPORTED REPs ===
    // (Existing shifts from Excel that are already marked as REP)
    for (const s of existingShifts) {
      if (s.repType) {
        const day = new Date(s.date).getUTCDate()
        repResults[s.userId][day] = s.repType
        repCount[s.userId]++
        assignedDays[s.userId].push(day)
        dayAssigned[day]++
        if (agents.find(a => a.id === s.userId)?.isUfficiale) uffAssigned[day]++
        
        const isVig = isVigilia(day)
        if (isFestivo[day] || isVig) repFesCount[s.userId]++
        else repFerCount[s.userId]++
      }
    }

    // === PHASE 0: UFFICIALI (Primary Pass) ===
    const ufficiali = agents.filter(a => a.isUfficiale)
    for (let day = 1; day <= daysInMonth; day++) {
      // First, try to satisfy minUfficiali (usually 1)
      if (uffAssigned[day] >= minUfficiali) continue
      
      const candidates: { agentId: string, score: number }[] = []
      for (const uff of ufficiali) {
        if (repCount[uff.id] >= repTarget[uff.id]) continue
        if (repResults[uff.id][day]) continue
        if (isBlocked(uff.id, day)) continue
        if (isBlocked(uff.id, day + 1)) continue 
        const tooClose = assignedDays[uff.id].some(d => Math.abs(day - d) <= minSpacingGlobal)
        if (tooClose) continue

        if (isSab[day] && numSabati[uff.id] >= 1) continue
        if (isDom[day] && numDomeniche[uff.id] >= 1) continue

        const isVig = isVigilia(day)
        let score = (repCount[uff.id] / Math.max(1, repTarget[uff.id])) * 10000
        if (isFestivo[day] || isVig) {
          if (repFesCount[uff.id] >= 2) score += 2000000 
          else if (repFesCount[uff.id] === 0) score -= 10000 
        }
        candidates.push({ agentId: uff.id, score })
      }
      candidates.sort((a, b) => a.score - b.score)
      if (candidates.length > 0) {
        const best = candidates[0]
        repResults[best.agentId][day] = "REP 22-07"
        repCount[best.agentId]++
        assignedDays[best.agentId].push(day)
        dayAssigned[day]++
        uffAssigned[day]++
        const isVig = isVigilia(day)
        if (isFestivo[day] || isVig) repFesCount[best.agentId]++
        else repFerCount[best.agentId]++
        if (isSab[day]) numSabati[best.agentId]++
        if (isDom[day]) numDomeniche[best.agentId]++
      }
    }

    // === PHASE 0.5: FESTIVE FIRST PASS ===
    // === PHASE 0.5: UNIVERSAL WEEKEND PASS ===
    // Aim for 1 Saturday AND 1 Sunday for EVERY agent (if mathematically possible)
    // We sort by Officers first to give them priority, then random shuffle for fairness
    const priorityAgents = [...agents].sort((a, b) => {
      if (a.isUfficiale && !b.isUfficiale) return -1
      if (!a.isUfficiale && b.isUfficiale) return 1
      return Math.random() - 0.5
    })

    const Saturdays = []
    const Sundays = []
    const MidweekHolidays = []
    for (let d = 1; d <= daysInMonth; d++) {
      if (isSab[d]) Saturdays.push(d)
      else if (isDom[d]) Sundays.push(d)
      else if (isHoliday(new Date(year, month, d))) MidweekHolidays.push(d)
    }

    // Pass 1: Try to give 1 Saturday to everyone
    for (const agent of priorityAgents) {
      if (repCount[agent.id] >= repTarget[agent.id] || numSabati[agent.id] >= 1) continue
      for (const day of Saturdays) {
        if (dayAssigned[day] >= dayTarget[day]) continue
        if (repResults[agent.id][day]) continue
        if (isBlocked(agent.id, day)) continue
        if (isBlocked(agent.id, day + 1)) continue 
        const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= minSpacingGlobal)
        if (tooClose) continue

        repResults[agent.id][day] = "REP 22-07"
        repCount[agent.id]++
        assignedDays[agent.id].push(day)
        dayAssigned[day]++
        if (agent.isUfficiale) uffAssigned[day]++
        repFesCount[agent.id]++
        numSabati[agent.id]++
        break // Got our Saturday!
      }
    }

    // Pass 2: Try to give 1 Sunday to everyone
    for (const agent of priorityAgents) {
      if (repCount[agent.id] >= repTarget[agent.id] || numDomeniche[agent.id] >= 1) continue
      for (const day of Sundays) {
        if (dayAssigned[day] >= dayTarget[day]) continue
        if (repResults[agent.id][day]) continue
        if (isBlocked(agent.id, day)) continue
        if (isBlocked(agent.id, day + 1)) continue 
        const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= minSpacingGlobal)
        if (tooClose) continue

        repResults[agent.id][day] = "REP 22-07"
        repCount[agent.id]++
        assignedDays[agent.id].push(day)
        dayAssigned[day]++
        if (agent.isUfficiale) uffAssigned[day]++
        repFesCount[agent.id]++
        numDomeniche[agent.id]++
        break // Got our Sunday!
      }
    }

    // Pass 3: Fill midweek holidays for those who still have 0 festive shifts total
    for (const agent of priorityAgents) {
      if (repFesCount[agent.id] >= 1 || repCount[agent.id] >= repTarget[agent.id]) continue
      for (const day of MidweekHolidays) {
        if (dayAssigned[day] >= dayTarget[day]) continue
        if (repResults[agent.id][day]) continue
        if (isBlocked(agent.id, day)) continue
        if (isBlocked(agent.id, day + 1)) continue 
        const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= minSpacingGlobal)
        if (tooClose) continue

        repResults[agent.id][day] = "REP 22-07"
        repCount[agent.id]++
        assignedDays[agent.id].push(day)
        dayAssigned[day]++
        if (agent.isUfficiale) uffAssigned[day]++
        repFesCount[agent.id]++
        break
      }
    }


    // === PHASE 1: MAIN ===
    for (let day = 1; day <= daysInMonth; day++) {
      let assignToday = dayAssigned[day]
      const candidates: { agentId: string, isUfficiale: boolean, score: number }[] = []
      for (const agent of agents) {
        if (repCount[agent.id] >= repTarget[agent.id]) continue
        if (repResults[agent.id][day]) continue 
        if (isBlocked(agent.id, day)) continue
        if (isBlocked(agent.id, day + 1)) continue // Eve of blocked day
        const isVig = isVigilia(day)
        const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= minSpacingGlobal)
        if (tooClose) continue

        let weekendPriority = 0
        if (isSab[day]) {
          if (numSabati[agent.id] >= 1) weekendPriority = 1000000
          else weekendPriority = -50000
        }
        if (isDom[day]) {
          if (numDomeniche[agent.id] >= 1) weekendPriority = 1000000
          else weekendPriority = -50000
        }

        let score = (repCount[agent.id] / Math.max(1, repTarget[agent.id])) * 10000
        score += weekendPriority
        if (isFestivo[day] || isVig) {
          if (repFesCount[agent.id] >= 2) score += 2000000
          else if (repFesCount[agent.id] === 0) score -= 20000
        }
        candidates.push({ agentId: agent.id, isUfficiale: agent.isUfficiale, score })
      }
      candidates.sort((a, b) => a.score - b.score)
      for (const cand of candidates) {
        if (assignToday >= dayTarget[day]) break
        if (cand.score >= 1000000 && assignToday >= minGiorno) continue
        
        // LIMIT: Max 2 officers per day
        if (cand.isUfficiale && uffAssigned[day] >= 2) continue

        repResults[cand.agentId][day] = "REP 22-07"
        repCount[cand.agentId]++
        assignedDays[cand.agentId].push(day)
        dayAssigned[day]++
        assignToday++
        const isVig = isVigilia(day)
        if (isFestivo[day] || isVig) repFesCount[cand.agentId]++
        else repFerCount[cand.agentId]++
        if (isSab[day]) numSabati[cand.agentId]++
        if (isDom[day]) numDomeniche[cand.agentId]++
        if (cand.isUfficiale) uffAssigned[day]++
      }
    }

    // === PHASE 2: FILL ===
    for (let pass = 1; pass <= 3; pass++) {
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDayTarget = dayTarget[day]
        if (dayAssigned[day] >= currentDayTarget) continue
        const isVig = isVigilia(day)
        const isFesOrVig = isFestivo[day] || isVig

        // Re-sort candidates within the filler to prioritize those furthest from target or Officers
        const fillerCandidates = [...agents].sort((a, b) => {
          // Officers first
          if (a.isUfficiale && !b.isUfficiale) return -1
          if (!a.isUfficiale && b.isUfficiale) return 1
          // Then by completion %
          const scoreA = repCount[a.id] / repTarget[a.id]
          const scoreB = repCount[b.id] / repTarget[b.id]
          return scoreA - scoreB
        })

        for (const agent of fillerCandidates) {
          if (dayAssigned[day] >= currentDayTarget) break
          if (repCount[agent.id] >= repTarget[agent.id]) continue
          if (repResults[agent.id][day]) continue
          if (isBlocked(agent.id, day)) continue
          if (isBlocked(agent.id, day + 1)) continue 
          
          if (agent.isUfficiale && uffAssigned[day] >= 2) continue // LIMIT: Max 2 officers

          if (pass < 3 && isFesOrVig && repFesCount[agent.id] >= 2) continue

          let minSpacing = Math.max(1, minSpacingGlobal - (pass - 1))
          if (pass === 3) minSpacing = 1 
          if (minSpacing === 0 && !allowConsecutive) minSpacing = 1
          
          const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) <= minSpacing)
          if (tooClose) continue

          repResults[agent.id][day] = "REP 22-07"
          repCount[agent.id]++
          assignedDays[agent.id].push(day)
          dayAssigned[day]++
          if (agent.isUfficiale) uffAssigned[day]++
          if (isFesOrVig) repFesCount[agent.id]++
          else repFerCount[agent.id]++
          if (isSab[day]) numSabati[agent.id]++
          if (isDom[day]) numDomeniche[agent.id]++
        }
      }
    }

    // === PHASE 3: GENERAL RESCUE (Recovery for everyone) ===
    for (const agent of agents) {
      if (repCount[agent.id] >= repTarget[agent.id]) continue

      for (let day = 1; day <= daysInMonth && repCount[agent.id] < repTarget[agent.id]; day++) {
        if (repResults[agent.id][day]) continue
        if (isBlocked(agent.id, day)) continue
        if (isBlocked(agent.id, day + 1)) continue // Expanded block check

        if (agent.isUfficiale && uffAssigned[day] >= 2) continue // LIMIT: Max 2 officers

        // Spacing: at least 1 day between shifts
        const tooClose = assignedDays[agent.id].some(d => Math.abs(day - d) < 2)
        if (tooClose) continue

        // Slots: allow exceeding dayTarget as a last resort
        if (dayAssigned[day] >= dayTarget[day] + 1) continue

        repResults[agent.id][day] = "REP 22-07"
        repCount[agent.id]++
        assignedDays[agent.id].push(day)
        dayAssigned[day]++
        if (agent.isUfficiale) uffAssigned[day]++
        const isVig = isVigilia(day)
        if (isFestivo[day] || isVig) repFesCount[agent.id]++
        else repFerCount[agent.id]++
      }
    }

    // === SAVE ===
    await prisma.shift.updateMany({
      where: {
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) }
      },
      data: { repType: null }
    })
    const upsertPromises: any[] = []
    let totalAssignedInSave = 0
    for (const agent of agents) {
      for (let day = 1; day <= daysInMonth; day++) {
        if (repResults[agent.id][day]) {
          totalAssignedInSave++
          upsertPromises.push(prisma.shift.upsert({
            where: { userId_date: { userId: agent.id, date: new Date(Date.UTC(year, month, day)) } },
            update: { repType: repResults[agent.id][day] },
            create: { userId: agent.id, date: new Date(Date.UTC(year, month, day)), type: "", repType: repResults[agent.id][day] }
          }))
        }
      }
    }
    const chunkSize = 50
    for (let i = 0; i < upsertPromises.length; i += chunkSize) await Promise.all(upsertPromises.slice(i, i + chunkSize))

    // Build summary & stats
    const summary = agents.map(a => ({ name: a.name, tot: repCount[a.id], fes: repFesCount[a.id] }))
    
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
      totalAssigned: totalAssignedInSave,
      emptyDays,
      warningDays,
      noOfficerDays,
      summary 
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 })
  }
}
