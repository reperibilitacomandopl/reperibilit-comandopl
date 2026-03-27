import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup
    })
  });
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  if (!TELEGRAM_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: true
    })
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Handle Callback Query (Button Clicks)
    if (body.callback_query) {
      const q = body.callback_query;
      const data = q.data; // e.g. "ack_alert_123"
      const chatId = q.message?.chat?.id;

      if (data && data.startsWith("ack_alert_")) {
        const alertId = data.replace("ack_alert_", "");
        
        // Trova il destinatario tramite il chatId utente e l'alertId
        const user = await prisma.user.findFirst({ where: { telegramChatId: String(chatId) } });
        if (user) {
          await prisma.alertRecipient.updateMany({
            where: { alertId, userId: user.id },
            data: { status: "ACKNOWLEDGED", ackedAt: new Date() }
          });

          await answerCallbackQuery(q.id, "Presa visione confermata. Grazie.");
          await sendTelegramMessage(chatId, "✅ <b>Presa Visione Registrata!</b> La centrale operativa è stata aggiornata in tempo reale.");
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Handle standard Messages
    if (body.message && body.message.text) {
      const text = body.message.text.trim() as string;
      const chatId = String(body.message.chat.id);

      if (text.startsWith("/start")) {
        const parts = text.split(" ");
        if (parts.length > 1) {
          const code = parts[1];
          // Find user by link code
          const user = await prisma.user.findFirst({
            where: {
              telegramLinkCode: code,
              telegramLinkExpires: { gt: new Date() }
            }
          });

          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                telegramChatId: chatId,
                telegramLinkCode: null,
                telegramLinkExpires: null
              }
            });
            await sendTelegramMessage(chatId, `🎉 <b>Account Collegato!</b>\nBenvenuto Agente <b>${user.name}</b> (Matr. ${user.matricola}). Ora riceverai qui gli avvisi di emergenza.`);
          } else {
            await sendTelegramMessage(chatId, "❌ Codice non valido o scaduto. Generalo nuovamente dal Portale Caserma.");
          }
        } else {
          await sendTelegramMessage(chatId, "Scrivi `/start CODICE` per collegare il tuo account al Portale Caserma.");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram Webhook Error:", err.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
