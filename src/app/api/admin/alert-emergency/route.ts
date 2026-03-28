import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  if (!TELEGRAM_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup
      })
    });
    return res.ok;
  } catch (e) {
    console.error("Telegram Send Error:", e);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate();
    const todayUTC = new Date(Date.UTC(currentYear, currentMonth, currentDay));

    // Check if Admin OR Officer on duty today
    const isOfficerOnDuty = await prisma.shift.findFirst({
      where: {
        userId: session.user.id,
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
        adminId: session.user.id,
        message: "🚨 URGENZA! Recarsi in comando entro 30 min.",
        status: "PENDING",
        recipients: {
          create: repUsers.map(s => ({ userId: s.userId, status: "SENT" }))
        }
      }
    });

    // 3. Invia messaggi Telegram
    let sentCount = 0;
    for (const shift of repUsers) {
      const chatId = shift.user.telegramChatId;
      if (chatId) {
        const keyboard = {
          inline_keyboard: [[{ text: "👍 PRESO IN CARICO", callback_data: `ack_alert_${alert.id}` }]]
        };
        const text = `🚨 <b>ALLERTA URGENZA DAL COMANDO</b> 🚨\n\nAgente <b>${shift.user.name}</b>, sei in reperibilità oggi (${shift.repType}).\nDevi recarti in comando entro 30 minuti.\n\nClicca il pulsante qui sotto per confermare la presa visione.`;
        
        await sendTelegramMessage(chatId, text, keyboard);
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, alerted: sentCount });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
