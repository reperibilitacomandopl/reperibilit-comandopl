import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { accidentDeclarationSchema } from "@/lib/validations/accident"
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

    const declarations = await prisma.accidentDeclaration.findMany({
      where: { accidentReportId: accidentId },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        recordedBy: {
          select: { id: true, name: true, matricola: true, qualifica: true }
        }
      },
      orderBy: { recordedAt: 'desc' }
    })

    return NextResponse.json(declarations)
  } catch (error) {
    console.error("[GET_DECLARATIONS_ERROR]", error)
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
    const body = accidentDeclarationSchema.parse(json)

    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    if (accident.status === "CHIUSO") {
      return NextResponse.json({ error: "Cannot add declarations to a closed accident" }, { status: 400 })
    }

    const person = await prisma.accidentPerson.findUnique({
      where: { id: body.personId }
    })

    if (!person || person.accidentReportId !== accidentId) {
      return NextResponse.json({ error: "Person not found in this accident" }, { status: 404 })
    }

    if (body.type === "S.I.T." && !body.legalWarningGiven) {
      return NextResponse.json({
        error: "S.I.T. requires legal warning (art. 64 C.p.p.) — legalWarningGiven must be true"
      }, { status: 400 })
    }

    const declaration = await prisma.accidentDeclaration.create({
      data: {
        accidentReportId: accidentId,
        personId: body.personId,
        type: body.type,
        content: body.content,
        recordedAt: new Date(),
        recordedByOfficerId: session.user.id,
        signedByPerson: body.signedByPerson,
        signatureImageUrl: body.signatureImageUrl,
        legalWarningGiven: body.legalWarningGiven,
        refused: body.refused,
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    })

    await prisma.accidentAuditLog.create({
      data: {
        accidentReportId: accidentId,
        userId: session.user.id,
        action: "DECLARATION_ADDED",
        details: `Dichiarazione tipo ${body.type} per ${person.firstName} ${person.lastName}`
      }
    })

    return NextResponse.json(declaration)
  } catch (error) {
    console.error("[POST_DECLARATION_ERROR]", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
