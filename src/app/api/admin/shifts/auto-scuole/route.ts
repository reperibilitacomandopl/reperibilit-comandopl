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

    // 2. Fetch all morning shifts (M*) for this date that don't have details yet
    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        date: {
          gte: new Date(targetDate),
          lte: new Date(new Date(targetDate).setUTCHours(23, 59, 59, 999))
        },
        type: { startsWith: "M" },
        OR: [
          { serviceDetails: null },
          { serviceDetails: "" }
        ]
      },
      orderBy: { user: { name: "asc" } }
    })

    if (shifts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Nessun turno di mattina disponibile o già assegnato." 
      })
    }

    // 3. Assign individually
    let assignedCount = 0
    const updates = []

    for (let i = 0; i < Math.min(shifts.length, schools.length); i++) {
      const shift = shifts[i]
      const school = schools[i]
      const schedule = school.schedules[0] // Only one per dayOfWeek

      if (schedule) {
        const note = `${schedule.entranceTime || "07:45-08:30"} ENTRATA SCUOLA ${school.name} / ${schedule.exitTime || "13:00-14:00"} USCITA SCUOLA ${school.name}`
        
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
      message: `Assegnate ${assignedCount} scuole agli agenti in turno di mattina.`
    })

  } catch (error) {
    console.error("[AUTO SCUOLE ERROR]", error)
    return NextResponse.json({ error: "Internar Error" }, { status: 500 })
  }
}
