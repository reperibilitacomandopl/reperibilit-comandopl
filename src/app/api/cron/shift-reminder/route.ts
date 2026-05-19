import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"
import { sendTelegramMessage } from "@/lib/telegram"

/**
 * CRON: Notifiche Smart Turno
 * Da eseguire ogni 5 minuti.
 * 
 * 1. 15 min PRIMA del turno → "Il tuo turno inizia tra 15 minuti"
 * 2. 15 min DOPO l'inizio del turno → "Sei in Comando ma non hai timbrato!" (solo se GPS vicino)
 * 3. 15 min DOPO la fine del turno → "Hai dimenticato di timbrare l'uscita?"
 */

// Calcolo distanza tra due punti in metri (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function parseTimeRange(timeRange: string | null, shiftType: string): { startH: number, startM: number, endH: number, endM: number } | null {
  if (timeRange) {
    // Formato: "08:00 - 14:00" oppure "08:00-14:00"
    const match = timeRange.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
    if (match) {
      return {
        startH: parseInt(match[1], 10),
        startM: parseInt(match[2], 10),
        endH: parseInt(match[3], 10),
        endM: parseInt(match[4], 10)
      }
    }
  }

  // Fallback dal codice turno
  const type = (shiftType || "").toUpperCase().replace(/\s/g, "")
  if (type.startsWith("M")) {
    const h = parseInt(type.replace("M", ""), 10) || 8
    return { startH: h, startM: 0, endH: h + 6, endM: 0 }
  }
  if (type.startsWith("P")) {
    const h = parseInt(type.replace("P", ""), 10) || 14
    return { startH: h, startM: 0, endH: h + 6, endM: 0 }
  }
  if (type.startsWith("N")) {
    const h = parseInt(type.replace("N", ""), 10) || 20
    return { startH: h, startM: 0, endH: (h + 8) % 24, endM: 0 }
  }

  return null
}

