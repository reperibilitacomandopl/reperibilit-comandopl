import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"
import { sendTelegramMessage } from "@/lib/telegram"

/**
 * CRON: Notifiche Smart Turno
 * Da eseguire ogni 5 minuti.
 * 
 * 1. 15 min PRIMA del turno → "Il tuo turno inizia tra 15 minuti"
 * 2. 15 min DOPO la fine del turno → "Hai dimenticato di timbrare l'uscita?"
 *    Se l'agente è ancora in servizio, le ore vanno a straordinario.
 */

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
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
            body: `Il servizio inizia alle ${timeStr}. Ricordati di timbrare l'entrata quando arrivi in sede.`,
            url: "/"
          })

          // Telegram
          if (shift.user?.telegramChatId && shift.user?.telegramOptIn) {
            await sendTelegramMessage(
              shift.user.telegramChatId,
              `⏰ <b>PROMEMORIA TURNO</b>\n\nCiao ${shift.user.name.split(' ')[0]}, il tuo servizio inizia alle <b>${timeStr}</b>.\n\nRicordati di timbrare l'entrata! 👮‍♂️`
            )
          }

          results.push({ userId, type: "PRE_SHIFT", action: `Notifica inviata: turno alle ${timeStr}` })
        }
      }

      // ═══════════════════════════════════════════════════
      // 2. NOTIFICA 15 MIN DOPO LA FINE DEL TURNO
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
