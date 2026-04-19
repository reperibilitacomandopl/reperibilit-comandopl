// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { id } = await params

    const request = await (prisma as any).agentRequest.findUnique({
      where: { id },
      include: { user: { select: { name: true, matricola: true } } }
    })

    if (!request) {
      return NextResponse.json({ success: false, error: "Richiesta non trovata" }, { status: 404 })
    }

    return NextResponse.json({ success: true, request })
  } catch (error) {
    console.error("Error fetching agent request:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
