import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateAccidentReportPDF } from "@/utils/pdf-accident-generator"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params;
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  
  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: {
        vehicles: { include: { occupants: true } },
        people: true,
        reportingOfficer: { select: { name: true } },
        tenant: { select: { name: true } }
      }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    // Agent can only download if they created it, Admins/Ufficiali can download any
    const isOwner = accident.reportingOfficerId === session.user.id
    const isAdminOrUfficiale = session.user.role === "ADMIN" || session.user.isUfficiale

    if (!isOwner && !isAdminOrUfficiale) {
      return NextResponse.json({ error: "Non sei autorizzato a scaricare questo fascicolo" }, { status: 403 })
    }

    const pdfBuffer = await generateAccidentReportPDF({
      accident,
      tenantName: accident.tenant?.name
    })

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Sinistro_${accident.protocolNumber || accident.id}.pdf"`
      }
    })

  } catch (error) {
    console.error("[GET_ACCIDENT_PDF_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
