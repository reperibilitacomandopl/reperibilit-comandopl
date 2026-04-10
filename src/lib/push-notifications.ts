import webpush from "web-push"
import { prisma } from "./prisma"

// Inizializzazione VAPID
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@caserma.it",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

/**
 * Invia una notifica push a un utente specifico.
 * Cerca tutte le sottoscrizioni attive associate all'ID utente.
 */
export async function sendPushNotification(userId: string, payload: { title: string, body: string, url?: string }) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    })

    if (subscriptions.length === 0) {
      console.log(`[PUSH-SERVICE] Nessuna sottoscrizione trovata per l'utente ${userId}`)
      return
    }

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        return await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        )
      } catch (error: any) {
        // Se il token è scaduto o non più valido, lo rimuoviamo dal database
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.warn(`[PUSH-SERVICE] Token scaduto per l'utente ${userId}, rimozione...`)
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } })
        } else {
          console.error(`[PUSH-SERVICE] Errore invio a sottoscrizione ${sub.id}:`, error)
        }
      }
    })

    await Promise.all(pushPromises)
  } catch (error) {
    console.error("[PUSH-SERVICE] Fallimento globale invio notifiche:", error)
  }
}
