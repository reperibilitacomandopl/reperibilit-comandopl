import webpush from "web-push"
import { prisma } from "./prisma"

// Inizializzazione VAPID
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@caserma.it";

if (vapidPublic && vapidPrivate) {
  try {
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublic,
      vapidPrivate
    );
  } catch (err) {
    console.error("[PUSH-SERVICE] Errore inizializzazione VAPID:", err);
  }
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

    const pushPromises = subscriptions.map(async (sub: any) => {
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
      } catch (error) {
        const err = error as { statusCode?: number };
        // Se il token è scaduto o non più valido, lo rimuoviamo dal database
        if (err.statusCode === 410 || err.statusCode === 404) {
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
