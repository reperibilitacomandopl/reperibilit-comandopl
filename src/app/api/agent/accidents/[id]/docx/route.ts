import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateAccidentDocx } from "@/utils/docx-generator"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenantId = session.user.tenantId

  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: {
        vehicles: { include: { occupants: true } },
        people: true,
        declarations: {
          include: {
            person: { select: { id: true, firstName: true, lastName: true, role: true } },
            recordedBy: { select: { id: true, name: true, matricola: true, qualifica: true } }
          }
        },
        reportingOfficer: { select: { id: true, name: true, matricola: true, qualifica: true } },
        secondOfficer: { select: { id: true, name: true, matricola: true, qualifica: true } },
        supervisor: { select: { id: true, name: true, matricola: true, qualifica: true } },
        tenant: { select: { name: true } }
      }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    const docxBuffer = await generateAccidentDocx({ accident, tenantName: accident.tenant?.name })

    return new NextResponse(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Sinistro_${accident.protocolNumber || accident.id}.docx"`
      }
    })
  } catch (error) {
    console.error("[GET_ACCIDENT_DOCX_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
