import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createServiceReportSchema } from "@/lib/validations/service-report"
import { z } from "zod"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  try {
    const where: any = { tenantId, authorId: session.user.id }
    if (status) where.status = status

    const reports = await prisma.serviceReport.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, matricola: true } },
      },
      orderBy: { reportDate: "desc" },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error("[GET_AGENT_SERVICE_REPORTS_ERROR]", error)
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
    const body = createServiceReportSchema.parse(json)

    const report = await prisma.serviceReport.create({
      data: {
        tenantId,
        authorId: session.user.id,
        reportDate: new Date(body.reportDate),
        activities: body.activities,
        outcome: body.outcome || "",
        notes: body.notes || "",
        shiftId: body.shiftId || null,
        interventionIds: body.interventionIds || [],
        accidentReportIds: body.accidentReportIds || [],
        status: "BOZZA",
      },
      include: {
        author: { select: { id: true, name: true, matricola: true } },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error("[POST_AGENT_SERVICE_REPORTS_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
