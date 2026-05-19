import { NextResponse } from "next/server"
import { sendTelegramMessage } from "@/lib/telegram"

// C6 FIX: Rate limiting in-memory per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 ora

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// Sanitizza input HTML per prevenire injection nel messaggio Telegram
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .substring(0, 500) // Limite lunghezza ragionevole
}

export async function POST(request: Request) {
  try {
    // C6 FIX: Rate limiting per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 })
    }

    const body = await request.json()
    const { name, command, email, phone, message } = body

    if (!name || !command || !email) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    // Validazione email basica
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 })
    }

    // Invia notifica Telegram all'admin globale con input sanitizzato
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
    const text = [
      `📩 <b>NUOVA RICHIESTA DEMO</b>`,
      ``,
      `👤 <b>Nome:</b> ${sanitizeHtml(name)}`,
      `🏛️ <b>Comando:</b> ${sanitizeHtml(command)}`,
      `📧 <b>Email:</b> ${sanitizeHtml(email)}`,
      phone ? `📱 <b>Telefono:</b> ${sanitizeHtml(phone)}` : null,
      message ? `💬 <b>Messaggio:</b> ${sanitizeHtml(message)}` : null,
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
