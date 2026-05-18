import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getEaster } from "@/utils/holidays"

// Genera la lista completa di tutti i festivi infrasettimanali standard dell'anno (escluse domeniche)
function getStandardMidweekHolidays(year: number): Array<{ name: string; date: Date; isCustom?: boolean }> {
  const list: Array<{ name: string; m: number; d: number }> = [
    { name: "Capodanno", m: 1, d: 1 },
    { name: "Epifania", m: 1, d: 6 },
    { name: "Liberazione", m: 4, d: 25 },
    { name: "Festa del Lavoro", m: 5, d: 1 },
    { name: "Festa Patronale", m: 5, d: 5 },
    { name: "Festa della Repubblica", m: 6, d: 2 },
    { name: "Ferragosto", m: 8, d: 15 },
    { name: "Tutti i Santi", m: 11, d: 1 },
    { name: "Immacolata", m: 12, d: 8 },
    { name: "Natale", m: 12, d: 25 },
    { name: "Santo Stefano", m: 12, d: 26 }
  ]

  const holidays: Array<{ name: string; date: Date }> = []

  // Festivi Fissi
  for (const item of list) {
    const d = new Date(year, item.m - 1, item.d)
    if (d.getDay() !== 0) {
      holidays.push({ name: item.name, date: d })
    }
  }

  // Pasquetta
  const easter = getEaster(year)
  const easterMonday = new Date(easter.getTime())
  easterMonday.setDate(easter.getDate() + 1)
  if (easterMonday.getDay() !== 0) {
    holidays.push({ name: "Lunedì dell'Angelo (Pasquetta)", date: easterMonday })
  }

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export async function GET(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const yearStr = searchParams.get("year")
  if (!yearStr) return NextResponse.json({ error: "year obbligatorio" }, { status: 400 })
  const year = parseInt(yearStr)

  try {
    // 1. Carica i festivi standard
    const standardHolidays = getStandardMidweekHolidays(year)

    // 2. Carica i festivi personalizzati dal database
    const dbHolidays = await prisma.customHoliday.findMany({
      where: {
        tenantId: u.tenantId,
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59)
        }
      },
      include: {
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, matricola: true, qualifica: true }
            }
          }
        }
      }
    })

    // 3. Carica tutti i piani ferie approvati o assegnati per questo anno
    const vacationPlans = await prisma.vacationPlan.findMany({
      where: {
        tenantId: u.tenantId,
        status: { in: ["ASSIGNED", "CONFIRMED"] }
      }
    })

    // 4. Carica tutti i turni di ferie (Shift con tipo "FERIE") per l'anno
    const ferieShifts = await prisma.shift.findMany({
      where: {
        tenantId: u.tenantId,
        type: "FERIE",
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59)
        }
      }
    })

    // Combina i festivi standard e quelli personalizzati, rimuovendo i duplicati per data
    const combinedMap = new Map<string, any>()

    // Inserisci standard
    for (const sh of standardHolidays) {
      const dateKey = sh.date.toISOString().split("T")[0]
      combinedMap.set(dateKey, {
        id: `standard-${dateKey}`,
        name: sh.name,
        date: sh.date,
        isCustom: false,
        assignments: []
      })
    }

    // Sovrascrivi/Aggiungi personalizzati
    for (const dbh of dbHolidays) {
      const dateKey = dbh.date.toISOString().split("T")[0]
      combinedMap.set(dateKey, {
        id: dbh.id,
        name: dbh.name,
        date: dbh.date,
        isCustom: true,
        assignments: dbh.assignments.map((a: any) => a.user)
      })
    }

    const allHolidaysList = Array.from(combinedMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Per ciascun festivo, calcola quali operatori sono in ferie su quella data
    const holidaysWithAvailability = allHolidaysList.map(h => {
      const hDate = new Date(h.date)
      const hDateStr = hDate.toISOString().split("T")[0]

      // Controlla chi è in ferie tramite piano ferie o shift
      const usersInFerie = new Set<string>()

      // 1. Controlla da VacationPlan
      for (const plan of vacationPlans) {
        const start = new Date(plan.startDate)
        const end = new Date(plan.endDate)
        
        // Confronto date senza ore per sicurezza
        const startStr = start.toISOString().split("T")[0]
        const endStr = end.toISOString().split("T")[0]
        
        if (hDateStr >= startStr && hDateStr <= endStr) {
          usersInFerie.add(plan.userId)
        }
      }

      // 2. Controlla da turni Shift
      for (const fs of ferieShifts) {
        const fsStr = new Date(fs.date).toISOString().split("T")[0]
        if (fsStr === hDateStr) {
          usersInFerie.add(fs.userId)
        }
      }

      return {
        ...h,
        excludedUserIds: Array.from(usersInFerie)
      }
    })

    return NextResponse.json({ success: true, holidays: holidaysWithAvailability })
  } catch (error) {
    console.error("[CUSTOM_HOLIDAYS_GET]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  if (u.role !== "ADMIN" && !u.canManageShifts) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { id, name, date, userIds } = await request.json()
    if (!name || !date) return NextResponse.json({ error: "Nome e Data sono obbligatori" }, { status: 400 })

    const holidayDate = new Date(date)
    holidayDate.setUTCHours(12, 0, 0, 0) // per evitare shift fuso orario

    let holidayId = id

    if (id && !id.startsWith("standard-")) {
      // Aggiorna festivo personalizzato esistente
      await prisma.customHoliday.update({
        where: { id },
        data: { name, date: holidayDate }
      })
    } else {
      // Crea nuovo festivo personalizzato (o standard che viene promosso a personalizzato con assegnazioni)
      // Prima verifica se per quel giorno c'è già un festivo db
      const existing = await prisma.customHoliday.findFirst({
        where: {
          tenantId: u.tenantId,
          date: holidayDate
        }
      })

      if (existing) {
        holidayId = existing.id
        await prisma.customHoliday.update({
          where: { id: existing.id },
          data: { name }
        })
      } else {
        const created = await prisma.customHoliday.create({
          data: {
            tenantId: u.tenantId,
            name,
            date: holidayDate
          }
        })
        holidayId = created.id
      }
    }

    // Se forniti userIds, aggiorna le assegnazioni del personale
    if (userIds && Array.isArray(userIds)) {
      // 1. Rimuovi le vecchie assegnazioni
      await prisma.customHolidayAssignment.deleteMany({
        where: { holidayId }
      })

      // 2. Crea le nuove
      if (userIds.length > 0) {
        await prisma.customHolidayAssignment.createMany({
          data: userIds.map(uid => ({
            holidayId,
            userId: uid
          }))
        })

        // 3. Sincronizza i turni Shift reali di tipo "FESTIVO INFRASETTIMANALE"
        // Elimina i vecchi turni per questo festivo nel tenant
        await prisma.shift.deleteMany({
          where: {
            tenantId: u.tenantId,
            date: holidayDate,
            type: "FESTIVO INFRASETTIMANALE"
          }
        })

        // Crea i nuovi turni per gli operatori assegnati
        for (const uid of userIds) {
          await prisma.shift.create({
            data: {
              tenantId: u.tenantId,
              userId: uid,
              date: holidayDate,
              type: "FESTIVO INFRASETTIMANALE",
              durationHours: 6,
              serviceDetails: `Assegnazione diretta festivo infrasettimanale: ${name}`
            }
          })
        }
      }
    }

    return NextResponse.json({ success: true, holidayId })
  } catch (error) {
    console.error("[CUSTOM_HOLIDAYS_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  if (u.role !== "ADMIN" && !u.canManageShifts) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id obbligatorio" }, { status: 400 })

  try {
    if (id.startsWith("standard-")) {
      return NextResponse.json({ error: "I festivi nazionali standard non possono essere eliminati, solo modificati con personale." }, { status: 400 })
    }

    const holiday = await prisma.customHoliday.findUnique({
      where: { id }
    })

    if (!holiday) {
      return NextResponse.json({ error: "Festivo non trovato" }, { status: 404 })
    }

    // Rimuovi anche i turni Shift reali creati per questa festività
    await prisma.shift.deleteMany({
      where: {
        tenantId: u.tenantId,
        date: holiday.date,
        type: "FESTIVO INFRASETTIMANALE"
      }
    })

    await prisma.customHoliday.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CUSTOM_HOLIDAYS_DELETE]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
