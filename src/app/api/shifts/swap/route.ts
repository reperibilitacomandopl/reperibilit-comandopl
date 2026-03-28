import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Elenco scambi (inviati e ricevuti)
export async function GET() {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const requests = await prisma.shiftSwapRequest.findMany({
      where: {
        OR: [
          { requesterId: session.user.id },
          { targetUserId: session.user.id }
        ]
      },
      include: {
        requester: { select: { name: true, matricola: true } },
        targetUser: { select: { name: true, matricola: true } },
        shift: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (err) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// POST: Crea una nuova proposta di scambio
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { shiftId, targetUserId } = await req.json()

    if (!shiftId || !targetUserId) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    // 1. Verifica che il turno appartenga al richiedente
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { user: true }
    })

    if (!shift || shift.userId !== session.user.id) {
      return NextResponse.json({ error: "Turno non trovato o non tuo" }, { status: 403 })
    }

    // 2. Verifica che il destinatario non abbia già un turno o un'assenza quel giorno
    const conflictShift = await prisma.shift.findFirst({
      where: { userId: targetUserId, date: shift.date }
    })
    
    // In questa logica, se ha già un turno di reperibilità o un'assenza, non può prendere lo scambio
    if (conflictShift && conflictShift.repType) {
       return NextResponse.json({ error: "Il collega è già in reperibilità in questa data" }, { status: 400 })
    }

    const conflictAbsence = await prisma.absence.findFirst({
      where: { userId: targetUserId, date: shift.date }
    })
    if (conflictAbsence) {
      return NextResponse.json({ error: "Il collega è assente in questa data" }, { status: 400 })
    }

    // 3. Crea la richiesta
    const request = await prisma.shiftSwapRequest.create({
      data: {
        requesterId: session.user.id,
        targetUserId,
        shiftId,
        status: "PENDING"
      }
    })

    return NextResponse.json(request)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
