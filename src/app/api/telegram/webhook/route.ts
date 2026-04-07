import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Gestione Callback Query (es. Preso in carico)
    if (body.callback_query) {
      const cb = body.callback_query;
      const data = cb.data as string;
      const chatId = cb.message.chat.id.toString();
      const messageId = cb.message.message_id;

      if (data.startsWith("ack_alert_")) {
        const alertId = data.replace("ack_alert_", "");
        
        // Aggiorna l'alert nel DB
        await prisma.emergencyAlert.update({
          where: { id: alertId },
          data: { status: "ACKNOWLEDGED" }
        });

        // Rispondi a Telegram per togliere il caricamento sul pulsante
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cb.id, text: "✅ Allerta Presa in Carico!" })
        });

        // Aggiorna il messaggio originale per confermare visivamente
        const originalText = cb.message.text;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: `${originalText}\n\n✅ <b>PRESO IN CARICO</b>`,
            parse_mode: "HTML"
          })
        });
      }
      return NextResponse.json({ ok: true });
    }

    // 2. Gestione Messaggi Normali
    const message = body.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    // Comando /start
    if (text === "/start") {
      await sendTelegramMessage(
        chatId, 
        "👋 <b>Benvenuto nel Bot del Comando Polizia Locale!</b>\n\nUsa <code>/link [codice]</code> per collegare il tuo account."
      );
      return NextResponse.json({ ok: true });
    }

    // Comando /link [CODE]
    if (text.startsWith("/link")) {
      const parts = text.split(" ");
      if (parts.length < 2) {
        await sendTelegramMessage(chatId, "❌ Specifica il codice.\nEsempio: <code>/link 123456</code>");
        return NextResponse.json({ ok: true });
      }

      const code = parts[1];
      const user = await prisma.user.findFirst({
        where: {
          telegramLinkCode: code,
          telegramLinkExpires: { gte: new Date() }
        }
      });

      if (!user) {
        await sendTelegramMessage(chatId, "❌ Codice non valido o scaduto.");
        return NextResponse.json({ ok: true });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          telegramChatId: chatId,
          telegramLinkCode: null,
          telegramLinkExpires: null
        }
      });

      await sendTelegramMessage(chatId, `✅ <b>Collegato!</b> Ciao ${user.name}.`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Errore Webhook Telegram:", error);
    return NextResponse.json({ ok: true });
  }
}
