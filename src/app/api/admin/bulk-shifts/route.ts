import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, startDate, endDate, type } = await req.json()

    if (!userId || !startDate || !endDate || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Assicuriamoci che navighino a mezzanotte esatta UTC per coerenza
    start.setUTCHours(0, 0, 0, 0)
    end.setUTCHours(0, 0, 0, 0)

    if (end < start) {
      return NextResponse.json({ error: "End date before start date" }, { status: 400 })
    }

    // Genera array di date
    const dateArray: Date[] = []
    let currentDate = new Date(start)
    while (currentDate <= end) {
      dateArray.push(new Date(currentDate))
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    // Eseguiamo un batch per cancellare eventuali turni esistenti su quei giorni e inserire la nuova assenza
    await prisma.$transaction(async (tx) => {
      // 1. Eliminiamo i turni esistenti per le date selezionate
      await tx.shift.deleteMany({
        where: {
          userId,
          date: { in: dateArray }
        }
      })

      // 2. Creiamo i nuovi record con la causale (type)
      const dataToInsert = dateArray.map(date => ({
        userId,
        date,
        type: type, // Es. "FERIE", "MALATTIA", "104"
        repType: null // Puliamo la reperibilità perché è un'assenza
      }))

      await tx.shift.createMany({
        data: dataToInsert
      })
      
      // 3. Log dell'operazione
      await tx.auditLog.create({
        data: {
          adminId: session.user.id,
          adminName: session.user.name || "Sistema",
          action: "BULK_ABSENCE",
          targetId: userId,
          details: `Inserita assenza ${type} per ${userId} dal ${startDate} al ${endDate}`,
        }
      })
    })

    return NextResponse.json({ success: true, insertedDays: dateArray.length })
  } catch (error: any) {
    console.error("Bulk shift error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
