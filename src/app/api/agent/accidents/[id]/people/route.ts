import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentPersonSchema } from "@/lib/validations/accident"
import { z } from "zod"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: { vehicles: true },
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })
    }

    const json = await req.json()
    const body = accidentPersonSchema.parse(json)

    // Determine vehicleId: vehicleIndex maps to accident.vehicles[index], -1 = fugitive no vehicle
    let vehicleId: string | null = null
    if (body.vehicleIndex !== null && body.vehicleIndex !== undefined && body.vehicleIndex >= 0) {
      if (accident.vehicles[body.vehicleIndex]) {
        vehicleId = accident.vehicles[body.vehicleIndex].id
      }
    }

    const person = await prisma.accidentPerson.create({
      data: {
        accidentReportId: accidentId,
        accidentVehicleId: vehicleId,
        role: body.role,
        firstName: body.firstName,
        lastName: body.lastName,
        fiscalCode: body.fiscalCode || null,
        documentType: body.documentType || null,
        licenseCategory: body.licenseCategory || null,
        seatbeltUsed: body.seatbeltUsed,
        isFugitive: body.isFugitive || false,
        injuries: body.injuries || null,
        injuriesDetail: body.injuriesDetail || null,
        alcoholTest: body.alcoholTest || null,
        drugTest: body.drugTest || null,
        statement: body.statement || null,
        contactPhone: body.contactPhone || null,
        email: body.email || null,
      },
    })

    return NextResponse.json(person)
  } catch (error) {
    console.error("[POST_ACCIDENT_PERSON_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const url = new URL(req.url)
    const personId = url.searchParams.get("personId")
    if (!personId) return NextResponse.json({ error: "personId required" }, { status: 400 })

    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (accident.status === "CHIUSO") return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })

    await prisma.accidentPerson.delete({ where: { id: personId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_ACCIDENT_PERSON_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
