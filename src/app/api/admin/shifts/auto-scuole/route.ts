import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let body;
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json({ error: "Corpo della richiesta non valido (JSON atteso)" }, { status: 400 })
    }

    const { date } = body
    console.log("[AUTO SCUOLE] Start. Date:", date)
    if (!date) return NextResponse.json({ error: "Data mancante" }, { status: 400 })

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "TenantId non trovato nella sessione" }, { status: 400 })

    // Robust parsing for YYYY-MM-DD or ISO string
    const datePart = typeof date === 'string' ? date.substring(0, 10) : ""
    const [y, m, d] = datePart.split("-").map(Number)
    
    if (isNaN(y) || isNaN(m) || isNaN(d)) {
       return NextResponse.json({ error: `Formato data non valido: ${date}. Atteso YYYY-MM-DD` }, { status: 400 })
    }

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

    if (schools.length === 0 || !schools.some((s: any) => s.schedules.length > 0)) {
       return NextResponse.json({ error: "Nessuna scuola con orario censito per questo giorno della settimana." }, { status: 400 })
    }

    const activeSchools = schools.filter((s: any) => s.schedules.length > 0)

    // 2. Fetch all candidate shifts
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
              { type: { startsWith: "P" } },
              { type: { contains: "MATTINA", mode: 'insensitive' } },
              { type: { contains: "POMERIGGIO", mode: 'insensitive' } }
            ]
          },
          {
            NOT: {
              OR: [
                { serviceDetails: { contains: "USCITA" } },
                { serviceDetails: { contains: "ENTRATA" } },
                { serviceDetails: { contains: "SCUOLA" } }
              ]
            }
          }
        ]
      },
      include: { 
        user: {
          select: {
            id: true,
            name: true,
            servizio: true,
            qualifica: true,
            gradoLivello: true
          }
        } 
      }
    })

    if (shifts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "Nessun agente disponibile (M o P) senza servizio già assegnato." 
      })
    }

    // 3. SORTING RULE: 
    // - Priority 1: Section "VIABILITÀ"
    // - Priority 2: Rank (gradoLivello) from lowest (e.g. 17) to highest (e.g. 1)
    // In our rankMap, higher level number (17) means lower rank (Agente).
    // So we sort by gradoLivello DESCENDING.
    const sortedShifts = [...shifts].sort((a, b) => {
      const isViabilitaA = a.user?.servizio?.toUpperCase().includes("VIABILIT") ? 0 : 1
      const isViabilitaB = b.user?.servizio?.toUpperCase().includes("VIABILIT") ? 0 : 1
      
      if (isViabilitaA !== isViabilitaB) return isViabilitaA - isViabilitaB
      
      const rankA = a.user?.gradoLivello || 99
      const rankB = b.user?.gradoLivello || 99
      
      // Grado "più piccolo" (Agente, level 17) al "più alto" (level 1)
      // Se gradoLivello è alto (17), è un grado piccolo.
      return rankB - rankA // Sort DESC (17, 16, 15...)
    })

    const morningShifts = sortedShifts.filter(s => s.type.toUpperCase().startsWith("M") || s.type.toUpperCase().includes("MATTINA"))
    const afternoonShifts = sortedShifts.filter(s => s.type.toUpperCase().startsWith("P") || s.type.toUpperCase().includes("POMERIGGIO"))

    // 4. Assign individually
    let assignedCount = 0
    const updates = []
    const assignedShiftIds = new Set<string>()

    // --- Assign Morning Schools ---
    for (let i = 0; i < Math.min(morningShifts.length, activeSchools.length); i++) {
      const shift = morningShifts[i]
      const school = activeSchools[i]
      const schedule = school.schedules[0] 

      if (schedule) {
        const newNote = `${schedule.entranceTime || "07:45-08:30"} ENTRATA / ${schedule.exitTime || "13:00-14:00"} USCITA ${school.name}`
        const finalNote = shift.serviceDetails ? `${shift.serviceDetails} + ${newNote}` : newNote
        
        assignedShiftIds.add(shift.id)
        updates.push(prisma.shift.update({
          where: { id: shift.id },
          data: { 
            serviceDetails: finalNote
            // NOTA: Non cambiamo serviceCategoryId per non spostare l'agente dalla postazione admin
          }
        }))
        assignedCount++
      }
    }

    // --- Assign Afternoon Schools (Late Exit) ---
    const schoolsWithAfternoon = activeSchools.filter((s: any) => s.schedules[0]?.afternoonExitTime)
    const availableAfternoon = afternoonShifts.filter(as => !assignedShiftIds.has(as.id))

    for (let i = 0; i < Math.min(availableAfternoon.length, schoolsWithAfternoon.length); i++) {
      const shift = availableAfternoon[i]
      const school = schoolsWithAfternoon[i]
      const schedule = school.schedules[0]

      if (schedule?.afternoonExitTime) {
        const newNote = `${schedule.afternoonExitTime} USCITA ${school.name}`
        const finalNote = shift.serviceDetails ? `${shift.serviceDetails} + ${newNote}` : newNote
        
        assignedShiftIds.add(shift.id)
        updates.push(prisma.shift.update({
          where: { id: shift.id },
          data: { 
            serviceDetails: finalNote
          }
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

  } catch (error: any) {
    console.error("[AUTO SCUOLE ERROR]", error)
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error.message || String(error)
    }, { status: 500 })
  }
}
