import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/notifications/subscribe
 * Registra o aggiorna una sottoscrizione Push API per l'utente corrente.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { subscription } = await req.json()
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Sottoscrizione non valida" }, { status: 400 })
    }

    const userId = session.user.id
    
    // Upsert della sottoscrizione basata sull'endpoint univoco
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }
    })

    return NextResponse.json({ success: true, message: "Sottoscrizione registrata con successo" })
  } catch (error) {
    console.error("[PUSH SUBSCRIBE ERROR]", error)
    return NextResponse.json({ error: "Errore interno durante la sottoscrizione" }, { status: 500 })
  }
}
