import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    console.log("[CHAT_GET] Session:", !!session, "User:", session?.user?.id)
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const patrolGroupId = searchParams.get('patrolGroupId')
    console.log("[CHAT_GET] patrolGroupId:", patrolGroupId)

    if (!patrolGroupId) {
      return NextResponse.json({ error: "patrolGroupId mancante" }, { status: 400 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { 
        patrolGroupId,
        // H10 FIX: Isolamento tenant — solo messaggi del proprio tenant
        tenantId: session.user.tenantId || undefined
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      },
      take: 100 // fetch last 100
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("GET /api/agent/chat error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    console.log("[CHAT_POST] Session:", !!session, "User:", session?.user?.id)
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const body = await req.json()
    console.log("[CHAT_POST] Body:", body)
    const { patrolGroupId, message } = body

    if (!patrolGroupId || !message) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        patrolGroupId,
        message: message.trim(),
        senderId: session.user.id,
        tenantId: session.user.tenantId || null
      },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({ success: true, message: newMessage })
  } catch (error) {
    console.error("POST /api/agent/chat error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
