import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const { templateId } = await params

  try {
    const body = await req.json()
    const { nome, tipo, descrizione, contenuto, isActive } = body

    const existing = await prisma.ordinanzaTemplate.findUnique({
      where: { id: templateId, tenantId: session.user.tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Template non trovato" }, { status: 404 })
    }

    const updated = await prisma.ordinanzaTemplate.update({
      where: { id: templateId },
      data: {
        ...(nome !== undefined && { nome }),
        ...(tipo !== undefined && { tipo }),
        ...(descrizione !== undefined && { descrizione }),
        ...(contenuto !== undefined && { contenuto }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[TEMPLATE_PUT]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  const { templateId } = await params

  try {
    const existing = await prisma.ordinanzaTemplate.findUnique({
      where: { id: templateId, tenantId: session.user.tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Template non trovato" }, { status: 404 })
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Impossibile eliminare un template predefinito di sistema" },
        { status: 400 }
      )
    }

    await prisma.ordinanzaTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[TEMPLATE_DELETE]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
