// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { radioSchema, radioUpdateSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Tenant mancante" }, { status: 400 })
    
    // Include the user information for assegnazioneFissa
    const radios = await prisma.radio.findMany({
      where: { tenantId },
      include: {
        assegnatario: {
          select: { id: true, name: true, matricola: true }
        }
      },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ radios })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = radioSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati radio invalidi", details: parsed.error.format() }, { status: 400 })
    }
    
    const { name, modello, seriale, stato, assegnazioneFissaId, dataAssegnazione, cambioBatteria } = parsed.data

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const radio = await prisma.radio.create({
      data: {
        name,
        modello: modello || null,
        seriale: seriale || null,
        stato: stato || "ATTIVO",
        assegnazioneFissaId: assegnazioneFissaId || null,
        dataAssegnazione: dataAssegnazione ? new Date(dataAssegnazione) : null,
        cambioBatteria: cambioBatteria ? new Date(cambioBatteria) : null,
        tenantId,
      },
      include: {
        assegnatario: {
          select: { id: true, name: true, matricola: true }
        }
      }
    })

    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "CREATE_RADIO",
      targetId: radio.id,
      targetName: radio.name,
      details: `Aggiunta nuova radio: ${radio.name} (Seriale: ${radio.seriale || 'Assente'}) - Stato: ${radio.stato}`
    })

    return NextResponse.json({ radio })
  } catch (error) {
    console.error("[RADIO CREATE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = radioUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati radio invalidi", details: parsed.error.format() }, { status: 400 })
    }

    const { id, name, modello, seriale, stato, assegnazioneFissaId, dataAssegnazione, cambioBatteria } = parsed.data

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const radio = await prisma.radio.update({
      where: { id, tenantId: tenantId || null },
      data: {
        name: name || undefined,
        modello: modello !== undefined ? (modello || null) : undefined,
        seriale: seriale !== undefined ? (seriale || null) : undefined,
        stato: stato || undefined,
        assegnazioneFissaId: assegnazioneFissaId !== undefined ? (assegnazioneFissaId || null) : undefined,
        dataAssegnazione: dataAssegnazione ? new Date(dataAssegnazione) : (dataAssegnazione === "" ? null : undefined),
        cambioBatteria: cambioBatteria ? new Date(cambioBatteria) : (cambioBatteria === "" ? null : undefined),
      },
      include: {
        assegnatario: {
          select: { id: true, name: true, matricola: true }
        }
      }
    })

    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "UPDATE_RADIO",
      targetId: radio.id,
      targetName: radio.name,
      details: `Aggiornata radio: ${radio.name} - Nuovo Stato: ${radio.stato}`
    })

    return NextResponse.json({ radio })
  } catch (error) {
    console.error("[RADIO UPDATE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const targetRadio = await prisma.radio.findUnique({ where: { id } })

    await prisma.radio.delete({
      where: { id, tenantId: tenantId || null }
    })

    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "DELETE_RADIO",
      targetId: id,
      targetName: targetRadio?.name,
      details: `Radio rimossa dall'inventario: ${targetRadio?.name}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[RADIO DELETE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
