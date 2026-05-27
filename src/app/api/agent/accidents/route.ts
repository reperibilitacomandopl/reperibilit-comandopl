import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createAccidentSchema } from "@/lib/validations/accident"
import { z } from "zod"

export async function GET(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const interventionId = searchParams.get('interventionId')
  
  try {
    const whereClause: any = {
      tenantId,
      reportingOfficerId: session.user.id
    }

    if (interventionId) {
      whereClause.interventionId = interventionId
    }

    const accidents = await prisma.accidentReport.findMany({
      where: whereClause,
      include: {
        vehicles: true,
        people: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(accidents)
  } catch (error) {
    console.error("[GET_AGENT_ACCIDENTS_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const json = await req.json()
    const body = createAccidentSchema.parse(json)

    // Generate Protocol Number (e.g. SIN-2026-0001)
    const year = new Date().getFullYear()
    const count = await prisma.accidentReport.count({
      where: {
        tenantId,
        date: {
          gte: new Date(`${year}-01-01T00:00:00Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00Z`)
        }
      }
    })
    const protocolNumber = `SIN-${year}-${String(count + 1).padStart(4, '0')}`

    const status = "BOZZA"

    const accident = await prisma.accidentReport.create({
      data: {
        tenantId,
        protocolNumber,
        date: new Date(body.date),
        address: body.address,
        lat: body.lat,
        lng: body.lng,
        severity: body.severity,
        eventType: body.eventType,
        roadType: body.roadType,
        roadGeometry: body.roadGeometry,
        roadSignage: body.roadSignage,
        lanesNumber: body.lanesNumber,
        speedLimit: body.speedLimit,
        trafficLight: body.trafficLight,
        lighting: body.lighting,
        weatherCondition: body.weatherCondition,
        roadCondition: body.roadCondition,
        trafficCondition: body.trafficCondition,
        safetyChecklist: body.safetyChecklist || [],
        dynamicDescription: body.dynamicDescription,
        narrativeReport: body.narrativeReport,
        interventionId: body.interventionId,
        reportingOfficerId: session.user.id,
        status,
        vehicles: {
          create: body.vehicles?.map(v => ({
            licensePlate: v.licensePlate,
            vehicleType: v.vehicleType,
            vin: v.vin,
            directionOfTravel: v.directionOfTravel,
            maneuver: v.maneuver,
            isFugitive: v.isFugitive || false,
            insuranceCompany: v.insuranceCompany,
            insurancePolicy: v.insurancePolicy,
            revisionDate: v.revisionDate,
            damageDescription: v.damageDescription,
            damageAreas: v.damageAreas || [],
            deformationType: v.deformationType,
            airbagDeployed: v.airbagDeployed,
            tireCondition: v.tireCondition
          })) || []
        }
      },
      include: {
        vehicles: true
      }
    })

    // Create people and link them to vehicles if vehicleIndex is provided
    if (body.people && body.people.length > 0) {
      for (const person of body.people) {
        let vehicleId = null
        if (person.vehicleIndex != null && person.vehicleIndex >= 0 && accident.vehicles[person.vehicleIndex]) {
          vehicleId = accident.vehicles[person.vehicleIndex].id
        }

        await prisma.accidentPerson.create({
          data: {
            accidentReportId: accident.id,
            accidentVehicleId: vehicleId,
            role: person.role,
            firstName: person.firstName,
            lastName: person.lastName,
            fiscalCode: person.fiscalCode,
            documentType: person.documentType,
            licenseCategory: person.licenseCategory,
            seatbeltUsed: person.seatbeltUsed,
            isFugitive: person.isFugitive || false,
            injuries: person.injuries,
            injuriesDetail: person.injuriesDetail,
            alcoholTest: person.alcoholTest,
            drugTest: person.drugTest,
            statement: person.statement,
            contactPhone: person.contactPhone,
            email: person.email,
          }
        })
      }
    }

    const fullAccident = await prisma.accidentReport.findUnique({
      where: { id: accident.id },
      include: { vehicles: true, people: true }
    })

    return NextResponse.json(fullAccident)
  } catch (error) {
    console.error("[POST_AGENT_ACCIDENTS_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
