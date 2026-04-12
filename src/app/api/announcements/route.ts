import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/announcements — Restituisce gli avvisi per il comando
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const tenantId = session.user.tenantId
    const userId = session.user.id

    // Fetch announcements
    const announcements = await prisma.announcement.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        reads: {
          where: { userId }
        }
      }
    })

    // Map to include hasRead boolean
    const result = announcements.map(a => ({
      ...a,
      hasRead: a.reads.length > 0
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET Announcements error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}

// POST /api/announcements — Crea un nuovo avviso (solo ADMIN)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const { title, body, priority, requiresRead, isPinned } = await request.json()

    if (!title || !body) {
      return NextResponse.json({ error: "Titolo e testo sono obbligatori" }, { status: 400 })
    }

    const ann = await prisma.announcement.create({
      data: {
        tenantId,
        authorId: session.user.id,
        authorName: session.user.name || "Comando",
        title,
        body,
        priority: priority || "NORMAL",
        requiresRead: requiresRead || false,
        isPinned: isPinned || false
      }
    })

    return NextResponse.json(ann)
  } catch (error) {
    console.error("POST Announcement error:", error)
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 })
  }
}
