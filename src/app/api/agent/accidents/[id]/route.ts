import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: {
        vehicles: { include: { occupants: true } },
        people: true,
      }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    return NextResponse.json(accident)
  } catch (error) {
    console.error("[GET_ACCIDENT_ID_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId


  try {
    const body = await req.json()
    const { action, ...updateData } = body

    const existing = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: { vehicles: true, people: true }
    })

    if (!existing || existing.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    // STATE MACHINE LOGIC
    let newStatus = existing.status

    if (action === "SUBMIT_COMPILATION") {
      if (existing.status !== "BOZZA") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      if (existing.vehicles.length === 0 || existing.people.length === 0) {
         return NextResponse.json({ error: "Almeno 1 veicolo e 1 persona inseriti richiesti" }, { status: 400 })
      }
      newStatus = "IN_COMPILAZIONE"
    } else if (action === "MARK_REVIEWED") {
      if (existing.status !== "IN_COMPILAZIONE") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      // Dobbiamo verificare dinamica compilata
      if (!existing.dynamicDescription || existing.dynamicDescription.trim() === "") {
        return NextResponse.json({ error: "Dinamica mancante" }, { status: 400 })
      }
      newStatus = "REVISIONATO"
    } else if (action === "CLOSE") {
      // Solo Ufficiale/Comandante
      if (!session.user.isUfficiale && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo ufficiali possono chiudere il verbale" }, { status: 403 })
      }
      if (existing.status !== "REVISIONATO") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      newStatus = "CHIUSO"
    } else if (action === "REOPEN") {
      if (!session.user.isUfficiale && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo ufficiali possono riaprire il verbale" }, { status: 403 })
      }
      if (existing.status !== "CHIUSO") {
        return NextResponse.json({ error: "Invalid status transition" }, { status: 400 })
      }
      if (!body.reason) {
        return NextResponse.json({ error: "Motivazione richiesta per riapertura" }, { status: 400 })
      }
      newStatus = "REVISIONATO"
      // TODO: Audit log of reopening
      await prisma.auditLog.create({
        data: {
          tenantId,
          adminId: session.user.id,
          action: "REOPEN_ACCIDENT",
          targetId: accidentId,
          details: `Motivo: ${body.reason}`
        }
      })
    }

    const updated = await prisma.accidentReport.update({
      where: { id: accidentId },
      data: {
        ...updateData,
        status: newStatus
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT_ACCIDENT_ID_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId


  try {
    const existing = await prisma.accidentReport.findUnique({
      where: { id: accidentId }
    })

    if (!existing || existing.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    // Solo Admin o in BOZZA
    if (existing.status !== "BOZZA" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Cannot delete accident not in BOZZA unless ADMIN" }, { status: 403 })
    }

    await prisma.accidentReport.delete({
      where: { id: accidentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_ACCIDENT_ID_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
