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

    // Simulazione notifica dimenticata timbratura
    await sendPushNotification(user.id, {
      title: "🔔 Turno terminato - Hai dimenticato di timbrare?",
      body: `Il tuo turno doveva terminare alle 22:00. Se sei ancora in servizio, le ore extra saranno contabilizzate come straordinario. Apri l'app per timbrare l'uscita.`,
      url: "/?action=clockin"
    })

    return NextResponse.json({ success: true, message: `Notifica inviata a ${user.name}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}
