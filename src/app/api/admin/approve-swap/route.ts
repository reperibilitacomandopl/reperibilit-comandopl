// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const { swapId } = await req.json()

    if (!swapId) return NextResponse.json({ error: "ID Mancante" }, { status: 400 })

    const swapRequest = await prisma.shiftSwapRequest.findFirst({
      where: { id: swapId, tenantId: tenantId || null },
      include: { shift: true }
    })

    if (!swapRequest) return NextResponse.json({ error: "Richiesta non trovata o non appartenente al tuo comando" }, { status: 404 })
    if (swapRequest.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Lo scambio deve essere prima accettato dal collega" }, { status: 400 })
    }

    const sourceShift = swapRequest.shift
    
    // Performance atomic swap in DB
    const transactions = [
      prisma.shiftSwapRequest.update({
        where: { id: swapId },
        data: { status: "APPROVED_BY_ADMIN" }
      }),
      // Sposta la reperibilità (o l'intero turno identificativo) dal richiedente al destinatario
      prisma.shift.upsert({
        where: { userId_date_tenantId: { userId: swapRequest.targetUserId, date: sourceShift.date, tenantId: tenantId || "" } },
        update: { repType: sourceShift.repType || sourceShift.type },
        create: {
          tenantId: tenantId || null,
          userId: swapRequest.targetUserId,
          date: sourceShift.date,
          type: "RIPOSO", // Fallback
          repType: sourceShift.repType || sourceShift.type,
          durationHours: sourceShift.durationHours,
          serviceCategoryId: sourceShift.serviceCategoryId,
          serviceTypeId: sourceShift.serviceTypeId
        }
      }),
      // Pulisce il turno del richiedente originale
      prisma.shift.update({
        where: { id: sourceShift.id },
        data: { repType: null }
      })
    ]

    const [updatedRequest, updatedShift, _] = await prisma.$transaction(transactions)

    return NextResponse.json({ success: true, request: updatedRequest, shift: updatedShift })
  } catch (err) {
    console.error("Error approving swap:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
