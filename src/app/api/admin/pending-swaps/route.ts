// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const requests = await prisma.shiftSwapRequest.findMany({
      where: { status: "ACCEPTED", ...tf }, // Only show those that colleague already accepted
      include: {
        requester: { select: { name: true, matricola: true } },
        targetUser: { select: { name: true, matricola: true } },
        shift: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (err) {
    console.error("Error fetching pending swaps:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
