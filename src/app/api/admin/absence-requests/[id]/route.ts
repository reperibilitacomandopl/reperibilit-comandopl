// @ts-nocheck
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getShortCode } from '@/utils/agenda-codes'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  const tenantId = session.user.tenantId

  try {
    const { status } = await req.json() // APPROVED or REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 })
    }

    const request = await prisma.agentRequest.findUnique({ 
      where: { id, tenantId: tenantId || null } 
    })
    if (!request) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "La richiesta è già stata processata" }, { status: 400 })
    }

    // ⭐ TRADUZIONE CODICE: Verbatel → shortCode per il calendario
    // Es: "0015" diventa "FERIE", "0031" diventa "104"
    const calendarCode = getShortCode(request.code)

    // Processa la transazione
    await prisma.$transaction(async (tx: any) => {
      // 1. Aggiorna lo stato della richiesta
      await tx.agentRequest.update({
        where: { id },
        data: { status, reviewedBy: session.user.name || "Admin" }
      })

      // 2. Se APPROVED, gestisci il calendario
      if (status === "APPROVED") {
        const start = new Date(request.date)
        start.setUTCHours(0,0,0,0)

        const end = request.endDate ? new Date(request.endDate) : new Date(request.date)
        end.setUTCHours(0,0,0,0) // allinea a mezzanotte, non 23:59

        // a) Rimuovi tutti i turni in quel range per evitare doppioni
        await tx.shift.deleteMany({
          where: {
            tenantId: tenantId || null,
            userId: request.userId,
            date: { gte: start, lte: end }
          }
        })

        // b) Genera il blocco delle assenze giorno per giorno
        const datesToInsert: Date[] = []
        const currentIter = new Date(start)
        while (currentIter <= end) {
          datesToInsert.push(new Date(currentIter))
          currentIter.setUTCDate(currentIter.getUTCDate() + 1)
        }

        for (const targetDate of datesToInsert) {
           // Scrive lo shortCode (es. "FERIE") in entrambe le tabelle
           await tx.absence.upsert({
              where: { userId_date_tenantId: { userId: request.userId, date: targetDate, tenantId: tenantId || "" } },
              update: { code: calendarCode, source: "MANUAL" },
              create: { tenantId: tenantId || null, userId: request.userId, date: targetDate, code: calendarCode, source: "MANUAL" }
           })
           await tx.shift.upsert({
             where: { userId_date_tenantId: { userId: request.userId, date: targetDate, tenantId: tenantId || "" } },
             update: { type: calendarCode, repType: null, isSyncedToVerbatel: false, timeRange: null, serviceCategoryId: null, vehicleId: null, patrolGroupId: null },
             create: { tenantId: tenantId || null, userId: request.userId, date: targetDate, type: calendarCode }
           })
        }

        // c) Logga l'azione
        await tx.auditLog.create({
          data: {
            tenantId: tenantId || null,
            adminId: session.user.id || "SYS",
            adminName: session.user.name || "Sistema",
            action: "APPROVE_ABSENCE_REQUEST",
            targetId: request.userId,
            details: `Approvata assenza ${calendarCode} (orig: ${request.code}) dal ${start.toISOString().split('T')[0]} al ${end.toISOString().split('T')[0]} (Ref: ${request.id})`
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
