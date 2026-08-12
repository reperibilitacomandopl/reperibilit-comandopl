import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET  /api/admin/ordinanze/[id]   — dettaglio pratica
// PUT  /api/admin/ordinanze/[id]   — aggiorna stato / campi

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await params

  try {
    const request = await prisma.ordinanzaRequest.findUnique({
      where: { id, tenantId: session.user.tenantId },
      include: {
        createdBy: { select: { name: true, matricola: true, qualifica: true } },
        bozze: {
          orderBy: { createdAt: "desc" },
          include: {
            approvataDa: { select: { name: true, matricola: true } },
          },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 })
    }

    return NextResponse.json(request)
  } catch (error) {
    console.error("[ORDINANZA_GET_ID]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const { stato, tipoOrdinanza, testoRichiesta, richiedente, via, civico,
            dataInizio, dataFine, oraDalle, oraAlle, motivazione } = body

    const existing = await prisma.ordinanzaRequest.findUnique({
      where: { id, tenantId: session.user.tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 })
    }

    const updated = await prisma.ordinanzaRequest.update({
      where: { id },
      data: {
        ...(stato !== undefined && { stato }),
        ...(tipoOrdinanza !== undefined && { tipoOrdinanza }),
        ...(testoRichiesta !== undefined && { testoRichiesta }),
        ...(richiedente !== undefined && { richiedente }),
        ...(via !== undefined && { via }),
        ...(civico !== undefined && { civico }),
        ...(dataInizio !== undefined && { dataInizio: dataInizio ? new Date(dataInizio) : null }),
        ...(dataFine !== undefined && { dataFine: dataFine ? new Date(dataFine) : null }),
        ...(oraDalle !== undefined && { oraDalle }),
        ...(oraAlle !== undefined && { oraAlle }),
        ...(motivazione !== undefined && { motivazione }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[ORDINANZA_PUT_ID]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id } = await params

  // solo ADMIN possono eliminare pratiche
  if (session.user.role !== "ADMIN" && !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 })
  }

  try {
    const existing = await prisma.ordinanzaRequest.findUnique({
      where: { id, tenantId: session.user.tenantId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Pratica non trovata" }, { status: 404 })
    }

    await prisma.ordinanzaRequest.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ORDINANZA_DELETE_ID]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
