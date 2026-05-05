import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "super-secret-key-for-dev")

async function verifyAuth(req: Request) {
  const cookieStore = cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req)
    if (!auth) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const patrolGroupId = searchParams.get('patrolGroupId')

    if (!patrolGroupId) {
      return NextResponse.json({ error: "patrolGroupId mancante" }, { status: 400 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { patrolGroupId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true }
        }
      },
      take: 50 // fetch last 50
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("GET /api/agent/chat error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req)
    if (!auth) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { patrolGroupId, message } = await req.json()

    if (!patrolGroupId || !message) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        patrolGroupId,
        message: message.trim(),
        senderId: auth.userId as string,
        tenantId: auth.tenantId as string || null
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
