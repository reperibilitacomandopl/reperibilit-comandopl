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
      include: { shift: true }
    })

    if (!swapRequest || swapRequest.targetUserId !== session.user.id) {
       return NextResponse.json({ error: "Richiesta non trovata o non indirizzata a te" }, { status: 403 })
    }

    if (swapRequest.status !== "PENDING") {
       return NextResponse.json({ error: "Questa proposta è già stata gestita" }, { status: 400 })
    }

    const updated = await prisma.shiftSwapRequest.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
