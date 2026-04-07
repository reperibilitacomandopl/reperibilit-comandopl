import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const tenantId = session.user.tenantId;
    const tf = tenantId ? { tenantId } : {};

    // Check if Admin OR Officer on duty today
    const isOfficerOnDuty = await prisma.shift.findFirst({
      where: {
        ...tf,
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
        adminId: session.user.id,
        message: "🚨 URGENZA! Recarsi in comando entro 30 min.",
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
        if (ok) sentCount++;
      }
    }

    return NextResponse.json({ success: true, alerted: sentCount });
  } catch (err: any) {
    console.error("❌ Errore API Alert Emergency:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
