import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request) {
  const session = await auth()
  
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Accesso Non Autorizzato" }, { status: 401 })
  }

  try {
    const { userId, date, clocks } = await req.json()
    // date is "YYYY-MM-DD"
    // clocks: array of { id?, type: "IN"|"OUT", timestamp: string, isManual: boolean }

    if (!userId || !date) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    const tenantId = session.user.tenantId
    const targetDate = new Date(date)
    const nextDate = new Date(targetDate)
    nextDate.setDate(nextDate.getDate() + 1)

    // Eseguiamo in transazione
    await prisma.$transaction(async (tx: typeof prisma) => {
      // 1. Troviamo tutte le timbrature esistenti per quell'utente in quella data
      const existing = await tx.clockRecord.findMany({
        where: {
          userId,
          tenantId,
          timestamp: { gte: targetDate, lt: nextDate }
        }
      })

      const existingIds = existing.map((c: { id: string }) => c.id)
      const newIds = clocks.filter((c: any) => c.id).map((c: any) => c.id)

      // 2. Cancelliamo quelle che non sono più nell'array
      const idsToDelete = existingIds.filter((id: string) => !newIds.includes(id))
      if (idsToDelete.length > 0) {
        await tx.clockRecord.deleteMany({
          where: { id: { in: idsToDelete } }
        })
      }

      // 3. Aggiorniamo o creiamo le nuove
      for (const clock of clocks) {
        if (clock.id && existingIds.includes(clock.id)) {
          // Update
          await tx.clockRecord.update({
            where: { id: clock.id },
            data: {
              type: clock.type,
              timestamp: new Date(clock.timestamp),
              isManual: clock.isManual
            }
          })
        } else {
          // Create
          await tx.clockRecord.create({
            data: {
              userId,
              tenantId,
              type: clock.type,
              timestamp: new Date(clock.timestamp),
              isManual: true, // Se è creata da admin, è sempre manuale
              isVerified: true
            }
          })
        }
      }
      // 4. Log the action
      if (clocks.length > 0 || idsToDelete.length > 0) {
        await tx.auditLog.create({
          data: {
            tenantId,
            adminId: session.user.id,
            adminName: session.user.name,
            action: "UPDATE_CLOCK_RECORDS",
            targetId: userId,
            targetName: "Timbrature",
            details: `Timbrature modificate manualmente per il giorno ${date}. Aggiunte/Modificate: ${clocks.length}, Eliminate: ${idsToDelete.length}`
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[CLOCK_RECORDS_PUT_ERROR]", error)
    return NextResponse.json({ error: "Errore salvataggio timbrature" }, { status: 500 })
  }
}
