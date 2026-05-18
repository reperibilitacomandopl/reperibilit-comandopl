const { PrismaClient } = require('@prisma/client');
const webpush = require('web-push');

const prisma = new PrismaClient();

// Load environment variables directly inside the container from process.env
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BHcypF0bbqvKjEiYndyFy3z1RYSJ9vtfj2edycAhkYwHFZHnG45_w9756lAqLOb_nE5R-5Thnm3WvsoK55CvYuI";
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "TKFUyiMV3OgDwaGsuW0cq7aafiUXkJM7p_wsKY0RiNU";
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:reperibilitacomandopl@gmail.com";

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
    console.log('NESSUNA SOTTOSCRIZIONE PUSH TROVATA.');
    return;
  }

  console.log(`Inviando notifica test a ${subscriptions.length} dispositivi registrati...`);

  const payload = {
    title: "👮‍♂️ Notifica Test Antigravity",
    body: "Ciao Mario! Questa è una notifica push di test in tempo reale dal server Oracle. La connessione è attiva e funzionante!",
    url: "/quick-clock",
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
      console.log(`✅ Notifica inviata con successo a endpoint: ${sub.endpoint.substring(0, 50)}...`);
    } catch (err) {
      console.error(`❌ Errore invio a endpoint: ${sub.endpoint.substring(0, 50)}...`, err.statusCode || err.message);
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
