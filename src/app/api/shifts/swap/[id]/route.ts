import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { status: requestedAction } = await req.json() // "ACCEPTED" or "REJECTED"
    const isAdmin = session.user.role === "ADMIN" || session.user.canManageShifts === true

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

         // Notifica agli ADMIN e SEGRETERIA per il "Visto finale"
         const adminsAndStaff = await prisma.user.findMany({
           where: { 
             tenantId: swapRequest.tenantId, 
             OR: [
               { role: "ADMIN" },
               { canManageShifts: true }
             ]
           },
           select: { id: true }
         })

         if (adminsAndStaff.length > 0) {
            await (prisma as any).notification.createMany({
              data: adminsAndStaff.map(a => ({
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
        
        // Cerchiamo il turno attuale del destinatario per quella data
        const targetUserShift = await prisma.shift.findFirst({
          where: { userId: swapRequest.targetUserId!, date: originalShift.date }
        });

        if (!targetUserShift || targetUserShift.type === "RIPOSO" || originalShift.type === "RIPOSO") {
          return NextResponse.json({ error: "Uno dei turni è diventato a riposo. Scambio non possibile." }, { status: 400 })
        }

        // Definiamo i campi da scambiare (Universal Swap)
        const fieldsToSwapFromA = {
          type: originalShift.type,
          repType: originalShift.repType,
          timeRange: originalShift.timeRange,
          serviceCategoryId: originalShift.serviceCategoryId,
          serviceTypeId: originalShift.serviceTypeId,
          vehicleId: originalShift.vehicleId,
          serviceDetails: originalShift.serviceDetails,
          durationHours: originalShift.durationHours,
          overtimeHours: originalShift.overtimeHours,
        };

        const fieldsToSwapFromB = {
          type: targetUserShift.type,
          repType: targetUserShift.repType,
          timeRange: targetUserShift.timeRange,
          serviceCategoryId: targetUserShift.serviceCategoryId,
          serviceTypeId: targetUserShift.serviceTypeId,
          vehicleId: targetUserShift.vehicleId,
          serviceDetails: targetUserShift.serviceDetails,
          durationHours: targetUserShift.durationHours,
          overtimeHours: targetUserShift.overtimeHours,
        };

        // Eseguiamo la transazione effettiva di inversione totale
        await prisma.$transaction([
          // 1. Applica i dati di B ad A
          prisma.shift.update({
            where: { id: originalShift.id },
            data: { 
              ...fieldsToSwapFromB,
              serviceDetails: fieldsToSwapFromB.serviceDetails 
                ? `${fieldsToSwapFromB.serviceDetails} | Scambiato con ${swapRequest.targetUser?.name} (Visto Admin)`
                : `Turno scambiato con ${swapRequest.targetUser?.name} (Visto Admin)`
            }
          }),

          // 2. Applica i dati di A a B
          prisma.shift.update({
             where: { id: targetUserShift.id },
             data: {
               ...fieldsToSwapFromA,
               serviceDetails: fieldsToSwapFromA.serviceDetails
                 ? `${fieldsToSwapFromA.serviceDetails} | Scambiato con ${swapRequest.requester.name} (Visto Admin)`
                 : `Turno scambiato con ${swapRequest.requester.name} (Visto Admin)`
             }
          }),

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id },
      include: { 
        shift: true,
        requester: { select: { name: true, matricola: true } },
        targetUser: { select: { name: true, matricola: true } }
      }
    })

    if (!swapRequest) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Cerchiamo anche il turno del destinatario per mostrare il confronto
    const targetShift = await prisma.shift.findFirst({
      where: { userId: swapRequest.targetUserId!, date: swapRequest.shift.date }
    })

    return NextResponse.json({ 
      success: true, 
      swap: {
        ...swapRequest,
        targetShift
      }
    })
  } catch (err) {
    return NextResponse.json({ error: "Error" }, { status: 500 })
  }
}
