import { PrismaClient } from '@prisma/client'
import webpush from 'web-push'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// Inizializzazione VAPID (prendi dai tuoi env)
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim();
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@caserma.it";

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

async function run() {
  const agent = await prisma.user.findFirst({
    where: { name: { contains: 'dibenedetto', mode: 'insensitive' } }
  });

  if (!agent) {
    console.log('Agente DIBENEDETTO non trovato');
    return;
  }

  console.log(`Trovato agente: ${agent.name} (ID: ${agent.id})`);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: agent.id }
  });

  if (subscriptions.length === 0) {
    console.log('NESSUNA SOTTOSCRIZIONE PUSH TROVATA PER QUESTO UTENTE.');
    console.log('Assicurati di aver accettato le notifiche sul telefono/browser con questo account.');
    return;
  }

  console.log(`Inviando notifica a ${subscriptions.length} dispositivi...`);

  const payload = {
    title: "🔔 Servizio in Inizio",
    body: "Ciao Mario, il tuo turno ODS sta per iniziare. Ricordati di timbrare l'entrata!",
    url: "/dashboard",
    type: "ALERT"
  };

  for (const sub of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload),
        {
          headers: {
            'Urgency': 'high',
            'apns-priority': '10',
            'apns-push-type': 'alert'
          },
          TTL: 86400
        }
      );
      console.log(`✅ Notifica inviata con successo a endpoint: ${sub.endpoint.substring(0, 30)}...`);
    } catch (err: any) {
      console.error(`❌ Errore invio a endpoint: ${sub.endpoint.substring(0, 30)}...`, err.statusCode);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
