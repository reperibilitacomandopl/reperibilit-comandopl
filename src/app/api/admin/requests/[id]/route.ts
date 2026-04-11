import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth()
    
    // Solo gli Admin possono usare questo endpoint
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { status } = await req.json() // APPROVED or REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
       return NextResponse.json({ error: "Stato non valido" }, { status: 400 })
    }

    const agentRequest = await prisma.agentRequest.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!agentRequest) {
      return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    }

    if (agentRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Richiesta già processata" }, { status: 400 })
    }

    // Eseguiamo in transazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aggiorna lo stato della richiesta
      const updatedRequest = await tx.agentRequest.update({
        where: { id },
        data: { 
          status,
          reviewedBy: session.user.name
        }
      })

      // 2. Se approvata, creiamo la voce nell'agenda o absence
      if (status === "APPROVED") {
        const isAbsence = ["F", "FERIE", "MALATTIA", "M", "104", "CONG_PAT", "CONG_PAR"].includes(agentRequest.code.toUpperCase())
        
        if (isAbsence) {
           await tx.absence.create({
             data: {
               tenantId: agentRequest.tenantId,
               userId: agentRequest.userId,
               date: agentRequest.date,
               code: agentRequest.code,
               source: "AGENT_REQUEST"
             }
           })
        } else {
           await tx.agendaEntry.create({
             data: {
               tenantId: agentRequest.tenantId,
               userId: agentRequest.userId,
               date: agentRequest.date,
               code: agentRequest.code,
               label: agentRequest.code, // Semplificato
               hours: agentRequest.hours,
               note: agentRequest.notes
             }
           })
        }
      }

      // 3. Creiamo la notifica per l'agente
      await (tx as any).notification.create({
        data: {
          tenantId: agentRequest.tenantId,
          userId: agentRequest.userId,
          title: "Esito Richiesta",
          message: `La tua richiesta per il ${new Date(agentRequest.date).toLocaleDateString("it-IT")} è stata ${status === "APPROVED" ? "APPROVATA" : "RIFIUTATA"} da ${session.user.name}.`,
          type: status === "APPROVED" ? "SUCCESS" : "ALERT",
          link: "/?view=agent"
        }
      })

      return updatedRequest
    })

    // Invia Notifica Push fuori dal pacchetto transazionale per evitare ritardi DB
    try {
      const statusText = status === "APPROVED" ? "APPROVATA" : "RIFIUTATA"
      await sendPushNotification(agentRequest.userId, {
        title: "Esito Richiesta",
        body: `La tua richiesta per il ${new Date(agentRequest.date).toLocaleDateString("it-IT")} è stata ${statusText}.`,
        url: "/dashboard"
      })
    } catch (pushErr) {
      console.error("[PUSH ERROR] Impossibile inviare notifica esito richiesta:", pushErr)
    }

    return NextResponse.json({ success: true, request: result })

  } catch (error) {
    console.error("[ADMIN_REQUEST_PATCH]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
