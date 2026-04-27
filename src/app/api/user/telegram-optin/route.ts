import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { optIn } = await req.json()
    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramOptIn: optIn }
    })
    return NextResponse.json({ success: true, optIn })
  } catch (err) {
    return NextResponse.json({ error: "Errore durante l'aggiornamento del consenso" }, { status: 500 })
  }
}
