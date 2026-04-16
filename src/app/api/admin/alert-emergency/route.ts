import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, sendTelegramVoice } from "@/lib/telegram";
import { sendPushNotification } from "@/lib/push-notifications";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, message, note, audio, lat, lng } = await req.json().catch(() => ({}));
    const tenantId = session.user.tenantId;
    const userId = session.user.id;

    // --- CASO 1: SOS AGENTE (Bottom-Up) ---
    if (type === "SOS") {
      // 1. Registra l'SOS nel database delle emergenze
      const alert = await prisma.emergencyAlert.create({
        data: {
          tenantId: tenantId || null,
          adminId: userId, // In questo caso è l'agente che lancia
          message: message || `🆘 SOS GPS lanciato da ${session.user.name}`,
          lat: lat || null,
          lng: lng || null,
          status: "PENDING",
        }
      });

      // 2. Calcola oggi locale (Altamura/Roma) per trovare i reperibili
      const now = new Date();
      const localDateStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }); // YYYY-MM-DD
      const localTodayUTC = new Date(localDateStr + "T00:00:00Z");

      // 3. Trova tutti i destinatari: ADMIN, OFFICER e REPERIBILI del giorno
      const [adminsAndOfficers, todayRepShifts] = await Promise.all([
        prisma.user.findMany({
          where: { 
            tenantId: tenantId || null, 
            OR: [{ role: "ADMIN" }, { role: "OFFICER" }]
          },
          select: { id: true, name: true, telegramChatId: true }
        }),
        prisma.shift.findMany({
          where: {
            tenantId: tenantId || null,
            date: localTodayUTC,
            repType: { not: null }
          },
          include: { user: { select: { id: true, name: true, telegramChatId: true } } }
        })
      ]);

      // Unifica i destinatari (evitando duplicati)
      const recipientMap = new Map<string, { id: string, name: string, telegramChatId: string | null }>();
      adminsAndOfficers.forEach(u => recipientMap.set(u.id, u));
      todayRepShifts.forEach(s => {
        if (s.user) recipientMap.set(s.user.id, s.user);
      });

      const alertRecipients = Array.from(recipientMap.values());

      // 3. Invia Push ai destinatari e crea Notifica nel DB
      const pushPayload = {
        title: "🚨 EMERGENZA SOS!",
        body: `L'agente ${session.user.name} ha lanciato un SOS.`,
        url: `/${session.user.tenantSlug}/admin/timbrature?alertId=${alert.id}`
      };

 
      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const telegramText = `🚨 <b>ALLERTA SOS GPS</b> 🚨\n\nOperatore: <b>${session.user.name}</b> (Matr. ${session.user.matricola || 'N/D'})\n\n📝 <b>NOTA:</b> ${note || "Nessuna nota fornita"}\n\n📍 <a href="${mapUrl}">Vedi Posizione su Mappe</a>`;
 
      // 4. Invio in parallelo di Push e Notifiche Hub
      const notificationPromises = alertRecipients.map(async (recipient) => {
        try {
          await sendPushNotification(recipient.id, pushPayload);
          await prisma.notification.create({
            data: {
              tenantId: tenantId || null,
              userId: recipient.id,
              title: pushPayload.title,
              message: note ? `Nota: ${note}` : pushPayload.body,
              type: "ALERT",
              link: pushPayload.url,
              metadata: JSON.stringify({ lat, lng, alertId: alert.id, note, audio })
            }
          });
        } catch (e) {
          console.error(`❌ Fallimento notifica push per ${recipient.name}:`, e);
        }
      });
 
      // 5. Gestione Telegram (Ottimizzata con file_id)
      const telegramPromises = [];
      let sharedFileId: string | null = null;
 
      // Troviamo i destinatari con Telegram attivo
      const telegramRecipients = alertRecipients.filter(r => r.telegramChatId);
      
      if (telegramRecipients.length > 0) {
        // Invia testo a tutti in parallelo
        telegramRecipients.forEach(r => {
          telegramPromises.push(sendTelegramMessage(r.telegramChatId!, telegramText));
        });
 
        // Gestione Audio (Invia al primo, ottieni file_id, invia agli altri)
        if (audio && telegramRecipients.length > 0) {
          const firstRecipient = telegramRecipients[0];
          const voiceRes = await sendTelegramVoice(firstRecipient.telegramChatId!, audio, `🎤 Vocale SOS - ${session.user.name}`);
          
          if (voiceRes && voiceRes.voice?.file_id && typeof voiceRes.voice.file_id === 'string') {
            sharedFileId = voiceRes.voice.file_id;
            // Invia agli altri usando il file_id
            for (let i = 1; i < telegramRecipients.length; i++) {
              if (sharedFileId) {
                telegramPromises.push(sendTelegramVoice(telegramRecipients[i].telegramChatId!, sharedFileId, `🎤 Vocale SOS - ${session.user.name}`));
              }
            }
          }
        }
      }
 
      // Attendi il completamento di tutto
      await Promise.allSettled([...notificationPromises, ...telegramPromises]);

      return NextResponse.json({ success: true, alertId: alert.id });
    }

    // --- CASO 2: ALLERTA COMANDO (Top-Down) ---
    const now = new Date();
    // Normalizzazione data a mezzanotte Locale (Europe/Rome) -> Mezzanotte UTC per match database
    const localDateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Rome' }).format(now); // YYYY-MM-DD
    const localTodayUTC = new Date(`${localDateStr}T00:00:00.000Z`);
    
    console.log(`🔍 [ALERT] Cerco reperibili per data: ${localTodayUTC.toISOString()}`);
    
    const tf = tenantId ? { tenantId } : {};

    // Check if Admin OR Officer on duty today
    const isOfficerOnDuty = await prisma.shift.findFirst({
      where: {
        ...tf,
        userId: userId,
        date: localTodayUTC,
        user: { isUfficiale: true },
        repType: { not: null }
      }
    });

    const isAdmin = session.user.role === "ADMIN";

    if (!isAdmin && !isOfficerOnDuty) {
      return NextResponse.json({ error: "Unauthorized. Solo l'Admin o l'Ufficiale di servizio possono inviare allerte." }, { status: 403 });
    }

    // 1. Trova i turni di Reperibilità per OGGI
    const todayShifts = await prisma.shift.findMany({
      where: {
        ...tf,
        date: localTodayUTC,
        repType: { not: null }
      },
      include: { user: true }
    });

    const repUsers = todayShifts; // Tutti i reperibili, non solo quelli con Telegram

    if (repUsers.length === 0) {
      return NextResponse.json({ error: "Nessun reperibile rintracciato per la data odierna!" }, { status: 400 });
    }

    // 2. Crea il log dell'emergenza
    const alert = await prisma.emergencyAlert.create({
      data: {
        tenantId: tenantId || null,
        adminId: userId,
        message: message || "🚨 URGENZA! Recarsi in comando entro 30 min.",
        status: "PENDING",
        recipients: {
          create: repUsers.map(s => ({ userId: s.userId, status: "SENT" }))
        }
      }
    });

    // 3. Invia messaggi (Push + Telegram) in parallelo
    const alertPromises = repUsers.map(async (shift) => {
      const { user } = shift;
      const pushPayload = {
        title: "🚨 ALLERTA URGENZA",
        body: "Il Comando ha richiesto la tua presenza immediata. Controlla Telegram per i dettagli.",
        url: `/${session.user.tenantSlug}/?view=agent`
      };

      try {
        // A. Notifica Push PWA
        await sendPushNotification(user.id, pushPayload);
        
        // B. Notifica Hub Interna
        await prisma.notification.create({
          data: {
            tenantId: tenantId || null,
            userId: user.id,
            title: pushPayload.title,
            message: "Allerta urgente dal comando. Recarsi in sede entro 30 minuti.",
            type: "ALERT",
            link: pushPayload.url
          }
        });

        // C. Telegram (solo se disponibile)
        if (user.telegramChatId) {
          const keyboard = {
            inline_keyboard: [[{ text: "👍 PRESO IN CARICO", callback_data: `ack_alert_${alert.id}` }]]
          };
          const text = `🚨 <b>ALLERTA URGENZA DAL COMANDO</b> 🚨\n\n${message || "Devi recarti in comando entro 30 minuti."}\n\nAgente <b>${user.name}</b>, sei in reperibilità oggi (${shift.repType}).\n\nClicca il pulsante qui sotto per confermare la presa visione.`;
          await sendTelegramMessage(user.telegramChatId, text, keyboard);
        }
        
        return true;
      } catch (err) {
        console.error(`❌ Errore notifica allerta per ${user.name}:`, err);
        return false;
      }
    });

    const results = await Promise.allSettled(alertPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return NextResponse.json({ success: true, alerted: successCount });
  } catch (err: any) {
    console.error("❌ Errore API Alert Emergency:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
