import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "json"
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
        vehicles: {
          select: {
            licensePlate: true,
            vehicleType: true,
            brand: true,
            model: true,
            directionOfTravel: true,
            maneuver: true,
            isFugitive: true,
          }
        },
        people: {
          select: {
            role: true,
            firstName: true,
            lastName: true,
            fiscalCode: true,
            injuries: true,
            injuriesDetail: true,
            seatbeltUsed: true,
            alcoholTestDone: true,
            alcoholTestResult: true,
            drugTestDone: true,
            drugTestResult: true,
            licenseCategory: true,
            isFugitive: true,
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    if (format === "csv") {
      const headers = [
        "Protocollo", "Data", "Indirizzo", "Lat", "Lng", "Gravità",
        "Tipo Strada", "Illuminazione", "Meteo", "Stato Strada", "Traffico",
        "Numero Veicoli", "Numero Persone",
        "Feriti", "Morti", "Veicoli in Fuga", "Persone in Fuga",
        "Alcol Test+", "Drug Test+"
      ]

      const rows = accidents.map((a: any) => {
        const feriti = a.people.filter((p: any) => p.injuries !== "NESSUNA" && p.injuries).length
        const morti = a.people.filter((p: any) => p.injuries === "DECEDUTO").length
        const veicoliFuga = a.vehicles.filter((v: any) => v.isFugitive).length
        const personeFuga = a.people.filter((p: any) => p.isFugitive).length
        const alcolPositivi = a.people.filter((p: any) => p.alcoholTestDone && p.alcoholTestResult && p.alcoholTestResult > 0).length
        const drugPositivi = a.people.filter((p: any) => p.drugTestDone && p.drugTestResult === "Positivo").length

        return [
          a.protocolNumber,
          new Date(a.date).toISOString().split("T")[0],
          `"${(a.address || "").replace(/"/g, '""')}"`,
          a.lat?.toString() || "",
          a.lng?.toString() || "",
          a.severity,
          a.roadType || "",
          a.lighting || "",
          a.weatherCondition || "",
          a.roadCondition || "",
          a.trafficCondition || "",
          a.vehicles.length.toString(),
          a.people.length.toString(),
          feriti.toString(),
          morti.toString(),
          veicoliFuga.toString(),
          personeFuga.toString(),
          alcolPositivi.toString(),
          drugPositivi.toString(),
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
          "Content-Disposition": `attachment; filename=export-istat-${new Date().toISOString().split("T")[0]}.csv`
        }
      })
    }

    return NextResponse.json(accidents)
  } catch (error) {
    console.error("[EXPORT_ISTAT_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
