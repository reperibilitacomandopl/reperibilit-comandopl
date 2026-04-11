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

      // 2. Trova tutti gli ADMIN e gli OFFICER del tenant per inviare notifiche push
      const alertRecipients = await prisma.user.findMany({
        where: { 
          tenantId: tenantId || null, 
          OR: [
            { role: "ADMIN" },
            { role: "OFFICER" }
          ]
        },
        select: { id: true, name: true }
      });

      // 3. Invia Push ai destinatari e crea Notifica nel DB
      const pushPayload = {
        title: "🚨 EMERGENZA SOS!",
        body: `L'agente ${session.user.name} ha lanciato un SOS.`,
        url: `/${session.user.tenantSlug}/admin/timbrature?alertId=${alert.id}`
      };

      for (const recipient of alertRecipients) {
        // 1. Notifica Push (Browsers)
        await sendPushNotification(recipient.id, pushPayload);
        
        // 2. Notifica Hub (Database)
        await prisma.notification.create({
          data: {
            tenantId: tenantId || null,
            userId: recipient.id,
            title: pushPayload.title,
            message: note ? `Nota: ${note}` : pushPayload.body,
            type: "ALERT",
            link: pushPayload.url,
            metadata: JSON.stringify({ lat, lng, alertId: alert.id, note })
          }
        });

        // 3. Telegram (Bot agli Ufficiali/Admin)
        const recipientUser = await prisma.user.findUnique({ where: { id: recipient.id }, select: { telegramChatId: true } });
        if (recipientUser?.telegramChatId) {
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          const telegramText = `🚨 <b>ALLERTA SOS GPS</b> 🚨\n\nOperatore: <b>${session.user.name}</b> (Matr. ${session.user.matricola || 'N/D'})\n\n📝 <b>NOTA:</b> ${note || "Nessuna nota fornita"}\n\n📍 <a href="${mapUrl}">Vedi Posizione su Mappe</a>`;
          
          await sendTelegramMessage(recipientUser.telegramChatId, telegramText);
          
          // Se c'è un audio, invialo come nota vocale
          if (audio) {
            await sendTelegramVoice(recipientUser.telegramChatId, audio, `🎤 Vocale SOS d'emergenza - ${session.user.name}`);
          }
        }
      }

      return NextResponse.json({ success: true, alertId: alert.id });
    }

    // --- CASO 2: ALLERTA COMANDO (Top-Down - Logica Preesistente) ---
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const tf = tenantId ? { tenantId } : {};

    // Check if Admin OR Officer on duty today
    const isOfficerOnDuty = await prisma.shift.findFirst({
      where: {
        ...tf,
        userId: userId,
        date: todayUTC,
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
        date: todayUTC,
        repType: { not: null }
      },
      include: { user: true }
    });

    const repUsers = todayShifts.filter(s => s.user.telegramChatId);

    if (repUsers.length === 0) {
      return NextResponse.json({ error: "Nessun reperibile per la data odierna ha collegato Telegram!" }, { status: 400 });
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

    // 3. Invia messaggi Telegram tramite la utility centralizzata
    let sentCount = 0;
    for (const shift of repUsers) {
      const chatId = shift.user.telegramChatId;
      if (chatId) {
        const keyboard = {
          inline_keyboard: [[{ text: "👍 PRESO IN CARICO", callback_data: `ack_alert_${alert.id}` }]]
        };
        const text = `🚨 <b>ALLERTA URGENZA DAL COMANDO</b> 🚨\n\nAgente <b>${shift.user.name}</b>, sei in reperibilità oggi (${shift.repType}).\nDevi recarti in comando entro 30 minuti.\n\nClicca il pulsante qui sotto per confermare la presa visione.`;
        
        const ok = await sendTelegramMessage(chatId, text, keyboard);
        if (ok) {
          sentCount++;
          // Crea anche notifica interna nel portale
          await prisma.notification.create({
            data: {
              tenantId: tenantId || null,
              userId: shift.userId,
              title: "🚨 ALLERTA URGENZA",
              message: "Il Comando ha richiesto la tua presenza immediata. Controlla Telegram per i dettagli.",
              type: "ALERT"
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, alerted: sentCount });
  } catch (err: any) {
    console.error("❌ Errore API Alert Emergency:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
