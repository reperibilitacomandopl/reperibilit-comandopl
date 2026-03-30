import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"
import { BLOCK_CODES } from "@/utils/constants"

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Recalculate REP only for a single agent
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const payload = await req.json()
    const { agentId, year: reqYear, month: reqMonth } = payload
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 })

    const settings = await prisma.globalSettings.findFirst()
    const year = reqYear ? parseInt(reqYear, 10) : (settings?.annoCorrente ?? 2026)
    const month = reqMonth ? parseInt(reqMonth, 10) - 1 : ((settings?.meseCorrente ?? 4) - 1)
    const daysInMonth = getDaysInMonth(month, year)

    const agent = await prisma.user.findUnique({ where: { id: agentId } })
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

    const isUff = agent.isUfficiale
    const baseTargetLimit = isUff ? (settings?.massimaleUfficiale ?? 6) : (settings?.massimaleAgente ?? 5)
    const minSpacingGlobal = settings?.distaccoMinimo ?? 2
    const allowConsecutive = settings?.permettiConsecutivi ?? false

    // Load this agent's current shifts to check blocks
    const agentShifts = await prisma.shift.findMany({
      where: {
        userId: agentId,
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) }
      }
    })

    // Build base shift map and count fixed REPs
    const baseShifts: Record<number, string> = {}
    const fixedReps: number[] = []
    for (const s of agentShifts) {
      const day = new Date(s.date).getUTCDate()
      baseShifts[day] = s.type
      // Keep "REP" (Imported) and "rep" (Manual) as fixed
      if (s.repType === "REP" || s.repType === "rep") {
        fixedReps.push(day)
      }
    }

    // 1. Clear this agent's old AUTO-GENERATED REP assignments for this month
    // Preserve "REP" and "rep"
    await prisma.shift.updateMany({
      where: {
        userId: agentId,
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) },
        NOT: {
          repType: { in: ["REP", "rep"] }
        }
      },
      data: { repType: null }
    })

    // 2. Check how many REPs are already assigned each day (by ALL agents, including fixed for this agent)
    const allReps = await prisma.shift.findMany({
      where: {
        repType: { not: null },
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) }
      }
    })
    const dayRepCount: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) dayRepCount[d] = 0
    for (const s of allReps) {
      const d = new Date(s.date).getUTCDate()
      dayRepCount[d] = (dayRepCount[d] || 0) + 1
    }

    function isBlocked(day: number): boolean {
      const shift = (baseShifts[day] || "").toUpperCase().replace(/[()]/g, "")
      if (!shift) return true
      if (shift.startsWith("F") || shift.startsWith("R")) return true
      for (const bc of BLOCK_CODES) {
        if (shift === bc) return true
      }
      return false
    }

    let availableDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isBlocked(d)) availableDays++
    }
    
    // Calculate target respecting individual settings
    const baselineDays = Math.max(1, daysInMonth - 6)
    let target = Math.round((availableDays / baselineDays) * baseTargetLimit)
    if (target > baseTargetLimit) target = baseTargetLimit
    // Officers: always full target if they have enough available days
    if (isUff && availableDays >= baseTargetLimit) target = baseTargetLimit
    if (availableDays > 0 && target < 1) target = 1

    // Important: Subtract fixed REPs already assigned
    let repCount = fixedReps.length
    const assignedDays: number[] = [...fixedReps]
    let numSab = 0
    let numDom = 0
    let numFes = 0
    
    // Count specific days in fixed reps
    for (const d of fixedReps) {
      const date = new Date(Date.UTC(year, month, d))
      const dow = date.getUTCDay()
      if (dow === 6) numSab++
      else if (dow === 0) numDom++
      else if (isHoliday(date)) numFes++
    }

    // Assign REPs (Phase 1: strict spacing)
    for (let day = 1; day <= daysInMonth; day++) {
      if (repCount >= target) break
      if (assignedDays.includes(day)) continue // Already has a fixed rep
      if (isBlocked(day)) continue
      if (day < daysInMonth && isBlocked(day + 1)) continue

      const date = new Date(Date.UTC(year, month, day))
      const dow = date.getUTCDay()
      const isSabato = dow === 6
      const isDomenica = dow === 0
      const isFestInfrasett = !isSabato && !isDomenica && isHoliday(date)

      // Strict weekend: max 1 Sabato e 1 Domenica
      if (isSabato && numSab >= 1) continue
      if (isDomenica && numDom >= 1) continue
      // Limit midweek holidays as well (max 1 ideally)
      if (isFestInfrasett && numFes >= 1) continue

      const tooClose = assignedDays.some(d => Math.abs(day - d) <= minSpacingGlobal)
      if (tooClose) continue

      if (dayRepCount[day] >= 10) continue

      // Prefer morning shifts
      const shift = (baseShifts[day] || "").toUpperCase()
      if (shift.startsWith("P") && repCount < target - 1) {
        const hasMorningAhead = Array.from({ length: Math.min(5, daysInMonth - day) }, (_, i) => day + i + 1)
          .some(d => !isBlocked(d) && (baseShifts[d] || "").toUpperCase().startsWith("M") && !assignedDays.some(ad => Math.abs(d - ad) <= minSpacingGlobal))
        if (hasMorningAhead) continue
      }

      assignedDays.push(day)
      repCount++
      dayRepCount[day]++
      if (isSabato) numSab++
      else if (isDomenica) numDom++
      else if (isFestInfrasett) numFes++
    }

    // Phase 2: relax spacing
    for (let pass = 1; pass <= 3 && repCount < target; pass++) {
      for (let day = 1; day <= daysInMonth && repCount < target; day++) {
        if (assignedDays.includes(day)) continue
        if (isBlocked(day)) continue
        if (day < daysInMonth && isBlocked(day + 1)) continue

        const date = new Date(Date.UTC(year, month, day))
        const dow = date.getUTCDay()
        const isSabato = dow === 6
        const isDomenica = dow === 0
        const isFestInfrasett = !isSabato && !isDomenica && isHoliday(date)

        // Phase 2: still avoid extra festive unless it's the last pass
        if (pass < 3) {
          if (isSabato && numSab >= 1) continue
          if (isDomenica && numDom >= 1) continue
          if (isFestInfrasett && numFes >= 1) continue
        }

        let minSpacing = Math.max(1, minSpacingGlobal - (pass - 1))
        if (pass === 3) minSpacing = 1
        if (minSpacing === 0 && !allowConsecutive) minSpacing = 1
        
        const tooClose = assignedDays.some(d => Math.abs(day - d) <= minSpacing)
        if (tooClose) continue

        if (dayRepCount[day] >= 10) continue

        assignedDays.push(day)
        repCount++
        dayRepCount[day]++
        if (isSabato) numSab++
        else if (isDomenica) numDom++
        else if (isFestInfrasett) numFes++
      }
    }

    // Save assignments to DB (only NEW ones)
    const newAssignments = assignedDays.filter(d => !fixedReps.includes(d))
    const upsertPromises = newAssignments.map(day => 
      prisma.shift.upsert({
        where: {
          userId_date: { userId: agentId, date: new Date(Date.UTC(year, month, day)) }
        },
        update: { repType: "REP 22-07" },
        create: { 
          userId: agentId, 
          date: new Date(Date.UTC(year, month, day)), 
          type: "", 
          repType: "REP 22-07" 
        }
      })
    )

    const chunkSize = 50
    for (let i = 0; i < upsertPromises.length; i += chunkSize) {
      await Promise.all(upsertPromises.slice(i, i + chunkSize))
    }

    return NextResponse.json({
      success: true,
      agentName: agent.name,
      assigned: repCount,
      target,
      days: assignedDays
    })
  } catch (error) {
    console.error("[RECALC ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
