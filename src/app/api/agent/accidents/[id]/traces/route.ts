import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentTraceSchema } from "@/lib/validations/accident"
import { z } from "zod"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const traces = await prisma.accidentTrace.findMany({
      where: { accidentReportId: accidentId },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(traces)
  } catch (error) {
    console.error("[GET_ACCIDENT_TRACES_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({ where: { id: accidentId } })
    if (!accident || accident.tenantId !== tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot modify closed accident" }, { status: 400 })
    }

    const json = await req.json()
    const body = accidentTraceSchema.parse(json)

    const trace = await prisma.accidentTrace.create({
      data: {
        accidentReportId: accidentId,
        code: body.code,
        type: body.type,
        photoUrl: body.photoUrl || null,
        position: body.position || null,
        measurement: body.measurement || null,
        dimensions: body.dimensions || null,
        description: body.description || null,
        operatorId: session.user.id,
      },
    })

    return NextResponse.json(trace)
  } catch (error) {
    console.error("[POST_ACCIDENT_TRACE_ERROR]", error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
