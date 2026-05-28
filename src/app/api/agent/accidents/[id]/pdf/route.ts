import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateAccidentReportPDF, generatePersonSchedaPDF, generateVehicleSchedaPDF } from "@/utils/pdf-accident-generator"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id: accidentId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const entity = searchParams.get("entity")
  const entityId = searchParams.get("entityId")

  try {
    const accident = await prisma.accidentReport.findUnique({
      where: { id: accidentId },
      include: {
        vehicles: { include: { occupants: true } },
        people: true,
        traces: true,
        forensicPhotos: true,
        declarations: {
          include: {
            person: { select: { id: true, firstName: true, lastName: true, role: true } },
            recordedBy: { select: { id: true, name: true, matricola: true, qualifica: true } }
          }
        },
        surveys: {
          include: {
            surveyedBy: { select: { id: true, name: true, matricola: true, qualifica: true } }
          }
        },
        externalUnits: true,
        reportingOfficer: { select: { id: true, name: true, matricola: true, qualifica: true } },
        secondOfficer: { select: { id: true, name: true, matricola: true, qualifica: true } },
        supervisor: { select: { id: true, name: true, matricola: true, qualifica: true } },
        tenant: { select: { name: true } }
      }
    })

    if (!accident || accident.tenantId !== tenantId) {
      return NextResponse.json({ error: "Accident not found" }, { status: 404 })
    }

    let pdfBuffer: ArrayBuffer
    let filename: string

    if (entity === "person" && entityId) {
      const person = accident.people.find((p: any) => p.id === entityId)
      if (!person) return NextResponse.json({ error: "Person not found" }, { status: 404 })
      pdfBuffer = await generatePersonSchedaPDF({
        person,
        accident,
        tenantName: accident.tenant?.name
      })
      filename = `Scheda_${person.firstName}_${person.lastName}_${accident.protocolNumber}.pdf`
    } else if (entity === "vehicle" && entityId) {
      const vehicle = accident.vehicles.find((v: any) => v.id === entityId)
      if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
      pdfBuffer = await generateVehicleSchedaPDF({
        vehicle,
        accident,
        tenantName: accident.tenant?.name
      })
      filename = `Scheda_Veicolo_${vehicle.licensePlate}_${accident.protocolNumber}.pdf`
    } else {
      pdfBuffer = await generateAccidentReportPDF({
        accident,
        tenantName: accident.tenant?.name
      })
      filename = `Sinistro_${accident.protocolNumber || accident.id}.pdf`
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error("[GET_ACCIDENT_PDF_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
