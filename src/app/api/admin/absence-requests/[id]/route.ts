import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { status } = await req.json() // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 })
    }

    const request = await (prisma as any).agentRequest.findUnique({ where: { id: id } })
    if (!request) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "La richiesta è già stata processata" }, { status: 400 })
    }

    // Processa la transazione
    await prisma.$transaction(async (tx: any) => {
      // 1. Aggiorna lo stato della richiesta
      await tx.agentRequest.update({
        where: { id: id },
        data: { status, reviewedBy: session.user.name || "Admin" }
      })

      // 2. Se APPROVED, gestisci il calendario
      if (status === "APPROVED") {
        const start = new Date(request.date)
        start.setUTCHours(0,0,0,0)

        const end = request.endDate ? new Date(request.endDate) : new Date(request.date)
        end.setUTCHours(23,59,59,999)

        // a) Rimuovi tutti i turni in quel range per evitare doppioni
        await tx.shift.deleteMany({
          where: {
            userId: request.userId,
            date: { gte: start, lte: end }
          }
        })

        // b) Genera il blocco delle assenze
        const datesToInsert = []
        let currentIter = new Date(start)
        while (currentIter <= end) {
          datesToInsert.push(new Date(currentIter))
          currentIter.setUTCDate(currentIter.getUTCDate() + 1)
        }

        for (const targetDate of datesToInsert) {
           await tx.absence.upsert({
              where: { userId_date: { userId: request.userId, date: targetDate } },
              update: { code: request.code, source: "MANUAL" },
              create: { userId: request.userId, date: targetDate, code: request.code, source: "MANUAL" }
           })
           // Upsert a shift in that place to maintain calendar consistency with the code
           await tx.shift.upsert({
             where: { userId_date: { userId: request.userId, date: targetDate } },
             update: { type: request.code, repType: null, isSyncedToVerbatel: false, timeRange: null, serviceCategoryId: null, vehicleId: null, patrolGroupId: null },
             create: { userId: request.userId, date: targetDate, type: request.code }
           })
        }

        // c) Logga l'azione
        await tx.auditLog.create({
          data: {
            adminId: session.user.id || "SYS",
            adminName: session.user.name || "Sistema",
            action: "APPROVE_ABSENCE_REQUEST",
            targetId: request.userId,
            details: `Approvata assenza ${request.code} per range ${start.toISOString()} a ${end.toISOString()} (Ref Req: ${request.id})`
          }
        })
      }
    })

    return NextResponse.json({ success: true, message: `Richiesta ${status === 'APPROVED' ? 'Approvata' : 'Rifiutata'}` })

  } catch (error: any) {
    console.error("Error patching request:", error)
    return NextResponse.json({ error: "Errore durante il processamento." }, { status: 500 })
  }
}
