import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/announcements/[id]/read — Segna un avviso come letto
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { id } = await context.params
    const userId = session.user.id

    // Usa upsert per evitare duplicate key se l'utente clicca due volte velocemente
    const read = await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: userId
        }
      },
      update: {}, // se esiste già non fa nulla
      create: {
        announcementId: id,
        userId: userId
      }
    })

    return NextResponse.json({ success: true, read })
  } catch (error) {
    console.error("Mark read error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
