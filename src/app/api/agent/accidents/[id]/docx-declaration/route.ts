import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generatePersonDeclarationDocx } from "@/utils/docx-generator"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const personId = searchParams.get("personId")

  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: {
        tenant: { select: { name: true } },
        declarations: {
          include: {
            recordedBy: { select: { id: true, name: true, matricola: true } }
          }
        },
      }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    const person = personId
      ? await prisma.accidentPerson.findFirst({ where: { id: personId, accidentReportId: accidentId } })
      : null

    if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 })

    const personDeclarations = accident.declarations.filter((d: any) => d.personId === person.id)

    const docxBuffer = await generatePersonDeclarationDocx({
      person,
      declarations: personDeclarations,
      accident,
      tenantName: accident.tenant?.name
    })

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Dichiarazioni_${person.firstName}_${person.lastName}_${accident.protocolNumber || accident.id}.docx"`
      }
    })
  } catch (error) {
    console.error("[GET_DECLARATION_DOCX_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
