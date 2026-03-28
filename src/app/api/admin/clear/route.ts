import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { month, year, type = "all" } = body // type: "all", "base", "rep"

    if (month === undefined || year === undefined) {
       return NextResponse.json({ error: "Mese e anno richiesti" }, { status: 400 })
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    const commonWhere = {
      date: { gte: startDate, lt: endDate }
    }

    if (type === "base") {
      // Pulisci solo il turno base
      await prisma.shift.updateMany({
        where: commonWhere,
        data: { type: "" }
      })
    } else if (type === "rep") {
      // Pulisci solo la reperibilità
      await prisma.shift.updateMany({
        where: commonWhere,
        data: { repType: null }
      })
    } else {
      // Cancella tutto
      await prisma.shift.deleteMany({
        where: commonWhere
      })
    }

    // Cleanup: elimina record che non hanno né turno né reperibilità
    if (type !== "all") {
      await prisma.shift.deleteMany({
        where: {
          ...commonWhere,
          type: "",
          repType: null
        }
      })
    }
    
    // Aggiorna anche lo stato di pubblicazione se stiamo cancellando "tutto"
    if (type === "all") {
      await prisma.monthStatus.upsert({
        where: { month_year: { month: month - 1, year } },
        update: { isPublished: false },
        create: { month: month - 1, year, isPublished: false }
      })
    }

    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "CLEAR_MONTH",
      details: `Cancellazione periodica per ${month}/${year}. Modalità: ${type}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
