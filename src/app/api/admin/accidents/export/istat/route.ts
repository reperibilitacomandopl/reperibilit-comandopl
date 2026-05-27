import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && !session.user.isUfficiale) {
    return NextResponse.json({ error: "Forbidden: solo ADMIN o Ufficiale" }, { status: 403 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "csv"
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  try {
    const whereClause: any = { tenantId }

    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) whereClause.date.gte = new Date(startDate)
      if (endDate) whereClause.date.lte = new Date(endDate)
    }

    const accidents = await prisma.accidentReport.findMany({
      where: whereClause,
      include: {
        reportingOfficer: { select: { name: true, matricola: true } },
        vehicles: {
          select: {
            licensePlate: true,
            vehicleType: true,
            brand: true,
            model: true,
            directionOfTravel: true,
            maneuver: true,
            isFugitive: true,
            insuranceCompany: true,
            insurancePolicy: true,
          }
        },
        people: {
          select: {
            role: true,
            firstName: true,
            lastName: true,
            fiscalCode: true,
            birthDate: true,
            nationality: true,
            injuries: true,
            injuriesDetail: true,
            injuryDescription: true,
            seatbeltUsed: true,
            alcoholTestDone: true,
            alcoholTestResult: true,
            drugTestDone: true,
            drugTestResult: true,
            licenseCategory: true,
            hospitalSentTo: true,
            transportedBy: true,
            isFugitive: true,
          }
        },
        surveys: true,
        externalUnits: true,
      },
      orderBy: { date: 'asc' }
    })

    if (format === "csv") {
      const headers = [
        "Protocollo", "Data", "Ora", "Indirizzo", "Lat", "Lng",
        "Gravità", "Tipo Strada", "Illuminazione", "Meteo", "Stato Strada",
        "Traffico", "Agente", "Matricola", "Stato",
        "N. Veicoli", "N. Persone", "Feriti", "Morti",
        "Veicoli Fuga", "Persone Fuga", "Alcol Positivi", "Drug Positivi",
        "VVF", "118", "PS", "CC", "GDF", "ANAS", "Altri Enti"
      ]

      const rows = accidents.map((a: any) => {
        const feriti = a.people.filter((p: any) => p.injuries && p.injuries !== "NESSUNA").length
        const morti = a.people.filter((p: any) => p.injuries === "DECEDUTO").length
        const veicoliFuga = a.vehicles.filter((v: any) => v.isFugitive).length
        const personeFuga = a.people.filter((p: any) => p.isFugitive).length
        const alcolPositivi = a.people.filter((p: any) => p.alcoholTestDone && p.alcoholTestResult && p.alcoholTestResult > 0).length
        const drugPositivi = a.people.filter((p: any) => p.drugTestDone && p.drugTestResult === "Positivo").length

        const unitCount = (type: string) => a.externalUnits.filter((u: any) => u.unitType === type).length

        return [
          a.protocolNumber,
          new Date(a.date).toISOString().split("T")[0],
          new Date(a.date).toISOString().split("T")[1]?.slice(0, 5) || "",
          `"${(a.address || "").replace(/"/g, '""')}"`,
          a.lat?.toString() || "",
          a.lng?.toString() || "",
          a.severity,
          a.roadType || "",
          a.lighting || "",
          a.weatherCondition || "",
          a.roadCondition || "",
          a.trafficCondition || "",
          a.reportingOfficer?.name || "",
          a.reportingOfficer?.matricola || "",
          a.status,
          a.vehicles.length.toString(),
          a.people.length.toString(),
          feriti.toString(),
          morti.toString(),
          veicoliFuga.toString(),
          personeFuga.toString(),
          alcolPositivi.toString(),
          drugPositivi.toString(),
          unitCount("VVF").toString(),
          unitCount("118").toString(),
          unitCount("POLIZIA_STATO").toString(),
          unitCount("CARABINIERI").toString(),
          unitCount("GDF").toString(),
          unitCount("ANAS").toString(),
          (a.externalUnits.length - unitCount("VVF") - unitCount("118") - unitCount("POLIZIA_STATO") - unitCount("CARABINIERI") - unitCount("GDF") - unitCount("ANAS")).toString(),
        ].join(",")
      })

      const csv = headers.join(",") + "\n" + rows.join("\n")

      await prisma.accidentReport.updateMany({
        where: { id: { in: accidents.map((a: any) => a.id) } },
        data: { istatExportedAt: new Date() }
      })

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=export-istat-completo-${new Date().toISOString().split("T")[0]}.csv`
        }
      })
    }

    return NextResponse.json(accidents)
  } catch (error) {
    console.error("[ADMIN_EXPORT_ISTAT_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
