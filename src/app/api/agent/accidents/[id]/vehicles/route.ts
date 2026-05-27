import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentVehicleSchema } from "@/lib/validations/accident"
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
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })
    }

    const json = await req.json()
    const body = accidentVehicleSchema.parse(json)

    const vehicleCount = await prisma.accidentVehicle.count({ where: { accidentReportId: accidentId } })
    const vehicle = await prisma.accidentVehicle.create({
      data: {
        accidentReportId: accidentId,
        vehicleNumber: body.vehicleNumber || vehicleCount + 1,
        licensePlate: body.licensePlate,
        vehicleType: body.vehicleType,
        brand: body.brand || null,
        model: body.model || null,
        color: body.color || null,
        registrationYear: body.registrationYear ?? null,
        vin: body.vin || null,
        directionOfTravel: body.directionOfTravel || null,
        maneuver: body.maneuver || null,
        isFugitive: body.isFugitive || false,
        insuranceCompany: body.insuranceCompany || null,
        insurancePolicy: body.insurancePolicy || null,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
        insuranceValid: body.insuranceValid ?? null,
        revisionDate: body.revisionDate || null,
        damageDescription: body.damageDescription || null,
        damageAreas: body.damageAreas || [],
        damageZones: body.damageZones as any,
        deformationType: body.deformationType || null,
        airbagDeployed: body.airbagDeployed ?? null,
        tireCondition: body.tireCondition || null,
        ownerName: body.ownerName || null,
        ownerFiscalCode: body.ownerFiscalCode || null,
        ownerAddress: body.ownerAddress || null,
        towingRequired: body.towingRequired || false,
        towingCompany: body.towingCompany || null,
        towingAt: body.towingAt ? new Date(body.towingAt) : null,
        depositLocation: body.depositLocation || null,
        position: body.position || null,
      },
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    console.error("[POST_ACCIDENT_VEHICLE_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const url = new URL(req.url)
    const vehicleId = url.searchParams.get("vehicleId")
    if (!vehicleId) return NextResponse.json({ error: "vehicleId required" }, { status: 400 })

    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (accident.status === "CHIUSO") return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })

    const json = await req.json()
    const body = accidentVehicleSchema.parse(json)

    const updated = await prisma.accidentVehicle.update({
      where: { id: vehicleId },
      data: {
        vehicleNumber: body.vehicleNumber,
        licensePlate: body.licensePlate,
        vehicleType: body.vehicleType,
        brand: body.brand, model: body.model, color: body.color,
        registrationYear: body.registrationYear, vin: body.vin,
        directionOfTravel: body.directionOfTravel, maneuver: body.maneuver,
        isFugitive: body.isFugitive,
        insuranceCompany: body.insuranceCompany, insurancePolicy: body.insurancePolicy,
        insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
        insuranceValid: body.insuranceValid, revisionDate: body.revisionDate,
        damageDescription: body.damageDescription, damageAreas: body.damageAreas || [],
        damageZones: body.damageZones as any,
        deformationType: body.deformationType, airbagDeployed: body.airbagDeployed,
        tireCondition: body.tireCondition,
        ownerName: body.ownerName, ownerFiscalCode: body.ownerFiscalCode,
        ownerAddress: body.ownerAddress,
        towingRequired: body.towingRequired, towingCompany: body.towingCompany,
        towingAt: body.towingAt ? new Date(body.towingAt) : null,
        depositLocation: body.depositLocation, position: body.position,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT_ACCIDENT_VEHICLE_ERROR]", error)
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
    const vehicleId = url.searchParams.get("vehicleId")
    if (!vehicleId) return NextResponse.json({ error: "vehicleId required" }, { status: 400 })

    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (accident.status === "CHIUSO") return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })

    await prisma.accidentVehicle.delete({ where: { id: vehicleId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE_ACCIDENT_VEHICLE_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
