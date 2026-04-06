import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  try {
    const { month, year } = await req.json()
    if (!month || !year) return NextResponse.json({ error: "Mese e anno richiesti" }, { status: 400 })

    if (!TELEGRAM_TOKEN) {
      return NextResponse.json({ error: "Telegram Bot Token non configurato" }, { status: 500 })
    }

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    const monthName = monthNames[month - 1]

    // Find all users with a Telegram Chat ID
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null }
      }
    })

    if (users.length === 0) {
       return NextResponse.json({ success: true, count: 0, message: "Nessun utente ha collegato Telegram." })
    }

    let successCount = 0
    let failCount = 0

    const message = `📅 <b>Turni Pubblicati</b>\n\nI turni del mese di <b>${monthName} ${year}</b> sono appena stati pubblicati e sono ora consultabili.\n\nAccedi alla tua <a href="${process.env.NEXTAUTH_URL}">Dashboard Agente</a> per controllarli.`

    for (const user of users) {
      if (!user.telegramChatId) continue

      try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.telegramChatId,
            text: message,
            parse_mode: "HTML",
          })
        })
        if (res.ok) successCount++
        else failCount++
      } catch (e) {
        failCount++
      }
    }

    return NextResponse.json({ 
       success: true, 
       count: successCount, 
       failed: failCount,
       message: `Inviate ${successCount} notifiche Telegram.` 
    })

  } catch (error) {
    console.error("[TELEGRAM PUBLISH]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
