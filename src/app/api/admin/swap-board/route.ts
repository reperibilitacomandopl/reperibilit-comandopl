// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: Lista offerte aperte nel comando attivo
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Nessun comando attivo" }, { status: 400 })

    const swaps = await prisma.shiftSwapRequest.findMany({
      where: { tenantId, status: "PENDING", targetUserId: null },
      include: {
        requester: { select: { id: true, name: true, matricola: true } },
        shift: { select: { id: true, date: true, type: true, repType: true, timeRange: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ swaps })
  } catch (error) {
    console.error("[SWAP BOARD GET]", error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}

// POST: Crea un'offerta aperta di scambio turno
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { shiftId, message } = await req.json()
    if (!shiftId) return NextResponse.json({ error: "shiftId obbligatorio" }, { status: 400 })

    const tenantId = session.user.tenantId
    if (!tenantId) return NextResponse.json({ error: "Nessun comando attivo" }, { status: 400 })

    // Verifica che lo shift appartenga all'utente
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, userId: session.user.id, tenantId }
    })
    if (!shift) return NextResponse.json({ error: "Turno non trovato o non di tua competenza" }, { status: 404 })

    // Verifica che non ci sia già un'offerta aperta per questo turno
    const existing = await prisma.shiftSwapRequest.findFirst({
      where: { shiftId, status: "PENDING", tenantId }
    })
    if (existing) return NextResponse.json({ error: "Esiste già un'offerta aperta per questo turno" }, { status: 409 })

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        tenantId,
        requesterId: session.user.id,
        shiftId,
        message: message || null,
        targetUserId: null, // Offerta aperta
      },
      include: {
        requester: { select: { id: true, name: true, matricola: true } },
        shift: { select: { id: true, date: true, type: true, repType: true, timeRange: true } }
      }
    })

    return NextResponse.json({ swap })
  } catch (error) {
    console.error("[SWAP BOARD POST]", error)
    return NextResponse.json({ error: "Errore nella creazione" }, { status: 500 })
  }
}

// PUT: Accetta un'offerta o Admin la approva/rifiuta
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { swapId, action } = await req.json()
    // action: "accept" (agente accetta), "approve" (admin approva), "reject" (admin rifiuta), "cancel" (creatore ritira)
    if (!swapId || !action) return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })

    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapId },
      include: { shift: true }
    })
    if (!swap) return NextResponse.json({ error: "Offerta non trovata" }, { status: 404 })

    if (action === "accept") {
      // Un agente diverso dal richiedente accetta
      if (swap.requesterId === session.user.id) return NextResponse.json({ error: "Non puoi accettare la tua stessa offerta" }, { status: 400 })

      await prisma.shiftSwapRequest.update({
        where: { id: swapId },
        data: { acceptedById: session.user.id, status: "ACCEPTED" }
      })
      return NextResponse.json({ success: true, message: "Offerta accettata! In attesa di approvazione del Comandante." })
    }

    if (action === "approve" && session.user.role === "ADMIN") {
      // Admin approva: scambia effettivamente i turni
      const acceptedId = swap.acceptedById
      if (!acceptedId) return NextResponse.json({ error: "Nessuno ha ancora accettato questa offerta" }, { status: 400 })

      // Swap userId sullo shift
      await prisma.shift.update({
        where: { id: swap.shiftId },
        data: { userId: acceptedId }
      })
      await prisma.shiftSwapRequest.update({
        where: { id: swapId },
        data: { status: "APPROVED_BY_ADMIN" }
      })
      return NextResponse.json({ success: true, message: "Scambio approvato e turno reassegnato." })
    }

    if (action === "reject" && session.user.role === "ADMIN") {
      await prisma.shiftSwapRequest.update({
        where: { id: swapId },
        data: { status: "REJECTED" }
      })
      return NextResponse.json({ success: true, message: "Offerta rifiutata." })
    }

    if (action === "cancel" && swap.requesterId === session.user.id) {
      await prisma.shiftSwapRequest.delete({ where: { id: swapId } })
      return NextResponse.json({ success: true, message: "Offerta ritirata." })
    }

    return NextResponse.json({ error: "Azione non valida" }, { status: 400 })
  } catch (error) {
    console.error("[SWAP BOARD PUT]", error)
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }
}
