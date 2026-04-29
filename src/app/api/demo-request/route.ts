import { NextResponse } from "next/server"
import { sendTelegramMessage } from "@/lib/telegram"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, command, email, phone, message } = body

    if (!name || !command || !email) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    // Invia notifica Telegram all'admin globale
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    const text = [
      `📩 <b>NUOVA RICHIESTA DEMO</b>`,
      ``,
      `👤 <b>Nome:</b> ${name}`,
      `🏛️ <b>Comando:</b> ${command}`,
      `📧 <b>Email:</b> ${email}`,
      phone ? `📱 <b>Telefono:</b> ${phone}` : null,
      message ? `💬 <b>Messaggio:</b> ${message}` : null,
      ``,
      `⏰ ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}`,
    ].filter(Boolean).join("\n")

    if (adminChatId) {
      await sendTelegramMessage(adminChatId, text)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Errore demo request:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
