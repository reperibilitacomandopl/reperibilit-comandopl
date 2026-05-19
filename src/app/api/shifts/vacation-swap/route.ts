import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Elenco scambi ferie (inviati, ricevuti o tutti se Admin)
export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const isAdmin = session.user.role === "ADMIN" || session.user.canManageShifts === true
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Nessun comando attivo" }, { status: 400 })

    const whereCondition = isAdmin
      ? { tenantId }
      : {
          tenantId,
          OR: [
            { requesterId: session.user.id },
            { targetUserId: session.user.id }
          ]
        }

    const requests = await prisma.vacationSwapRequest.findMany({
      where: whereCondition,
      include: {
        requester: { select: { id: true, name: true, matricola: true } },
        targetUser: { select: { id: true, name: true, matricola: true } },
        vacationPlan: true,
        targetVacationPlan: true
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(requests)
  } catch (err) {
    console.error("[VACATION_SWAP_GET]", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// POST: Proponi un nuovo scambio ferie
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Nessun comando attivo" }, { status: 400 })

    const { vacationPlanId, targetUserId } = await req.json()

    if (!vacationPlanId || !targetUserId) {
      return NextResponse.json({ error: "Parametri mancanti: vacationPlanId e targetUserId sono obbligatori" }, { status: 400 })
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "Non puoi proporre uno scambio a te stesso" }, { status: 400 })
    }

    // 1. Carica il piano ferie del richiedente
    const myPlan = await prisma.vacationPlan.findFirst({
      where: { id: vacationPlanId, userId: session.user.id, tenantId }
    })

    if (!myPlan) {
      return NextResponse.json({ error: "Piano ferie non trovato o non di tua proprietà" }, { status: 404 })
    }

    // 2. REGOLA DEL TERMINE DI 1 MESE PRIMA
    const now = new Date()
    const startDate = new Date(myPlan.startDate)
    
    // Calcoliamo la data limite (1 mese prima dell'inizio delle ferie)
    const deadlineDate = new Date(startDate)
    deadlineDate.setMonth(deadlineDate.getMonth() - 1)

    if (now > deadlineDate) {
      const deadlineStr = deadlineDate.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
      return NextResponse.json({ 
        error: `Non è possibile scambiare questo turno di ferie. Il termine massimo per proporre lo scambio era il ${deadlineStr} (almeno 1 mese prima dell'inizio).` 
      }, { status: 400 })
    }

    // 3. Carica il piano ferie del collega per la stessa stagione e lo stesso anno per effettuare lo scambio reciproco
    const targetPlan = await prisma.vacationPlan.findFirst({
      where: {
        userId: targetUserId,
        period: myPlan.period,
        year: myPlan.year,
        tenantId
      }
    })

    if (!targetPlan) {
      return NextResponse.json({ error: "Il collega selezionato non ha un piano ferie assegnato per questa stagione/anno" }, { status: 400 })
    }

    // 4. Verifica che non esista già uno scambio pendente o accettato per questo piano ferie
    const existing = await prisma.vacationSwapRequest.findFirst({
      where: {
        vacationPlanId,
        status: { in: ["PENDING", "ACCEPTED"] },
        tenantId
      }
    })

    if (existing) {
      return NextResponse.json({ error: "Esiste già una proposta di scambio attiva per questo piano ferie" }, { status: 409 })
    }

    // 5. Crea la richiesta di scambio
    const request = await prisma.vacationSwapRequest.create({
      data: {
        tenantId,
        requesterId: session.user.id,
        targetUserId,
        vacationPlanId,
        targetVacationPlanId: targetPlan.id,
        status: "PENDING"
      },
      include: {
        requester: { select: { name: true } },
        targetUser: { select: { name: true } },
        vacationPlan: true,
        targetVacationPlan: true
      }
    })

    // 6. Crea la notifica per il collega
    await (prisma as any).notification.create({
      data: {
        tenantId,
        userId: targetUserId,
        title: "Proposta Scambio Ferie 📅",
        message: `${session.user.name} ti ha proposto di scambiare il suo periodo di ferie (${new Date(myPlan.startDate).toLocaleDateString("it-IT")} - ${new Date(myPlan.endDate).toLocaleDateString("it-IT")}) con il tuo.`,
        type: "REQUEST",
        metadata: JSON.stringify({ vacationSwapId: request.id }),
        link: "/?view=agent"
      }
    })

    return NextResponse.json(request)
  } catch (err) {
    console.error("[VACATION_SWAP_POST]", err)
    return NextResponse.json({ error: "Errore interno durante l'invio della proposta" }, { status: 500 })
  }
}
