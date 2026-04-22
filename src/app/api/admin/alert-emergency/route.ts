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

    const { type, message, note, audio, lat, lng, userId: targetUserIdFromRequest } = await req.json().catch(() => ({}));
    const tenantId = session.user.tenantId;
    const userId = session.user.id;

    // --- CASO 1: SOS AGENTE (Bottom-Up) O RISPOSTA CENTRALE (Top-Down Targeted) ---
    if (type === "SOS") {
      const isResponseFromAdmin = !!targetUserIdFromRequest && targetUserIdFromRequest !== session.user.id;
      const targetUserId = isResponseFromAdmin ? targetUserIdFromRequest : session.user.id;

      // 1. Registra l'SOS nel database se è un nuovo allarme (non una risposta)
      let alertId = null;
      if (!isResponseFromAdmin) {
        const alert = await prisma.emergencyAlert.create({
          data: {
            tenantId: tenantId || null,
            adminId: targetUserId,
            message: message || `🆘 SOS GPS lanciato da ${session.user.name}`,
            lat: lat || null,
            lng: lng || null,
            status: "PENDING",
          }
        });
        alertId = alert.id;
      }

      // 2. Determina destinatari
      let alertRecipients = [];
      if (isResponseFromAdmin) {
        // Messaggio da Admin a specifico Agente
        const agent = await prisma.user.findUnique({
          where: { id: targetUserId },
          select: { id: true, name: true, telegramChatId: true }
        });
        if (agent) alertRecipients = [agent];
      } else {
        // SOS da Agente a Centrale (Admin/Officers/Reperibili)
        const [adminsAndOfficers, todayRepShifts] = await Promise.all([
          prisma.user.findMany({
            where: { 
              tenantId: tenantId || null, 
              OR: [
                { role: "ADMIN" }, 
                { isUfficiale: true }
              ]
            },
            select: { id: true, name: true, telegramChatId: true }
          }),
          prisma.shift.findMany({
            where: {
              tenantId: tenantId || null,
              date: new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }) + "T00:00:00Z"),
              repType: { not: null }
            },
            include: { user: { select: { id: true, name: true, telegramChatId: true } } }
          })
        ]);

        const recipientMap = new Map();
        adminsAndOfficers.forEach(u => recipientMap.set(u.id, u));
        todayRepShifts.forEach(s => { 
          if (s.user) recipientMap.set(s.user.id, s.user); 
        });
        alertRecipients = Array.from(recipientMap.values());
        
        console.log(`[SOS] Notifica a ${alertRecipients.length} destinatari per tenant ${tenantId}`);
      }

      // 3. Invia Push e Notifica
      const pushPayload = {
        title: isResponseFromAdmin ? "🎧 MESSAGGIO DALLA CENTRALE" : "🚨 EMERGENZA SOS!",
        body: isResponseFromAdmin ? `La Centrale ha inviato un messaggio.` : `L'agente ${session.user.name} ha lanciato un SOS.`,
        url: isResponseFromAdmin ? `/${session.user.tenantSlug}/?view=agent` : `/${session.user.tenantSlug}/admin/sala-operativa`
      };

      const mapUrl = (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}` : null;
      let telegramText = isResponseFromAdmin 
        ? `🎧 <b>MESSAGGIO DALLA CENTRALE</b>\n\n${message}`
        : `🚨 <b>ALLERTA SOS GPS</b> 🚨\n\nOperatore: <b>${session.user.name}</b> (Matr. ${session.user.matricola || 'N/D'})\n\n📍 <a href="${mapUrl}">Vedi Posizione su Mappe</a>`;

      const notificationPromises = alertRecipients.map(async (recipient) => {
        try {
          // 1. Crea la notifica nel DB (Priorità per polling UI)
          await prisma.notification.create({
            data: {
              tenantId: tenantId || null,
              userId: recipient.id,
              title: pushPayload.title,
              message: message || pushPayload.body,
              type: "ALERT",
              link: pushPayload.url,
              metadata: JSON.stringify({ alertId: alertId, lat, lng, note, audio })
            }
          });

          // 2. Invia Push (Asincrono, può essere lento)
          await sendPushNotification(recipient.id, pushPayload);
        } catch (e) { console.error(`❌ Errore notifica per ${recipient.name}:`, e); }
      });
      
      console.log(`[SOS] Alert inviato a ${alertRecipients.length} destinatari.`);
 
      // 4. Gestione Telegram
      const telegramPromises = [];
      const telegramRecipients = alertRecipients.filter(r => r.telegramChatId);
      
      if (telegramRecipients.length > 0) {
        telegramRecipients.forEach(r => {
          telegramPromises.push(sendTelegramMessage(r.telegramChatId!, telegramText));
        });
 
        if (audio) {
          try {
            const firstRecipient = telegramRecipients[0];
            const voiceRes = await sendTelegramVoice(firstRecipient.telegramChatId!, audio, `🎤 Vocale - ${isResponseFromAdmin ? 'Centrale' : session.user.name}`);
            
            if (voiceRes?.voice?.file_id) {
              for (let i = 1; i < telegramRecipients.length; i++) {
                telegramPromises.push(sendTelegramVoice(telegramRecipients[i].telegramChatId!, voiceRes.voice.file_id, `🎤 Vocale`));
              }
            }
          } catch (audioErr) {
            console.error("❌ Errore invio audio SOS:", audioErr);
          }
        }
      }
 
      await Promise.allSettled([...notificationPromises, ...telegramPromises]);
      return NextResponse.json({ success: true, alertId });
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

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || (session.user.role !== "ADMIN" && !session.user.canManageShifts)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId, status } = await req.json();
    const tenantId = session.user.tenantId;

    if (!alertId || !status) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const alert = await prisma.emergencyAlert.update({
      where: { 
        id: alertId,
        tenantId: tenantId || null
      },
      data: { status }
    });

    return NextResponse.json({ success: true, alert });
  } catch (err: any) {
    console.error("❌ Errore API Update Alert:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
