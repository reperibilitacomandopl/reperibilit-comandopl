import { prisma } from "./prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Invia un messaggio a un chatId specifico
 */
export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN) {
    console.error("❌ Telegram Bot Token non configurato.");
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("❌ Errore invio messaggio Telegram:", err);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Eccezione invio messaggio Telegram:", error);
    return false;
  }
}

/**
 * Invia una nota vocale a un chatId specifico
 * Restituisce l'oggetto messaggio di Telegram se l'invio ha successo, altrimenti null
 */
export async function sendTelegramVoice(chatId: string, audioSource: string, caption?: string) {
  if (!BOT_TOKEN) return null;

  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    
    // Se la sorgente è un data URL o base64, convertila in Blob
    if (audioSource.includes(";base64,") || audioSource.length > 500) {
      const base64Data = audioSource.split(",")[1] || audioSource;
      const buffer = Buffer.from(base64Data, "base64");
      // Tricky: Spacciamo il webm per ogg per attivare la bolla vocale di Telegram (Codec Opus è compatibile)
      formData.append("voice", new Blob([buffer], { type: "audio/ogg" }), "sos_voice.ogg");
    } else {
      // Altrimenti assumiamo sia un file_id pre-caricato
      formData.append("voice", audioSource);
    }

    if (caption) formData.append("caption", caption);
    formData.append("parse_mode", "HTML");

    const res = await fetch(`${TELEGRAM_API}/sendVoice`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Errore invio vocale Telegram:", data);
      return null;
    }

    return data.result; // Contiene file_id
  } catch (error) {
    console.error("❌ Eccezione invio vocale Telegram:", error);
    return null;
  }
}

/**
 * Invia un'allerta di emergenza a tutti gli utenti collegati di un tenant
 */
export async function broadcastEmergency(tenantId: string, message: string) {
  const users = await prisma.user.findMany({
    where: { 
      tenantId,
      telegramChatId: { not: null }
    },
    select: { telegramChatId: true, name: true }
  });

  const results = await Promise.all(
    users.map(u => sendTelegramMessage(u.telegramChatId!, `🚨 <b>ALLERTA EMERGENZA COMANDO</b> 🚨\n\n${message}`))
  );

  return results.filter(r => r).length;
}
