import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentExternalUnitSchema } from "@/lib/validations/accident"
import { z } from "zod"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      select: { tenantId: true }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    const units = await prisma.accidentExternalUnit.findMany({
      where: { accidentReportId: accidentId },
      orderBy: { arrivedAt: 'asc' }
    })

    return NextResponse.json(units)
  } catch (error) {
    console.error("[GET_EXTERNAL_UNITS_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const json = await req.json()
    const body = accidentExternalUnitSchema.parse(json)

    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot add external units to a closed accident" }, { status: 400 })
    }

    const unit = await prisma.accidentExternalUnit.create({
      data: {
        accidentReportId: accidentId,
        unitType: body.unitType,
        unitName: body.unitName,
        unitIdentifier: body.unitIdentifier,
        arrivedAt: body.arrivedAt ? new Date(body.arrivedAt) : null,
        leftAt: body.leftAt ? new Date(body.leftAt) : null,
        officerInCharge: body.officerInCharge,
        actionsPerformed: body.actionsPerformed,
        reportNumber: body.reportNumber,
        notes: body.notes,
      }
    })

    await prisma.accidentAuditLog.create({
      data: {
        accidentReportId: accidentId,
        userId: session.user.id,
        action: "EXTERNAL_UNIT_ADDED",
        details: `Ente esterno aggiunto: ${body.unitType} — ${body.unitName || ""}`
      }
    })

    return NextResponse.json(unit)
  } catch (error) {
    console.error("[POST_EXTERNAL_UNIT_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
