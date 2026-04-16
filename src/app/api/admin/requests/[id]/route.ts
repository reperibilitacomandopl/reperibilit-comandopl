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

      // 2. Se approvata, creiamo la voce nell'agenda, absence e SINCRONIZZIAMO con la tabella Shift
      if (status === "APPROVED") {
        const start = new Date(agentRequest.date)
        const end = agentRequest.endDate ? new Date(agentRequest.endDate) : start
        const isAbsence = ["F", "FERIE", "MALATTIA", "M", "104", "CONG_PAT", "CONG_PAR"].includes(agentRequest.code.toUpperCase())
        
        // Calcolo dei giorni tra start e end
        const dates: Date[] = []
        let current = new Date(start)
        while (current <= end) {
          dates.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }

        for (const targetDate of dates) {
          // 2.1 Tabella Absence o Agenda
          if (isAbsence) {
             await tx.absence.upsert({
               where: {
                 userId_date_tenantId: {
                   userId: agentRequest.userId,
                   date: targetDate,
                   tenantId: agentRequest.tenantId || ""
                 }
               },
               update: { code: agentRequest.code, source: "AGENT_REQUEST" },
               create: {
                 tenantId: agentRequest.tenantId,
                 userId: agentRequest.userId,
                 date: targetDate,
                 code: agentRequest.code,
                 source: "AGENT_REQUEST"
               }
             })
          } else {
             await tx.agendaEntry.upsert({
               where: {
                 userId_date_code_tenantId: {
                   userId: agentRequest.userId,
                   date: targetDate,
                   code: agentRequest.code,
                   tenantId: agentRequest.tenantId || ""
                 }
               },
               update: { hours: agentRequest.hours, note: agentRequest.notes },
               create: {
                 tenantId: agentRequest.tenantId,
                 userId: agentRequest.userId,
                 date: targetDate,
                 code: agentRequest.code,
                 label: agentRequest.code,
                 hours: agentRequest.hours,
                 note: agentRequest.notes
               }
             })
          }

          // 2.2 SINCRONIZZAZIONE CON TABELLA SHIFT (Fondamentale per OdS e Griglia Pianificazione)
          await tx.shift.upsert({
            where: {
              userId_date_tenantId: {
                userId: agentRequest.userId,
                date: targetDate,
                tenantId: agentRequest.tenantId || ""
              }
            },
            update: {
              type: agentRequest.code.toUpperCase(),
              repType: null, // Rimuoviamo eventuale reperibilità se c'è un'assenza/richiesta approvata
              serviceDetails: `Approvato: ${agentRequest.code}`
            },
            create: {
              tenantId: agentRequest.tenantId,
              userId: agentRequest.userId,
              date: targetDate,
              type: agentRequest.code.toUpperCase(),
              repType: null,
              serviceDetails: `Approvato: ${agentRequest.code}`
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
