import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { status: requestedAction } = await req.json() // "ACCEPTED" or "REJECTED"
    const isAdmin = session.user.role === "ADMIN" || session.user.canManageShifts === true
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Nessun comando attivo" }, { status: 400 })

    const swapRequest = await prisma.vacationSwapRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        targetUser: true,
        vacationPlan: true,
        targetVacationPlan: true
      }
    })

    if (!swapRequest) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    // --- LOGICA RIFIUTO ---
    if (requestedAction === "REJECTED") {
      if (swapRequest.targetUserId !== session.user.id && !isAdmin) {
        return NextResponse.json({ error: "Non autorizzato a rifiutare questa richiesta" }, { status: 403 })
      }

      await prisma.vacationSwapRequest.update({
        where: { id },
        data: { status: "REJECTED" }
      })

      // Invia notifica al richiedente
      await (prisma as any).notification.create({
        data: {
          tenantId,
          userId: swapRequest.requesterId,
          title: "Scambio Ferie Rifiutato ❌",
          message: `${session.user.name} ha rifiutato la tua proposta di scambio ferie.`,
          type: "ALERT",
          link: "/?view=agent"
        }
      })

      return NextResponse.json({ success: true, status: "REJECTED" })
    }

    // --- LOGICA ACCETTAZIONE ---
    if (requestedAction === "ACCEPTED") {
      
      // CASO A: L'Agente destinatario accetta la proposta
      if (swapRequest.targetUserId === session.user.id && swapRequest.status === "PENDING") {
        await prisma.vacationSwapRequest.update({
          where: { id },
          data: { status: "ACCEPTED" }
        })

        // Notifica agli Admin e alla Segreteria per l'approvazione finale
        const staff = await prisma.user.findMany({
          where: {
            tenantId,
            OR: [
              { role: "ADMIN" },
              { canManageShifts: true }
            ]
          },
          select: { id: true }
        })

        if (staff.length > 0) {
          await (prisma as any).notification.createMany({
            data: staff.map((s: any) => ({
              tenantId,
              userId: s.id,
              title: "Approvazione Scambio Ferie Richiesta ✍️",
              message: `${swapRequest.requester.name} e ${swapRequest.targetUser?.name} hanno concordato uno scambio ferie. Richiesto OK finale.`,
              type: "REQUEST",
              metadata: JSON.stringify({ vacationSwapId: id }),
              link: "/admin/bacheca-scambi"
            }))
          })
        }

        // Notifica al richiedente
        await (prisma as any).notification.create({
          data: {
            tenantId,
            userId: swapRequest.requesterId,
            title: "Scambio Ferie Accettato dal Collega ⏳",
            message: `${session.user.name} ha accettato lo scambio. La proposta è ora in attesa di approvazione dal Comandante.`,
            type: "INFO",
            link: "/?view=agent"
          }
        })

        return NextResponse.json({ success: true, status: "WAITING_ADMIN" })
      }

      // CASO B: Il Comandante / Segreteria dà l'approvazione finale (VISTO FINALE)
      if (isAdmin && swapRequest.status === "ACCEPTED") {
        const planA = swapRequest.vacationPlan
        const planB = swapRequest.targetVacationPlan

        if (!planA || !planB) {
          return NextResponse.json({ error: "Piani ferie associati non trovati" }, { status: 400 })
        }

        const startA = new Date(planA.startDate)
        const endA = new Date(planA.endDate)
        const startB = new Date(planB.startDate)
        const endB = new Date(planB.endDate)

        // Eseguiamo l'inversione transazionale di VacationPlan e dei relativi Shift giornalieri
        await prisma.$transaction(async (tx: any) => {
          
          // 1. Aggiorna i due record VacationPlan scambiando le date e aggiornando le note
          await tx.vacationPlan.update({
            where: { id: planA.id },
            data: {
              startDate: startB,
              endDate: endB,
              notes: `Ferie scambiate con ${swapRequest.targetUser?.name} (Visto del Comando)`
            }
          })

          await tx.vacationPlan.update({
            where: { id: planB.id },
            data: {
              startDate: startA,
              endDate: endA,
              notes: `Ferie scambiate con ${swapRequest.requester.name} (Visto del Comando)`
            }
          })

          // 2. Elimina i vecchi turni giornalieri di tipo "FERIE" per entrambi i periodi
          // Periodo A
          const startUTC_A = new Date(Date.UTC(startA.getFullYear(), startA.getMonth(), startA.getDate()))
          const endUTC_A = new Date(Date.UTC(endA.getFullYear(), endA.getMonth(), endA.getDate(), 23, 59, 59))
          
          await tx.shift.deleteMany({
            where: {
              tenantId,
              userId: swapRequest.requesterId,
              type: "FERIE",
              date: { gte: startUTC_A, lte: endUTC_A }
            }
          })

          // Periodo B
          const startUTC_B = new Date(Date.UTC(startB.getFullYear(), startB.getMonth(), startB.getDate()))
          const endUTC_B = new Date(Date.UTC(endB.getFullYear(), endB.getMonth(), endB.getDate(), 23, 59, 59))

          await tx.shift.deleteMany({
            where: {
              tenantId,
              userId: swapRequest.targetUserId!,
              type: "FERIE",
              date: { gte: startUTC_B, lte: endUTC_B }
            }
          })

          // 3. Genera i nuovi turni di tipo "FERIE" incrociati
          const protectedTypes = ["MALATTIA", "MAL", "MALATT", "104", "CONGEDO", "ASPETTATIVA"]

          // Genera Ferie per Richiedente nel Periodo B
          let loopDateB = new Date(startUTC_B)
          while (loopDateB <= endUTC_B) {
            const currentDate = new Date(loopDateB)
            const existingShift = await tx.shift.findFirst({
              where: { tenantId, userId: swapRequest.requesterId, date: currentDate }
            })

            if (existingShift) {
              if (!protectedTypes.includes(existingShift.type)) {
                await tx.shift.update({
                  where: { id: existingShift.id },
                  data: { type: "FERIE" }
                })
              }
            } else {
              await tx.shift.create({
                data: {
                  tenantId,
                  userId: swapRequest.requesterId,
                  date: currentDate,
                  type: "FERIE"
                }
              })
            }
            loopDateB.setUTCDate(loopDateB.getUTCDate() + 1)
          }

          // Genera Ferie per Collega target nel Periodo A
          let loopDateA = new Date(startUTC_A)
          while (loopDateA <= endUTC_A) {
            const currentDate = new Date(loopDateA)
            const existingShift = await tx.shift.findFirst({
              where: { tenantId, userId: swapRequest.targetUserId!, date: currentDate }
            })

            if (existingShift) {
              if (!protectedTypes.includes(existingShift.type)) {
                await tx.shift.update({
                  where: { id: existingShift.id },
                  data: { type: "FERIE" }
                })
              }
            } else {
              await tx.shift.create({
                data: {
                  tenantId,
                  userId: swapRequest.targetUserId!,
                  date: currentDate,
                  type: "FERIE"
                }
              })
            }
            loopDateA.setUTCDate(loopDateA.getUTCDate() + 1)
          }

          // 4. Aggiorna lo stato della richiesta su COMPLETED
          await tx.vacationSwapRequest.update({
            where: { id },
            data: { status: "COMPLETED" }
          })
        })

        // 5. Invia notifiche di successo finali
        const participants = [swapRequest.requesterId, swapRequest.targetUserId!]
        await (prisma as any).notification.createMany({
          data: participants.map(uid => ({
            tenantId,
            userId: uid,
            title: "Scambio Ferie Confermato dal Comando! 🏆",
            message: `L'amministratore ${session.user.name} ha confermato ufficialmente lo scambio del periodo di ferie concordato.`,
            type: "SUCCESS",
            link: "/?view=agent"
          }))
        })

        // Invia Telegram ad entrambi gli agenti
        for (const user of [swapRequest.requester, swapRequest.targetUser]) {
          if (user?.telegramChatId && user?.telegramOptIn) {
            try {
              const { sendTelegramMessage } = await import("@/lib/telegram")
              await sendTelegramMessage(
                user.telegramChatId,
                `<b>SCAMBIO FERIE CONFERMATO!</b>\n\nCiao ${user.name.split(" ")[0]},\nil visto del Comando è stato inserito con successo. Il tuo nuovo piano ferie è ora attivo nel sistema. 👮‍♂️✈️`
              )
            } catch (err) {
              console.error("[TELEGRAM_NOTIFY_ERROR]", err)
            }
          }
        }

        return NextResponse.json({ success: true, status: "COMPLETED" })
      }

      return NextResponse.json({ error: "Non autorizzato o stato non compatibile" }, { status: 403 })
    }

    return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 })
  } catch (err) {
    console.error("[VACATION_SWAP_PATCH]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
