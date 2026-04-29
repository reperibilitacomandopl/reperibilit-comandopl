import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

/**
 * CRON: Invio notifiche giornaliere di reperibilità
 * Da eseguire ogni mattina (es. ore 08:00)
 */
export async function GET(req: Request) {
  // Protezione base tramite header Vercel Cron (opzionale se configurato)
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return ...

  try {
    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    
    // 1. Trova tutti i turni di reperibilità di oggi
    const todayShifts = await prisma.shift.findMany({
      where: {
        date: today,
        OR: [
          { repType: { contains: 'REP', mode: 'insensitive' } },
          { repType: { in: ['RP', 'RS'] } },
          { type: { contains: 'REP', mode: 'insensitive' } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            telegramChatId: true,
            tenantId: true
          }
        }
      }
    })

    if (todayShifts.length === 0) {
      return NextResponse.json({ success: true, message: "Nessuna reperibilità oggi" })
    }

    const results = []

    for (const shift of todayShifts) {
      const user = shift.user
      const message = `🔔 <b>PROMEMORIA SERVIZIO</b>\n\nCiao ${user.name.split(' ')[0]}, ti ricordiamo che oggi sei in <b>REPERIBILITÀ</b>.\n\nTurno: ${shift.repType || shift.type}\n\nBuon servizio! 👮‍♂️`

      // 2. Invia notifica Telegram se disponibile
      let telegramSent = false
      if (user.telegramChatId) {
        telegramSent = await sendTelegramMessage(user.telegramChatId, message)
      }

      // 3. Registra la notifica nel database dell'app (per il NotificationManager)
      await (prisma as any).notification.create({
        data: {
          userId: user.id,
          tenantId: user.tenantId,
          title: "Promemoria Reperibilità",
          message: `Oggi sei in servizio di reperibilità (${shift.repType || shift.type}).`,
          type: "INFO"
        }
      })

      results.push({ userId: user.id, telegramSent })
    }

    return NextResponse.json({ 
      success: true, 
      processed: todayShifts.length,
      details: results 
    })

  } catch (error) {
    console.error("[CRON DAILY REMINDER ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
