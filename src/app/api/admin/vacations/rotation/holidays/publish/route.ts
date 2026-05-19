import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getEaster, isCalendarHoliday } from "@/utils/holidays"

// Genera la lista completa di tutti i festivi infrasettimanali dell'anno (escluse domeniche)
function getMidweekHolidays(year: number): Array<{ name: string; date: Date }> {
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
    if (d.getDay() !== 0) { // Se non è domenica, è un festivo infrasettimanale!
      holidays.push({ name: item.name, date: d })
    }
  }

  // Pasquetta (Pasqua è sempre domenica, quindi solo Pasquetta è infrasettimanale)
  const easter = getEaster(year)
  const easterMonday = new Date(easter.getTime())
  easterMonday.setDate(easter.getDate() + 1)
  if (easterMonday.getDay() !== 0) {
    holidays.push({ name: "Lunedì dell'Angelo (Pasquetta)", date: easterMonday })
  }

  // Ordina cronologicamente
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export async function POST(request: Request) {
  const session = await auth()
  const u = session?.user
  if (!u) return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
  if (u.role !== "ADMIN" && !u.canManageUsers) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { year } = await request.json()
    if (!year) return NextResponse.json({ error: "Anno obbligatorio" }, { status: 400 })

    // 1. Carica i gruppi di rotazione festivi infrasettimanali
    const groups = await prisma.holidayRotationGroup.findMany({
      where: { tenantId: u.tenantId },
      include: { members: true },
      orderBy: { orderIndex: "asc" }
    })

    if (groups.length === 0) {
      return NextResponse.json({ error: "Nessun gruppo rotazione festivi configurato" }, { status: 400 })
    }

    // 2. Recupera i festivi infrasettimanali dell'anno (standard + custom del tenant)
    const standardHolidays = getMidweekHolidays(year)
    const dbHolidays = await prisma.customHoliday.findMany({
      where: {
        tenantId: u.tenantId,
        date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59)
        }
      }
    })

    const combinedMap = new Map<string, { name: string; date: Date }>()
    for (const sh of standardHolidays) {
      const dateKey = sh.date.toISOString().split("T")[0]
      combinedMap.set(dateKey, sh)
    }
    for (const dbh of dbHolidays) {
      const dateKey = dbh.date.toISOString().split("T")[0]
      combinedMap.set(dateKey, { name: dbh.name, date: dbh.date })
    }

    const midweekHolidays = Array.from(combinedMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
    const results = []

    for (let i = 0; i < midweekHolidays.length; i++) {
      const holiday = midweekHolidays[i]

      // Formula Round-Robin: calcola il gruppo di turno
      // Spostamento basato sulla differenza degli anni (Y - baseYear) e orderIndex del gruppo
      const baseYear = groups[0].baseYear || 2026
      const yearsDiff = year - baseYear
      
      const assignedGroupIndex = (((i + yearsDiff) % groups.length) + groups.length) % groups.length
      const groupOnDuty = groups[assignedGroupIndex]

      const holidayStr = holiday.date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })

      for (const member of groupOnDuty.members) {
        // Upsert del Turno di Reperibilità/Servizio sul festivo
        await prisma.shift.upsert({
          where: {
            userId_date_tenantId: {
              userId: member.id,
              date: holiday.date,
              tenantId: u.tenantId
            }
          },
          update: {
            type: "FESTIVO INFRASETTIMANALE",
            durationHours: 6,
            serviceDetails: `Assegnato da rotazione festivi: ${holiday.name} (Gruppo: ${groupOnDuty.name})`
          },
          create: {
            tenantId: u.tenantId,
            userId: member.id,
            date: holiday.date,
            type: "FESTIVO INFRASETTIMANALE",
            durationHours: 6,
            serviceDetails: `Assegnato da rotazione festivi: ${holiday.name} (Gruppo: ${groupOnDuty.name})`
          }
        })

        // Invia Notifiche Mobile all'Agente
        try {
          const title = `🚨 Servizio Festivo: ${holiday.name}`
          const body = `Sarai in servizio/reperibilità il giorno festivo infrasettimanale del ${holidayStr} (${holiday.name}) in base alla rotazione del tuo gruppo.`

          // Push PWA
          try {
            const { sendPushNotification } = await import("@/lib/push-notifications")
            await sendPushNotification(member.id, { title, body, url: "/" })
          } catch {}

          // Telegram
          if (member.telegramChatId && member.telegramOptIn) {
            try {
              const { sendTelegramMessage } = await import("@/lib/telegram")
              await sendTelegramMessage(
                member.telegramChatId,
                `<b>${title.toUpperCase()}</b>\n\nCiao ${member.name.split(" ")[0]},\n${body} 👮‍♂️🇮🇹`
              )
            } catch {}
          }
        } catch (ne) {
          console.error("[HOLIDAY_NOTIFY_ERROR]", ne)
        }
      }

      results.push({
        holidayName: holiday.name,
        date: holidayStr,
        assignedGroup: groupOnDuty.name,
        memberCount: groupOnDuty.members.length
      })
    }

    return NextResponse.json({ success: true, published: results })
  } catch (error) {
    console.error("[HOLIDAY_PUBLISH_POST]", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
