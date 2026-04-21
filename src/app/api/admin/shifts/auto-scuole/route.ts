import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { date } = await req.json()
    if (!date) return NextResponse.json({ error: "Data mancante" }, { status: 400 })

    const tenantId = session.user.tenantId
    const [y, m, d] = date.split("-").map(Number)
    const targetDate = new Date(Date.UTC(y, m - 1, d))
    const dayOfWeek = targetDate.getUTCDay()

    // 1. Fetch all schools with schedules for THIS day of the week
    const schools = await prisma.school.findMany({
      where: { tenantId },
      include: {
        schedules: {
          where: { dayOfWeek }
        }
      }
    })

    if (schools.length === 0) {
      return NextResponse.json({ error: "Nessuna scuola censita per questo giorno o in generale." }, { status: 400 })
    }

    // 2. Fetch all morning (M*) and afternoon (P*) shifts for this date, excluding Ufficiali
    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        date: {
          gte: new Date(targetDate),
          lte: new Date(new Date(targetDate).setUTCHours(23, 59, 59, 999))
        },
        user: {
          isUfficiale: false
        },
        AND: [
          {
            OR: [
              { type: { startsWith: "M" } },
              { type: { startsWith: "P" } }
            ]
          },
          {
            OR: [
              { serviceDetails: null },
              { serviceDetails: "" }
            ]
          }
        ]
      },
      orderBy: { user: { name: "asc" } }
    })

    if (shifts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Nessun turno disponibile o già assegnato." 
      })
    }

    // 3. Split shifts by type
    const morningShifts = shifts.filter(s => s.type.startsWith("M"))
    const afternoonShifts = shifts.filter(s => s.type.startsWith("P"))

    // 4. Assign individually
    let assignedCount = 0
    const updates = []

    // --- Assign Morning Schools ---
    for (let i = 0; i < Math.min(morningShifts.length, schools.length); i++) {
      const shift = morningShifts[i]
      const school = schools[i]
      const schedule = school.schedules[0] 

      if (schedule) {
        const note = `${schedule.entranceTime || "07:45-08:30"} ENTRATA / ${schedule.exitTime || "13:00-14:00"} USCITA ${school.name}`
        
        updates.push(prisma.shift.update({
          where: { id: shift.id },
          data: { serviceDetails: note }
        }))
        assignedCount++
      }
    }

    // --- Assign Afternoon Schools (Late Exit) ---
    // Filter schools that have an afternoon exit time
    const schoolsWithAfternoon = schools.filter(s => s.schedules[0]?.afternoonExitTime)
    
    for (let i = 0; i < Math.min(afternoonShifts.length, schoolsWithAfternoon.length); i++) {
      const shift = afternoonShifts[i]
      const school = schoolsWithAfternoon[i]
      const schedule = school.schedules[0]

      if (schedule?.afternoonExitTime) {
        const note = `${schedule.afternoonExitTime} USCITA ${school.name}`
        
        updates.push(prisma.shift.update({
          where: { id: shift.id },
          data: { serviceDetails: note }
        }))
        assignedCount++
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates)
    }

    return NextResponse.json({ 
      success: true, 
      assignedCount,
      message: `Assegnati ${assignedCount} servizi scolastici (Mattina e Pomeriggio).`
    })

  } catch (error) {
    console.error("[AUTO SCUOLE ERROR]", error)
    return NextResponse.json({ error: "Internar Error" }, { status: 500 })
  }
}
