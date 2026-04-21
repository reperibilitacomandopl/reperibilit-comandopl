import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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
        select: { userId: true, type: true, repType: true, durationHours: true, overtimeHours: true }
      }),
      prisma.agendaEntry.findMany({
        where: { ...tf, date: { gte: startDate, lte: endDate } },
        select: { userId: true, code: true, hours: true }
      })
    ])

    const csvRows = [
      ["MATRICOLA", "NOME", "QUALIFICA", "ORE STRAORDINARI", "FERIE GODUTE", "REPERIBILITA", "ALTRE ASSENZE"]
    ]

    users.forEach(u => {
      const uShifts = shifts.filter(s => s.userId === u.id)
      const uAgenda = agenda.filter(a => a.userId === u.id)

      let overtime = 0
      let ferie = 0
      let reperibilita = 0
      let altre_assenze = 0

      // Calculate totals
      uShifts.forEach(s => {
        overtime += s.overtimeHours || 0
        if (s.repType && s.repType.toLowerCase().includes("rep")) reperibilita += 1
        if (s.type === "FERIE" || s.type === "FERIE_") ferie += 1
        if (s.type === "MALATT" || s.type === "MALATTIA") altre_assenze += 1
      })

      uAgenda.forEach(a => {
        if (a.code === "0015" || a.code === "0016") ferie += 1 // typical codes
        else if (a.code !== "ORE" && !a.code.includes("IND")) altre_assenze += 1 // simplified logic
      })

      csvRows.push([
        u.matricola,
        u.name,
        u.qualifica || "",
        overtime.toString(),
        ferie.toString(),
        reperibilita.toString(),
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
