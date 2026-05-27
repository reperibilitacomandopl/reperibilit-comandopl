import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentSurveySchema } from "@/lib/validations/accident"
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

    const surveys = await prisma.accidentSurvey.findMany({
      where: { accidentReportId: accidentId },
      include: {
        surveyedBy: {
          select: { id: true, name: true, matricola: true, qualifica: true }
        }
      },
      orderBy: { surveyedAt: 'desc' }
    })

    return NextResponse.json(surveys)
  } catch (error) {
    console.error("[GET_SURVEYS_ERROR]", error)
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
    const body = accidentSurveySchema.parse(json)

    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot add survey to a closed accident" }, { status: 400 })
    }

    const survey = await prisma.accidentSurvey.create({
      data: {
        accidentReportId: accidentId,
        roadType: body.roadType,
        roadName: body.roadName,
        roadWidth: body.roadWidth,
        laneCount: body.laneCount,
        speedLimit: body.speedLimit,
        slopeType: body.slopeType,
        slopePercent: body.slopePercent,
        impactZoneDesc: body.impactZoneDesc,
        impactMeasures: body.impactMeasures as any,
        skidMarksLength: body.skidMarksLength,
        debrisDescription: body.debrisDescription,
        signagePresent: body.signagePresent || [],
        signageDamaged: body.signageDamaged ?? false,
        roadMarkingsPresent: body.roadMarkingsPresent ?? false,
        trafficLightPresent: body.trafficLightPresent ?? false,
        trafficLightWorking: body.trafficLightWorking,
        guardRailDamaged: body.guardRailDamaged ?? false,
        publicLightingDamaged: body.publicLightingDamaged ?? false,
        otherDamages: body.otherDamages,
        surveyedByOfficerId: session.user.id,
        surveyedAt: new Date(),
      },
      include: {
        surveyedBy: {
          select: { id: true, name: true, matricola: true, qualifica: true }
        }
      }
    })

    await prisma.accidentAuditLog.create({
      data: {
        accidentReportId: accidentId,
        userId: session.user.id,
        action: "SURVEY_ADDED",
        details: "Rilievi tecnici aggiunti"
      }
    })

    return NextResponse.json(survey)
  } catch (error) {
    console.error("[POST_SURVEY_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
