import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET  /api/admin/ordinanze/templates   — lista template
// POST /api/admin/ordinanze/templates   — crea template

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get("tipo")

  try {
    const templates = await prisma.ordinanzaTemplate.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
        ...(tipo ? { tipo } : {}),
      },
      orderBy: [{ isDefault: "asc" }, { tipo: "asc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("[TEMPLATES_GET]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Solo gli amministratori possono aggiungere template" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { nome, tipo, descrizione, contenuto, fileUrl } = body

    if (!nome || !tipo || !contenuto) {
      return NextResponse.json(
        { error: "Nome, tipo e contenuto sono obbligatori" },
        { status: 400 }
      )
    }

    const template = await prisma.ordinanzaTemplate.create({
      data: {
        tenantId: session.user.tenantId,
        nome,
        tipo,
        descrizione: descrizione ?? null,
        contenuto,
        fileUrl: fileUrl ?? null,
        isDefault: false,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("[TEMPLATES_POST]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
