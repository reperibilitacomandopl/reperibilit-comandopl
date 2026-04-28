import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1 + "")
  const year = parseInt(searchParams.get("year") || new Date().getFullYear() + "")
  const tenantId = session.user.tenantId
  const tf = tenantId ? { tenantId } : {}

  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    const [users, shifts, agenda] = await Promise.all([
      prisma.user.findMany({
        where: { role: "AGENTE", ...tf },
        select: { id: true, name: true, matricola: true, qualifica: true }
      }),
      prisma.shift.findMany({
        where: { ...tf, date: { gte: startDate, lte: endDate } },
        select: { userId: true, date: true, type: true, repType: true, durationHours: true, overtimeHours: true }
      }),
      prisma.agendaEntry.findMany({
        where: { ...tf, date: { gte: startDate, lte: endDate } },
        select: { userId: true, code: true, hours: true }
      })
    ])

    const csvRows = [
      ["MATRICOLA", "NOME", "QUALIFICA", "ORE STRAORDINARI", "BUONI PASTO", "TURNI_TOTALI", "TURNI_NOTTE", "REP_FEST", "REP_FER", "FERIE", "MALATTIA/ASSENZE"]
    ]

    users.forEach((u: any) => {
      const uShifts = shifts.filter((s: any) => s.userId === u.id)
      const uAgenda = agenda.filter((a: any) => a.userId === u.id)

      let overtime = 0
      let ferie = 0
      let repFest = 0
      let repFer = 0
      let altre_assenze = 0
      let buoni_pasto = 0
      let turni_notte = 0
      let turni_totali = 0

      // Calculate totals
      uShifts.forEach((s: any) => {
        const type = (s.type || "").toUpperCase();
        const isWorking = /^[MPN]\d/.test(type);

        if (isWorking) {
          turni_totali += 1;
          if (type.startsWith("N")) turni_notte += 1;
          if ((s.durationHours || 6) >= 6) buoni_pasto += 1;
        }

        overtime += s.overtimeHours || 0
        if (s.repType && s.repType.toLowerCase().includes("rep")) {
          const shiftDate = new Date(s.date)
          if (isHoliday(shiftDate)) {
            repFest += 1
          } else {
            repFer += 1
          }
        }
        if (type === "FERIE" || type === "FERIE_") ferie += 1
        if (type === "MALATT" || type === "MALATTIA") altre_assenze += 1
      })

      uAgenda.forEach((a: any) => {
        if (a.code === "0015" || a.code === "0016") ferie += 1
        else if (["MAL", "VIS", "PER", "L104"].some(k => a.code.includes(k))) altre_assenze += 1
      })

      csvRows.push([
        u.matricola,
        u.name,
        u.qualifica || "",
        overtime.toFixed(1),
        buoni_pasto.toString(),
        turni_totali.toString(),
        turni_notte.toString(),
        repFest.toString(),
        repFer.toString(),
        ferie.toString(),
        altre_assenze.toString()
      ])
    })

    const csvContent = csvRows.map(e => e.join(";")).join("\n")

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Export_Paghe_${year}_${month < 10 ? '0'+month : month}.csv"`
      }
    })
  } catch (error) {
    console.error("[MONTHLY EXPORT ERR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
