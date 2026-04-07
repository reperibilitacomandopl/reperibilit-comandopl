import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch pending agent requests (Ferie, Malattie, Permessi Brevi)
    const pendingRequests = await prisma.agentRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, matricola: true } } },
      orderBy: { createdAt: 'desc' }
    })

    // Fetch pending swaps
    const pendingSwaps = await prisma.shiftSwapRequest.findMany({
      where: { status: "PENDING" }, // Now segreteria can approve directly
      include: {
        requester: { select: { name: true, matricola: true } },
        targetUser: { select: { name: true, matricola: true } },
        shift: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ pendingRequests, pendingSwaps })
  } catch (err) {
    console.error("Error fetching approvals:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, id, action } = await req.json()
    // action usually "APPROVE" | "REJECT"

    if (type === "LEAVE_REQUEST") {
      const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED"
      const updated = await prisma.agentRequest.update({
        where: { id },
        data: { status: newStatus, reviewedBy: session.user.name }
      })

      // If approved, sync to grid!
      if (newStatus === "APPROVED") {
        await prisma.shift.upsert({
          where: { userId_date: { userId: updated.userId, date: updated.date } },
          update: { type: updated.code },
          create: { userId: updated.userId, date: updated.date, type: updated.code }
        })
      }

      return NextResponse.json({ success: true, updated })

    } else if (type === "SWAP_REQUEST") {
      const newStatus = action === "APPROVE" ? "APPROVED_BY_ADMIN" : "REJECTED"
      const swapRequest = await prisma.shiftSwapRequest.findUnique({
        where: { id },
        include: { shift: true }
      })

      if (!swapRequest) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

      if (action === "APPROVE") {
        const sourceShift = swapRequest.shift
        // Swap logic: We want to actually swap the entire shift or just the `type`
        // Let's swap the Type String
        
        // Find target user's shift on the same date
        const targetUserShift = await prisma.shift.findUnique({
          where: { userId_date: { userId: swapRequest.targetUserId, date: sourceShift.date } }
        })

        const targetType = targetUserShift?.type || "RIPOSO"
        const sourceType = sourceShift.type

        const transactions = [
          prisma.shiftSwapRequest.update({
            where: { id },
            data: { status: newStatus }
          }),
          // Requester gets Target's type
          prisma.shift.update({
            where: { id: sourceShift.id },
            data: { type: targetType, repType: targetUserShift?.repType || null }
          }),
          // Target gets Requester's type
          prisma.shift.upsert({
             where: { userId_date: { userId: swapRequest.targetUserId, date: sourceShift.date } },
             update: { type: sourceType, repType: sourceShift.repType || null },
             create: { userId: swapRequest.targetUserId, date: sourceShift.date, type: sourceType, repType: sourceShift.repType || null }
          })
        ]

        await prisma.$transaction(transactions)
      } else {
        await prisma.shiftSwapRequest.update({
          where: { id },
          data: { status: newStatus }
        })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (err) {
    console.error("Error approving:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