export async function GET(req: Request) {
  // Protezione CRON: Solo invocazioni autorizzate con CRON_SECRET
  const authHeader = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const currentH = now.getHours()
    const currentM = now.getMinutes()
    const currentTotalMinutes = currentH * 60 + currentM

    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Trova tutti i turni di oggi con i dati utente
    const todayShifts = await prisma.shift.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        type: { notIn: ["", "RP", "MALATTIA", "FERIE", "CONGEDO", "ASPETTATIVA"] }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            telegramChatId: true,
            telegramOptIn: true,
            tenantId: true
          }
        }
      }
    })

    const results: { userId: string, type: string, action: string }[] = []

    for (const shift of todayShifts) {
      const times = parseTimeRange(shift.timeRange, shift.type)
      if (!times) continue

      const shiftStartMinutes = times.startH * 60 + times.startM
      const shiftEndMinutes = times.endH * 60 + times.endM
      const userId = shift.userId

      // ═══════════════════════════════════════════════════
      // 1. NOTIFICA 15 MIN PRIMA DELL'INIZIO TURNO
      // ═══════════════════════════════════════════════════
      const minutesBeforeStart = shiftStartMinutes - currentTotalMinutes
      if (minutesBeforeStart >= 10 && minutesBeforeStart <= 20) {
        // Controlla se non abbiamo già notificato (via un semplice check: l'agente non ha timbrato IN)
        const existingClockIn = await prisma.clockRecord.findFirst({
          where: {
            userId,
            type: "IN",
            timestamp: { gte: today, lt: tomorrow }
          }
        })

        if (!existingClockIn) {
          const timeStr = `${String(times.startH).padStart(2, '0')}:${String(times.startM).padStart(2, '0')}`
          
          // Push Notification
          await sendPushNotification(userId, {
            title: "⏰ Il tuo turno inizia tra poco!",
            body: `Il servizio inizia alle ${timeStr}. Tocca qui per timbrare l'entrata istantaneamente.`,
            url: "/quick-clock?type=IN"
          })

          // Telegram
          if (shift.user?.telegramChatId && shift.user?.telegramOptIn) {
            const baseUrl = process.env.NEXTAUTH_URL || "https://caserma.it"
            const quickLink = `${baseUrl}/quick-clock?type=IN`
            
            await sendTelegramMessage(
              shift.user.telegramChatId,
              `⏰ <b>PROMEMORIA TURNO</b>\n\nCiao ${shift.user.name.split(' ')[0]}, il tuo servizio inizia alle <b>${timeStr}</b>.\n\n👉 <a href="${quickLink}">CLICCA QUI PER TIMBRARE L'ENTRATA</a> 👮‍♂️`
            )
          }

          results.push({ userId, type: "PRE_SHIFT", action: `Notifica inviata: turno alle ${timeStr}` })
        }
      }

      // ═══════════════════════════════════════════════════
      // 2. NOTIFICA DOPO L'INIZIO DEL TURNO (Smart Reminder)
      //    Nei primi 15 min: invio ogni 5 minuti.
      //    Successivamente: invio ogni 15 minuti.
      //    Se non ha timbrato l'entrata → controlla GPS e suggerisci
      // ═══════════════════════════════════════════════════
      const minutesAfterStart = currentTotalMinutes - shiftStartMinutes
      const shouldNotify = (
        (minutesAfterStart >= 0 && minutesAfterStart <= 15 && minutesAfterStart % 5 === 0) ||
        (minutesAfterStart > 15 && minutesAfterStart <= 180 && minutesAfterStart % 15 === 0)
      )

      if (shouldNotify) {
        const existingClockIn = await prisma.clockRecord.findFirst({
          where: {
            userId,
            type: "IN",
            timestamp: { gte: today, lt: tomorrow }
          }
        })

        if (!existingClockIn) {
          const startTimeStr = `${String(times.startH).padStart(2, '0')}:${String(times.startM).padStart(2, '0')}`
          
          // Controlla la posizione GPS dell'agente e le coordinate del Comando
          const agentGps = await prisma.user.findUnique({
            where: { id: userId },
            select: { lastLat: true, lastLng: true, lastSeenAt: true, tenantId: true }
          })

          let isNearCommand = false
          let arrivalTimeStr = ""

          if (agentGps?.tenantId && agentGps.lastLat && agentGps.lastLng && agentGps.lastSeenAt) {
            const tenant = await prisma.tenant.findUnique({
              where: { id: agentGps.tenantId },
              select: { lat: true, lng: true, clockInRadius: true }
            })

            if (tenant?.lat && tenant?.lng) {
              const dist = getDistance(agentGps.lastLat, agentGps.lastLng, tenant.lat, tenant.lng)
              const allowedRadius = tenant.clockInRadius || 500

              // Se il GPS è recente (ultimo 30 min) e l'agente è dentro il raggio del Comando
              const gpsAgeMinutes = (now.getTime() - agentGps.lastSeenAt.getTime()) / 60000
              if (dist <= allowedRadius && gpsAgeMinutes <= 30) {
                isNearCommand = true
                arrivalTimeStr = agentGps.lastSeenAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
              }
            }
          }

          if (isNearCommand) {
            // L'agente È vicino al Comando ma non ha timbrato!
            await sendPushNotification(userId, {
              title: "📍 Sei in Comando ma non hai timbrato!",
              body: `Rilevato arrivo alle ${arrivalTimeStr}. Il turno è iniziato alle ${startTimeStr}. Tocca qui per timbrare adesso.`,
              url: "/quick-clock?type=IN"
            })

            if (shift.user?.telegramChatId && shift.user?.telegramOptIn) {
              const baseUrl = process.env.NEXTAUTH_URL || "https://caserma.it"
              await sendTelegramMessage(
                shift.user.telegramChatId,
                `📍 <b>HAI DIMENTICATO DI TIMBRARE!</b>\n\nCiao ${shift.user.name.split(' ')[0]}, il GPS ti ha rilevato in Comando alle <b>${arrivalTimeStr}</b>, ma non hai timbrato l'entrata.\n\nIl turno è iniziato alle <b>${startTimeStr}</b>.\n\n👉 <a href="${baseUrl}/quick-clock?type=IN">TIMBRA ADESSO</a>`
              )
            }

            results.push({ userId, type: "MISSED_CLOCKIN_GPS", action: `GPS vicino al Comando (arrivo ~${arrivalTimeStr}), turno ${startTimeStr}, entrata non timbrata` })
          }
          // Se non è vicino al Comando, non inviare nulla (come richiesto dall'utente)
        }
      }

      // ═══════════════════════════════════════════════════
      // 3. NOTIFICA 15 MIN DOPO LA FINE DEL TURNO
      //    Se non ha timbrato l'uscita → chiedi se è ancora in servizio
      // ═══════════════════════════════════════════════════
      const minutesAfterEnd = currentTotalMinutes - shiftEndMinutes
      if (minutesAfterEnd >= 10 && minutesAfterEnd <= 20) {
        // Controlla se l'agente ha timbrato l'uscita
        const existingClockOut = await prisma.clockRecord.findFirst({
          where: {
            userId,
            type: "OUT",
            timestamp: { gte: today, lt: tomorrow }
          }
        })

        if (!existingClockOut) {
          const endTimeStr = `${String(times.endH).padStart(2, '0')}:${String(times.endM).padStart(2, '0')}`
          
          // Controlla se ha timbrato l'entrata (è effettivamente al lavoro)
          const clockedIn = await prisma.clockRecord.findFirst({
            where: {
              userId,
              type: "IN",
              timestamp: { gte: today, lt: tomorrow }
            }
          })

          if (clockedIn) {
            // L'agente ha timbrato l'entrata ma non l'uscita
            await sendPushNotification(userId, {
              title: "🔔 Turno terminato - Hai dimenticato di timbrare?",
              body: `Il tuo turno doveva terminare alle ${endTimeStr}. Se sei ancora in servizio, le ore extra saranno contabilizzate come straordinario. Apri l'app per timbrare l'uscita.`,
              url: "/?action=clockin"
            })

            if (shift.user?.telegramChatId && shift.user?.telegramOptIn) {
              await sendTelegramMessage(
                shift.user.telegramChatId,
                `🔔 <b>PROMEMORIA USCITA</b>\n\nCiao ${shift.user.name.split(' ')[0]}, il tuo turno doveva terminare alle <b>${endTimeStr}</b>.\n\nSe sei ancora in servizio, le ore extra saranno registrate come <b>straordinario</b>.\n\nSe hai dimenticato, apri l'app e timbra l'uscita. 📱`
              )
            }

            results.push({ userId, type: "POST_SHIFT_NO_CLOCKOUT", action: `Promemoria uscita inviato: turno finito alle ${endTimeStr}` })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processed: todayShifts.length,
      notifications: results.length,
      details: results
    })

  } catch (error) {
    console.error("[CRON SHIFT-REMINDER ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
