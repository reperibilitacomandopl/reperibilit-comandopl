import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { weaponSchema, weaponUpdateSchema } from "@/lib/validations/admin"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Tenant mancante" }, { status: 400 })
    
    const weapons = await prisma.weapon.findMany({
      where: { tenantId },
      include: {
        assegnatario: {
          select: { id: true, name: true, matricola: true }
        }
      },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ weapons })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = weaponSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati arma invalidi", details: parsed.error.format() }, { status: 400 })
    }
    
    const { name, modello, matricola, stato, assegnazioneFissaId, dataAssegnazione, note } = parsed.data

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const weapon = await prisma.weapon.create({
      data: {
        name,
        modello: modello || null,
        matricola: matricola || null,
        stato: stato || "ATTIVO",
        assegnazioneFissaId: assegnazioneFissaId || null,
        dataAssegnazione: dataAssegnazione ? new Date(dataAssegnazione) : null,
        note: note || null,
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
      action: "CREATE_WEAPON",
      targetId: weapon.id,
      targetName: weapon.name,
      details: `Aggiunta nuova arma: ${weapon.name} (Matricola: ${weapon.matricola || 'Assente'}) - Stato: ${weapon.stato}`
    })

    return NextResponse.json({ weapon })
  } catch (error) {
    console.error("[WEAPON CREATE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = weaponUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dati arma invalidi", details: parsed.error.format() }, { status: 400 })
    }

    const { id, name, modello, matricola, stato, assegnazioneFissaId, dataAssegnazione, note } = parsed.data

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const weapon = await prisma.weapon.update({
      where: { id, tenantId: tenantId || null },
      data: {
        name: name || undefined,
        modello: modello !== undefined ? (modello || null) : undefined,
        matricola: matricola !== undefined ? (matricola || null) : undefined,
        stato: stato || undefined,
        assegnazioneFissaId: assegnazioneFissaId !== undefined ? (assegnazioneFissaId || null) : undefined,
        dataAssegnazione: dataAssegnazione ? new Date(dataAssegnazione) : (dataAssegnazione === "" ? null : undefined),
        note: note !== undefined ? (note || null) : undefined,
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
      action: "UPDATE_WEAPON",
      targetId: weapon.id,
      targetName: weapon.name,
      details: `Aggiornata arma: ${weapon.name} - Nuovo Stato: ${weapon.stato}`
    })

    return NextResponse.json({ weapon })
  } catch (error) {
    console.error("[WEAPON UPDATE]", error)
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

    const targetWeapon = await prisma.weapon.findUnique({ where: { id } })

    await prisma.weapon.delete({
      where: { id, tenantId: tenantId || null }
    })

    await logAudit({
      tenantId,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "DELETE_WEAPON",
      targetId: id,
      targetName: targetWeapon?.name,
      details: `Arma rimossa dall'inventario: ${targetWeapon?.name}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[WEAPON DELETE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
