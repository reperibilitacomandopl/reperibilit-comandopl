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

    // Notifica v1.0.6 - Link diretto per iPhone
    await sendPushNotification(user.id, {
      title: "🏁 Timbratura Uscita", 
      body: `Hai finito il turno? Tocca qui per confermare l'uscita istantaneamente.`,
      url: "/quick-clock?type=OUT", // Pagina magica
      type: "CLOCK_REMINDER"
    })

    return NextResponse.json({ success: true, message: `Notifica v1.0.6 (Link Diretto) inviata a ${user.name}` })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}
