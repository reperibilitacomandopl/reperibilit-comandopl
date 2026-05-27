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

    if (accident.status !== "BOZZA" && accident.status !== "IN_COMPILAZIONE") {
      return NextResponse.json({ error: "Cannot modify submitted accident" }, { status: 400 })
    }

    const json = await req.json()
    const body = accidentVehicleSchema.parse(json)

    const vehicle = await prisma.accidentVehicle.create({
      data: {
        accidentReportId: accidentId,
        licensePlate: body.licensePlate,
        vehicleType: body.vehicleType,
        vin: body.vin || null,
        directionOfTravel: body.directionOfTravel || null,
        maneuver: body.maneuver || null,
        isFugitive: body.isFugitive || false,
        insuranceCompany: body.insuranceCompany || null,
        insurancePolicy: body.insurancePolicy || null,
        revisionDate: body.revisionDate || null,
        damageDescription: body.damageDescription || null,
        damageAreas: body.damageAreas || [],
        deformationType: body.deformationType || null,
        airbagDeployed: body.airbagDeployed ?? null,
        tireCondition: body.tireCondition || null,
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
