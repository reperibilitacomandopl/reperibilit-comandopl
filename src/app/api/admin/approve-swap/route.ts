import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { swapId } = await req.json()

    if (!swapId) return NextResponse.json({ error: "ID Mancante" }, { status: 400 })

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: swapId },
      include: { shift: true }
    })

    if (!swapRequest) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })
    if (swapRequest.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Lo scambio deve essere prima accettato dal collega" }, { status: 400 })
    }

    // Performance atomic swap in DB
    const [updatedRequest, updatedShift] = await prisma.$transaction([
      prisma.shiftSwapRequest.update({
        where: { id: swapId },
        data: { status: "APPROVED_BY_ADMIN" }
      }),
      prisma.shift.update({
        where: { id: swapRequest.shiftId },
        data: { userId: swapRequest.targetUserId }
      })
    ])

    return NextResponse.json({ success: true, request: updatedRequest, shift: updatedShift })
  } catch (err) {
    console.error("Error approving swap:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
