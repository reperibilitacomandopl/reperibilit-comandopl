import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { status } = await req.json() // ACCEPTED or REJECTED

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Stato non valido" }, { status: 400 })
    }

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: { 
        shift: true,
        requester: true,
        targetUser: true
      }
    })

    const isAdmin = session.user.role === "ADMIN"

    if (!swapRequest || (swapRequest.targetUserId !== session.user.id && !isAdmin)) {
       return NextResponse.json({ error: "Richiesta non trovata o non autorizzato" }, { status: 403 })
    }

    if (swapRequest.status !== "PENDING") {
       return NextResponse.json({ error: "Questa proposta è già stata gestita" }, { status: 400 })
    }

    // Se viene accettata, eseguiamo direttamente la CESSIONE del turno (handover)
    if (status === "ACCEPTED") {
      const originalShift = swapRequest.shift;
      const repTypeToTransfer = originalShift.repType;

      if (!repTypeToTransfer) {
        return NextResponse.json({ error: "Il turno originale non ha una reperibilità da cedere" }, { status: 400 })
      }

      // Verifichiamo se il destinatario ha già un turno base in quella data
      const targetUserShift = await prisma.shift.findFirst({
        where: { userId: swapRequest.targetUserId, date: originalShift.date }
      });

      // Eseguiamo le operazioni in transazione per sicurezza
      await prisma.$transaction([
        // 1. Rimuovi la reperibilità dall'agente originale e aggiungi nota
        prisma.shift.update({
          where: { id: originalShift.id },
          data: { 
            repType: null,
            serviceDetails: originalShift.serviceDetails 
              ? `${originalShift.serviceDetails} | Reperibilità ceduta a ${swapRequest.targetUser?.name || 'nuovo agente'}`
              : `Reperibilità ceduta a ${swapRequest.targetUser?.name || 'nuovo agente'}`
          }
        }),

        // 2. Assegna la reperibilità al targetUser
        ...(targetUserShift ? [
          // Aggiorna shift esistente
          prisma.shift.update({
             where: { id: targetUserShift.id },
             data: {
               repType: repTypeToTransfer,
               serviceDetails: targetUserShift.serviceDetails
                 ? `${targetUserShift.serviceDetails} | Reperibilità assunta da ${swapRequest.requester.name}`
                 : `Reperibilità assunta da ${swapRequest.requester.name}`
             }
          })
        ] : [
          // Crea nuovo shift (nel caso fosse di riposo/non avesse turni base)
          prisma.shift.create({
             data: {
               userId: swapRequest.targetUserId,
               date: originalShift.date,
               type: "RIPOSO", // assumed base type if missing
               repType: repTypeToTransfer,
               serviceDetails: `Reperibilità assunta da ${swapRequest.requester.name}`
             }
          })
        ]),

        // 3. Aggiorna lo stato della richiesta
        prisma.shiftSwapRequest.update({
          where: { id },
          data: { status }
        })
      ]);

      // --- NOTIFICA PER IL RICHIEDENTE ---
      try {
        await (prisma as any).notification.create({
          data: {
            tenantId: swapRequest.tenantId,
            userId: swapRequest.requesterId,
            title: "Esito Scambio Turno",
            message: `${session.user.name} ha ACCETTATO la tua proposta di scambio per il ${new Date(originalShift.date).toLocaleDateString("it-IT")}.`,
            type: "SUCCESS",
            link: "/?view=agent"
          }
        })
      } catch (notifyError) {
        console.error("Error notifying requester on swap accept:", notifyError)
      }

      return NextResponse.json({ success: true, status: "ACCEPTED" })
    } else {
      // Se rifiutata, aggiorna solo lo stato
      const updated = await prisma.shiftSwapRequest.update({
        where: { id },
        data: { status }
      })

      // --- NOTIFICA PER IL RICHIEDENTE ---
      try {
        await (prisma as any).notification.create({
          data: {
            tenantId: swapRequest.tenantId,
            userId: swapRequest.requesterId,
            title: "Esito Scambio Turno",
            message: `${session.user.name} ha RIFIUTATO la tua proposta di scambio per il ${new Date(swapRequest.shift.date).toLocaleDateString("it-IT")}.`,
            type: "ALERT",
            link: "/?view=agent"
          }
        })
      } catch (notifyError) {
        console.error("Error notifying requester on swap reject:", notifyError)
      }

      return NextResponse.json(updated)
    }

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
