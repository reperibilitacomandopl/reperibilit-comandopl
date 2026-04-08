// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Tenant mancante" }, { status: 400 })
    const vehicles = await prisma.vehicle.findMany({
      where: { tenantId },
      orderBy: { name: "asc" }
    })
    return NextResponse.json({ vehicles })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, targa, scadenzaAssicurazione, scadenzaBollo, scadenzaRevisione, stato } = body
    if (!name) return NextResponse.json({ error: "Nome veicolo obbligatorio" }, { status: 400 })

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        targa: targa || null,
        scadenzaAssicurazione: scadenzaAssicurazione ? new Date(scadenzaAssicurazione) : null,
        scadenzaBollo: scadenzaBollo ? new Date(scadenzaBollo) : null,
        scadenzaRevisione: scadenzaRevisione ? new Date(scadenzaRevisione) : null,
        stato: stato || "ATTIVO",
        tenantId,
      }
    })
    return NextResponse.json({ vehicle })
  } catch (error) {
    console.error("[VEHICLE CREATE]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canConfigureSystem) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { id, name, targa, scadenzaAssicurazione, scadenzaBollo, scadenzaRevisione, stato } = body
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Fail-Safe: Nessun comando attivo" }, { status: 400 })

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        name: name || undefined,
        targa: targa !== undefined ? (targa || null) : undefined,
        scadenzaAssicurazione: scadenzaAssicurazione ? new Date(scadenzaAssicurazione) : (scadenzaAssicurazione === "" ? null : undefined),
        scadenzaBollo: scadenzaBollo ? new Date(scadenzaBollo) : (scadenzaBollo === "" ? null : undefined),
        scadenzaRevisione: scadenzaRevisione ? new Date(scadenzaRevisione) : (scadenzaRevisione === "" ? null : undefined),
        stato: stato || undefined,
      }
    })
    return NextResponse.json({ vehicle })
  } catch (error) {
    console.error("[VEHICLE UPDATE]", error)
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

    await prisma.vehicle.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
