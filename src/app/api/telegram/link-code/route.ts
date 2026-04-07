import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { randomInt } from "crypto"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  // Genera un codice a 6 cifre
  const code = randomInt(100000, 999999).toString()
  const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minuti di validità

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramLinkCode: code,
        telegramLinkExpires: expires
      }
    })

    return NextResponse.json({ code })
  } catch (error) {
    console.error("❌ Errore generazione codice Telegram:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
