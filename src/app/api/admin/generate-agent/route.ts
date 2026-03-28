import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

const BLOCK_CODES = ["F", "FERIE", "M", "MALATTIA", "104", "RR", "RP", "RPS", "CONGEDO",
  "ASS", "INFR", "CS", "PNR", "SD", "RF", "AM", "AP"]

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
    const baseTarget = isUff ? 6 : 5

    // Load this agent's current shifts to check blocks
    const agentShifts = await prisma.shift.findMany({
      where: {
        userId: agentId,
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) }
      }
    })

    // Build base shift map
    const baseShifts: Record<number, string> = {}
    for (const s of agentShifts) {
      const day = new Date(s.date).getUTCDate()
      baseShifts[day] = s.type
    }

    // 1. Clear this agent's old REP assignments for this month
    await prisma.shift.updateMany({
      where: {
        userId: agentId,
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) }
      },
      data: { repType: null }
    })

    // 2. Check how many REPs are already assigned each day (by OTHER agents)
    const allOtherReps = await prisma.shift.findMany({
      where: {
        repType: { not: null },
        userId: { not: agentId },
        date: { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) }
      }
    })
    const dayRepCount: Record<number, number> = {}
    for (let d = 1; d <= daysInMonth; d++) dayRepCount[d] = 0
    for (const s of allOtherReps) {
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

    // Calculate target respecting individual massimale
    const baseTargetLimit = agent.massimale || (isUff ? 6 : 5)
    
    let availableDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isBlocked(d)) availableDays++
    }
    const baselineDays = Math.max(1, daysInMonth - 6)
    let target = Math.round((availableDays / baselineDays) * baseTargetLimit)
    if (target > baseTargetLimit) target = baseTargetLimit
    if (availableDays > 0 && target < 1) target = 1

    // Assign REPs
    const assignedDays: number[] = []
    let repCount = 0, numDom = 0

    // Phase 1: strict spacing (at least 2 days gap)
    for (let day = 1; day <= daysInMonth; day++) {
      if (repCount >= target) break
      if (isBlocked(day)) continue
      if (day < daysInMonth && isBlocked(day + 1)) continue

      const isFestivo = isHoliday(new Date(year, month, day))
      if (isFestivo && numDom >= 2) continue 

      const tooClose = assignedDays.some(d => Math.abs(day - d) <= 2)
      if (tooClose) continue

      if (dayRepCount[day] >= 8) continue

      // Prefer morning shifts
      const shift = (baseShifts[day] || "").toUpperCase()
      if (shift.startsWith("P") && repCount < target - 1) {
        const hasMorningAhead = Array.from({ length: Math.min(5, daysInMonth - day) }, (_, i) => day + i + 1)
          .some(d => !isBlocked(d) && (baseShifts[d] || "").toUpperCase().startsWith("M") && !assignedDays.some(ad => Math.abs(d - ad) <= 2))
        if (hasMorningAhead) continue
      }

      assignedDays.push(day)
      repCount++
      dayRepCount[day]++
      if (isFestivo) numDom++
    }

    // Phase 2: relax spacing
    for (let pass = 1; pass <= 2 && repCount < target; pass++) {
      for (let day = 1; day <= daysInMonth && repCount < target; day++) {
        if (assignedDays.includes(day)) continue
        if (isBlocked(day)) continue
        if (day < daysInMonth && isBlocked(day + 1)) continue

        const minSpacing = Math.max(0, 2 - pass)
        const tooClose = assignedDays.some(d => Math.abs(day - d) <= minSpacing)
        if (tooClose) continue

        assignedDays.push(day)
        repCount++
        dayRepCount[day]++
      }
    }

    // Save assignments to DB (Optimized)
    const upsertPromises = assignedDays.map(day => 
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
