import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as xlsx from "xlsx"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && (!session?.user?.canManageShifts && !session?.user?.canManageUsers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || "")
  const year = parseInt(searchParams.get("year") || "")

  if (!month || !year) return NextResponse.json({ error: "Mese e anno richiesti" }, { status: 400 })

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    // 1. Fetch Agents
    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", ...tf },
      select: { id: true, name: true, matricola: true, qualifica: true },
      orderBy: { name: "asc" }
    })

    // 2. Fetch Shifts for the month
    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    const shifts = await prisma.shift.findMany({
      where: { date: { gte: startDate, lt: endDate }, ...tf },
      select: { userId: true, type: true, durationHours: true, overtimeHours: true, date: true }
    })

    // 3. Process Data into Payroll Rows
    const payrollData = agents.map(agent => {
      const agentShifts = shifts.filter(s => s.userId === agent.id)
      
      // Calcolo metriche
      const totalNotti = agentShifts.filter(s => s.type?.includes("N8") || s.type?.includes("NOTTE")).length
      const totalFestivi = agentShifts.filter(s => s.date.getDay() === 0).length // Semplificazione: conta domeniche
      const totalStraordinari = agentShifts.reduce((acc, curr) => acc + (curr.overtimeHours || 0), 0)
      const presenzeTotali = agentShifts.filter(s => s.type && s.type !== "R").length // Turni lavorati non riposo

      return {
        Matricola: agent.matricola,
        "Nome Agente": agent.name,
        Qualifica: agent.qualifica || "Agente",
        "Giorni Presenza": presenzeTotali,
        "Turni Notturni (Indennità)": totalNotti,
        "Turni Festivi (Indennità)": totalFestivi,
        "Straordinari (Ore Maturate)": totalStraordinari,
      }
    })

    // 4. Generate Excel Buffer
    const worksheet = xlsx.utils.json_to_sheet(payrollData)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, `Paghe_${month}_${year}`)

    // Formattazione larghezza colonne
    worksheet["!cols"] = [
      { wch: 10 }, // Matricola
      { wch: 30 }, // Nome
      { wch: 20 }, // Qualifica
      { wch: 15 }, // Presenze
      { wch: 25 }, // Notti
      { wch: 25 }, // Festivi
      { wch: 25 }, // Straordinari
    ]

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Export_Ragioneria_${month}_${year}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }
    })

  } catch (error) {
    console.error("[PAYROLL EXPORT ERROR]", error)
    return NextResponse.json({ error: "Errore durante l'esportazione" }, { status: 500 })
  }
}
