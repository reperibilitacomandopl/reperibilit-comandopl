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

    // Simulazione notifica con pulsanti rapidi
    await sendPushNotification(user.id, {
      title: "⚠️ Dimenticato timbratura uscita?",
      body: `Il tuo turno è terminato. Usa il tasto qui sotto per timbrare l'uscita senza aprire l'app.`,
      url: "/"
    })

    return NextResponse.json({ success: true, message: `Notifica con azioni inviata a ${user.name}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}
