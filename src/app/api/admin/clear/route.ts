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
    const { month, year } = body

    if (month === undefined || year === undefined) {
       return NextResponse.json({ error: "Mese e anno richiesti" }, { status: 400 })
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    // Elimina SOLO i turni di quel mese
    await prisma.shift.deleteMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate
        }
      }
    })
    
    // Aggiorna anche lo stato di pubblicazione per sicurezza (nascondilo)
    await prisma.monthStatus.upsert({
      where: { month_year: { month: month - 1, year } },
      update: { isPublished: false },
      create: { month: month - 1, year, isPublished: false }
    })

    await logAudit({
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "CLEAR_MONTH",
      details: `Cancellati tutti i turni per il periodo ${month}/${year}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
