import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { armorSchema, armorUpdateSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Tenant mancante" }, { status: 400 })
    
    const armors = await prisma.armor.findMany({
      where: { tenantId },
      include: {
        assegnatario: {
          select: { id: true, name: true, matricola: true }
        }
      },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ armors })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = armorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati GAP invalidi", details: parsed.error.format() }, { status: 400 })
    }
    
    const { name, modello, seriale, stato, assegnazioneFissaId, dataAssegnazione, scadenzaKevlar } = parsed.data

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const armor = await prisma.armor.create({
      data: {
        name,
        modello: modello || null,
        seriale: seriale || null,
        stato: stato || "ATTIVO",
        assegnazioneFissaId: assegnazioneFissaId || null,
        dataAssegnazione: dataAssegnazione ? new Date(dataAssegnazione) : null,
        scadenzaKevlar: scadenzaKevlar ? new Date(scadenzaKevlar) : null,
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
      action: "CREATE_ARMOR",
      targetId: armor.id,
      targetName: armor.name,
      details: `Aggiunto nuovo GAP: ${armor.name} (Seriale: ${armor.seriale || 'Assente'}) - Stato: ${armor.stato}`
    })

    return NextResponse.json({ armor })
  } catch (error) {
    console.error("[ARMOR CREATE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = armorUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati GAP invalidi", details: parsed.error.format() }, { status: 400 })
    }

    const { id, name, modello, seriale, stato, assegnazioneFissaId, dataAssegnazione, scadenzaKevlar } = parsed.data

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const armor = await prisma.armor.update({
      where: { id, tenantId: tenantId || null },
      data: {
        name: name || undefined,
        modello: modello !== undefined ? (modello || null) : undefined,
        seriale: seriale !== undefined ? (seriale || null) : undefined,
        stato: stato || undefined,
        assegnazioneFissaId: assegnazioneFissaId !== undefined ? (assegnazioneFissaId || null) : undefined,
        dataAssegnazione: dataAssegnazione ? new Date(dataAssegnazione) : (dataAssegnazione === "" ? null : undefined),
        scadenzaKevlar: scadenzaKevlar ? new Date(scadenzaKevlar) : (scadenzaKevlar === "" ? null : undefined),
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
      action: "UPDATE_ARMOR",
      targetId: armor.id,
      targetName: armor.name,
      details: `Aggiornato GAP: ${armor.name} - Nuovo Stato: ${armor.stato}`
    })

    return NextResponse.json({ armor })
  } catch (error) {
    console.error("[ARMOR UPDATE]", error)
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

    const targetArmor = await prisma.armor.findUnique({ where: { id } })

    await prisma.armor.delete({
      where: { id, tenantId: tenantId || null }
    })

    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "DELETE_ARMOR",
      targetId: id,
      targetName: targetArmor?.name,
      details: `GAP rimosso dall'inventario: ${targetArmor?.name}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ARMOR DELETE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
