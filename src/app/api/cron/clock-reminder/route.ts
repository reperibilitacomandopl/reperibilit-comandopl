import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // 1. Trova tutti gli utenti che sono attualmente in servizio (ultimo record è IN)
    // Query ottimizzata: prendiamo l'ultimo record per ogni utente
    const activeRecords = await prisma.$queryRaw`
      SELECT DISTINCT ON ("userId") *
      FROM "ClockRecord"
      ORDER BY "userId", "timestamp" DESC
    ` as any[]

    const usersInService = activeRecords.filter(r => r.type === 'IN')
    console.log(`[CRON-REMINDER] Utenti in servizio: ${usersInService.length}`)

    if (usersInService.length === 0) {
      return NextResponse.json({ success: true, message: "Nessun utente in servizio." })
    }

    let notificationsSent = 0

    for (const record of usersInService) {
      const { userId, tenantId } = record

      // 2. Trova il turno di oggi per questo utente
      const todayShift = await prisma.shift.findFirst({
        where: {
          userId,
          date: {
            gte: new Date(todayStr),
            lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000)
          }
        }
      })

      console.log(`[CRON-REMINDER] Utente ${userId}: Turno trovato: ${todayShift?.timeRange || 'NO'}`)

      if (!todayShift?.timeRange) continue

      try {
        const timeRange = todayShift.timeRange as string
        const parts = timeRange.split(/[-–]/).map(p => p.trim())
        if (parts.length < 2) continue

        const endTimeStr = parts[1]
        const [eh, em] = endTimeStr.split(':').map(Number)
        
        const plannedEnd = new Date(now)
        plannedEnd.setHours(eh, em, 0, 0)

        // Gestione scavalco mezzanotte
        const startTimeStr = parts[0]
        const [sh] = startTimeStr.split(':').map(Number)
        if (eh < sh && now.getHours() > sh) {
           plannedEnd.setDate(plannedEnd.getDate() + 1)
        } else if (eh < sh && now.getHours() <= eh) {
           // Siamo già nel giorno dopo, plannedEnd è corretto
        }

        const diffMins = (now.getTime() - plannedEnd.getTime()) / (60 * 1000)
        console.log(`[CRON-REMINDER] Utente ${userId}: Fine prevista: ${endTimeStr}, Diff minuti: ${diffMins.toFixed(1)}`)

        // 3. Se il turno è finito da più di 5 minuti, manda la notifica push
        if (diffMins >= 5 && diffMins <= 120) { 
          
          // Evitiamo di mandare troppe notifiche (es. una ogni 15 minuti)
          const lastNotif = await prisma.notification.findFirst({
            where: {
              userId,
              type: "REMINDER_EXIT",
              createdAt: {
                gte: new Date(now.getTime() - 30 * 60 * 1000) // Negli ultimi 30 minuti
              }
            }
          })

          if (!lastNotif) {
            await sendPushNotification(userId, {
              title: "👮‍♂️ Fine Turno Rilevata",
              body: `Il tuo turno è terminato alle ${endTimeStr}. Ricordati di timbrare l'uscita!`,
              url: "/agent/dashboard"
            })

            // Registriamo la notifica nel DB per il check sopra
            await prisma.notification.create({
              data: {
                userId,
                tenantId,
                title: "Promemoria Uscita",
                message: `Turno terminato alle ${endTimeStr}.`,
                type: "REMINDER_EXIT"
              }
            })

            notificationsSent++
          }
        }
      } catch (e) {
        console.error(`Errore nel calcolo fine turno per utente ${userId}:`, e)
      }
    }

    return NextResponse.json({ 
      success: true, 
      notificationsSent 
    })
  } catch (error) {
    console.error("[CRON] Errore Promemoria Uscita:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
