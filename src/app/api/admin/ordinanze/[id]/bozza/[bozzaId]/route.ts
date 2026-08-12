import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PUT /api/admin/ordinanze/[id]/bozza/[bozzaId]
// Aggiorna il testo modificato dall'operatore

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; bozzaId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const { id, bozzaId } = await params

  try {
    const body = await req.json()
    const { testoModificato, noteOperatore, numeroProtocollo } = body

    const bozza = await prisma.ordinanzaBozza.findUnique({
      where: { id: bozzaId, requestId: id, tenantId: session.user.tenantId },
    })

    if (!bozza) {
      return NextResponse.json({ error: "Bozza non trovata" }, { status: 404 })
    }

    if (bozza.stato === "APPROVATA") {
      return NextResponse.json(
        { error: "Impossibile modificare una bozza già approvata" },
        { status: 409 }
      )
    }

    const updated = await prisma.ordinanzaBozza.update({
      where: { id: bozzaId },
      data: {
        ...(testoModificato !== undefined && { testoModificato }),
        ...(noteOperatore !== undefined && { noteOperatore }),
        ...(numeroProtocollo !== undefined && { numeroProtocollo }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[BOZZA_PUT]", error)
    return NextResponse.json({ error: "Errore server" }, { status: 500 })
  }
}
