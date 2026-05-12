import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const name = searchParams.get("name") || "Dibenedetto"

    const user = await prisma.user.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } }
    })

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    // Notifica esplicita per iPhone con azioni
    await sendPushNotification(user.id, {
      title: "🏁 Promemoria Timbratura Uscita",
      body: `Il tuo turno è terminato. Tieni premuto per timbrare l'uscita ora.`,
      url: "/",
      type: "CLOCK_REMINDER" // Tipo esplicito per il Service Worker
    })

    return NextResponse.json({ success: true, message: `Notifica v1.0.3 inviata a ${user.name}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}
