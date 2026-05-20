import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && (!session?.user?.canManageShifts && !session?.user?.canManageUsers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  try {
    const startDate = new Date(Date.UTC(year, 0, 1))
    const endDate = new Date(Date.UTC(year + 1, 0, 1))

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const shifts = await prisma.shift.findMany({
      where: {
        ...tf,
        date: { gte: startDate, lt: endDate },
      },
      select: {
        date: true,
        type: true,
        repType: true
      }
    })

    const agenda = await prisma.agendaEntry.findMany({
      where: {
        ...tf,
        date: { gte: startDate, lt: endDate },
      },
      select: {
        date: true,
        code: true
      }
    })

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString('it-IT', { month: 'short' }).toUpperCase(),
      turni: 0,
      assenze: 0,
      reperibilita: 0
    }))

    shifts.forEach((s: any) => {
      const monthIndex = new Date(s.date).getUTCMonth()
      const type = (s.type || "").toUpperCase()
      
      // Assenza check
      if (type.startsWith("(") || type === "R" || type === "RR") {
        monthlyData[monthIndex].assenze++
      } else {
        monthlyData[monthIndex].turni++
      }

      if (s.repType && s.repType.toLowerCase().includes("rep")) {
        monthlyData[monthIndex].reperibilita++
      }
    })

    agenda.forEach((a: any) => {
      const monthIndex = new Date(a.date).getUTCMonth()
      monthlyData[monthIndex].assenze++
    })

    return NextResponse.json({ yearlyData: monthlyData })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch yearly stats" }, { status: 500 })
  }
}
