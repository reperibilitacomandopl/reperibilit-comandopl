import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { status: requestedAction } = await req.json() // "ACCEPTED" or "REJECTED"
    const isAdmin = session.user.role === "ADMIN"

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: { 
        shift: true,
        requester: true,
        targetUser: true
      }
    })

    if (!swapRequest) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    // --- LOGICA RIFIUTO (Universale) ---
    if (requestedAction === "REJECTED") {
       // Può rifiutare l'admin o l'agente target
       if (swapRequest.targetUserId !== session.user.id && !isAdmin) {
          return NextResponse.json({ error: "Non autorizzato a rifiutare" }, { status: 403 })
       }

       await prisma.shiftSwapRequest.update({
         where: { id },
         data: { status: "REJECTED" }
       })

       // Notifica al richiedente
       await (prisma as any).notification.create({
         data: {
           tenantId: swapRequest.tenantId,
           userId: swapRequest.requesterId,
           title: "Scambio Rifiutato",
           message: `${session.user.name} ha RIFIUTATO lo scambio per il ${new Date(swapRequest.shift.date).toLocaleDateString("it-IT")}.`,
           type: "ALERT",
           link: "/?view=agent"
         }
       })
       return NextResponse.json({ success: true, status: "REJECTED" })
    }

    // --- LOGICA APPROVAZIONE (A Due Fasi) ---
    if (requestedAction === "ACCEPTED") {
      
      // CASO A: L'Agente destinatario ACCETTA la proposta
      if (swapRequest.targetUserId === session.user.id && swapRequest.status === "PENDING") {
         await prisma.shiftSwapRequest.update({
           where: { id },
           data: { status: "ACCEPTED" } // Stato intermedio: accettato tra agenti, attesa admin
         })

         // Notifica agli ADMIN per il "Visto finale"
         const admins = await prisma.user.findMany({
           where: { tenantId: swapRequest.tenantId, role: "ADMIN" },
           select: { id: true }
         })

         if (admins.length > 0) {
            await (prisma as any).notification.createMany({
              data: admins.map(a => ({
                tenantId: swapRequest.tenantId,
                userId: a.id,
                title: "Visto Scambio Richiesto",
                message: `${swapRequest.requester.name} e ${swapRequest.targetUser?.name} hanno concordato uno scambio. Richiesto OK finale.`,
                type: "REQUEST",
                metadata: JSON.stringify({ swapId: id }),
                link: "/admin/scambi"
              }))
            })
         }

         // Notifica al richiedente: "Il collega ha accettato, ora attendiamo l'admin"
         await (prisma as any).notification.create({
           data: {
             tenantId: swapRequest.tenantId,
             userId: swapRequest.requesterId,
             title: "In Attesa di Visto Comando",
             message: `${session.user.name} ha accettato lo scambio. La richiesta è ora al vaglio del Comando.`,
             type: "INFO",
             link: "/?view=agent"
           }
         })

         return NextResponse.json({ success: true, status: "WAITING_ADMIN" })
      }

      // CASO B: L'Amministratore dà il VISTO FINALE
      if (isAdmin && swapRequest.status === "ACCEPTED") {
        const originalShift = swapRequest.shift;
        const repTypeToTransfer = originalShift.repType;

        if (!repTypeToTransfer) {
          return NextResponse.json({ error: "Il turno originale non ha una reperibilità da cedere" }, { status: 400 })
        }

        const targetUserShift = await prisma.shift.findFirst({
          where: { userId: swapRequest.targetUserId!, date: originalShift.date }
        });

        // Eseguiamo la transazione effettiva di cambio turni
        await prisma.$transaction([
          // 1. Rimuovi la reperibilità dall'agente originale
          prisma.shift.update({
            where: { id: originalShift.id },
            data: { 
              repType: null,
              serviceDetails: originalShift.serviceDetails 
                ? `${originalShift.serviceDetails} | Reperibilità ceduta a ${swapRequest.targetUser?.name || 'nuovo agente'} (Visto Admin)`
                : `Reperibilità ceduta a ${swapRequest.targetUser?.name || 'nuovo agente'} (Visto Admin)`
            }
          }),

          // 2. Assegna la reperibilità al targetUser
          ...(targetUserShift ? [
            prisma.shift.update({
               where: { id: targetUserShift.id },
               data: {
                 repType: repTypeToTransfer,
                 serviceDetails: targetUserShift.serviceDetails
                   ? `${targetUserShift.serviceDetails} | Reperibilità assunta da ${swapRequest.requester.name} (Visto Admin)`
                   : `Reperibilità assunta da ${swapRequest.requester.name} (Visto Admin)`
               }
            })
          ] : [
            prisma.shift.create({
               data: {
                 userId: swapRequest.targetUserId!,
                 date: originalShift.date,
                 type: "RIPOSO",
                 repType: repTypeToTransfer,
                 serviceDetails: `Reperibilità assunta da ${swapRequest.requester.name} (Visto Admin)`
               }
            })
          ]),

          // 3. Completa la richiesta
          prisma.shiftSwapRequest.update({
            where: { id },
            data: { status: "COMPLETED" }
          })
        ]);

        // Notifiche finali a entrambi gli agenti
        const participants = [swapRequest.requesterId, swapRequest.targetUserId!]
        await (prisma as any).notification.createMany({
          data: participants.map(uid => ({
            tenantId: swapRequest.tenantId,
            userId: uid,
            title: "Scambio Confermato dal Comando",
            message: `L'amministratore ${session.user.name} ha confermato lo scambio turno del ${new Date(originalShift.date).toLocaleDateString("it-IT")}.`,
            type: "SUCCESS",
            link: "/?view=agent"
          }))
        })

        return NextResponse.json({ success: true, status: "COMPLETED" })
      }

      return NextResponse.json({ error: "Non autorizzato o stato non compatibile" }, { status: 403 })
    }

    return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 })

  } catch (err) {
    console.error("[SWAP_PATCH_VISTO]", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
