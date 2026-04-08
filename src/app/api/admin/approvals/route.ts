// @ts-nocheck
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    // Fetch pending agent requests (Ferie, Malattie, Permessi Brevi)
    const pendingRequests = await prisma.agentRequest.findMany({
      where: { status: "PENDING", ...tf },
      include: { user: { select: { name: true, matricola: true } } },
      orderBy: { createdAt: 'desc' }
    })

    // Fetch pending swaps
    const filteredSwaps = await prisma.shiftSwapRequest.findMany({
      where: { status: "PENDING", ...tf },
      include: {
        requester: { select: { name: true, matricola: true } },
        targetUser: { select: { name: true, matricola: true } },
        shift: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ pendingRequests, pendingSwaps: filteredSwaps })
  } catch (err) {
    console.error("Error fetching approvals:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { type, id, action } = await req.json()
    const tenantId = session.user.tenantId
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
          where: { userId_date_tenantId: { userId: updated.userId, date: updated.date, tenantId: tenantId || "" } },
          update: { type: updated.code },
          create: { tenantId: tenantId || null, userId: updated.userId, date: updated.date, type: updated.code }
        })
      }

      // --- NOTIFICA PER L'AGENTE ---
      try {
        await (prisma as any).notification.create({
          data: {
            tenantId: tenantId || null,
            userId: updated.userId,
            title: newStatus === "APPROVED" ? "Richiesta Approvata" : "Richiesta Rifiutata",
            message: `La tua richiesta di ${updated.code} per il ${new Date(updated.date).toLocaleDateString("it-IT")} è stata ${newStatus === "APPROVED" ? "approvata" : "rifiutata"}.`,
            type: newStatus === "APPROVED" ? "SUCCESS" : "ALERT",
            link: "/?view=agent" // O la pagina specifica se esiste
          }
        })
      } catch (notifyError) {
        console.error("Error notifying agent on leave update:", notifyError)
      }

      return NextResponse.json({ success: true, updated })

    } else if (type === "SWAP_REQUEST") {
      const newStatus = action === "APPROVE" ? "APPROVED_BY_ADMIN" : "REJECTED"
      const swapRequest = await prisma.shiftSwapRequest.findUnique({
        where: { id, tenantId: tenantId || null },
        include: { shift: true }
      })

      if (!swapRequest) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

      if (action === "APPROVE") {
        const sourceShift = swapRequest.shift
        // Swap logic: We want to actually swap the entire shift or just the `type`
        // Let's swap the Type String
        
        // Find target user's shift on the same date
        const targetUserShift = await prisma.shift.findUnique({
          where: { userId_date_tenantId: { userId: swapRequest.targetUserId, date: sourceShift.date, tenantId: tenantId || "" } }
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
             where: { userId_date_tenantId: { userId: swapRequest.targetUserId, date: sourceShift.date, tenantId: tenantId || "" } },
             update: { type: sourceType, repType: sourceShift.repType || null },
             create: { tenantId: tenantId || null, userId: swapRequest.targetUserId, date: sourceShift.date, type: sourceType, repType: sourceShift.repType || null }
          })
        ]

        await prisma.$transaction(transactions)
      } else {
        await prisma.shiftSwapRequest.update({
          where: { id },
          data: { status: newStatus }
        })
      }

      // --- NOTIFICA PER ENTRAMBI GLI AGENTI ---
      try {
        const title = action === "APPROVE" ? "Scambio Approvato" : "Scambio Rifiutato"
        const msg = action === "APPROVE" 
          ? "Lo scambio turno è stato approvato dall'ufficio comando."
          : "Lo scambio turno è stato rifiutato dall'ufficio comando."

        await (prisma as any).notification.createMany({
          data: [
            { tenantId: tenantId || null, userId: swapRequest.requesterId, title, message: msg, type: action === "APPROVE" ? "SUCCESS" : "ALERT" },
            { tenantId: tenantId || null, userId: swapRequest.targetUserId, title, message: msg, type: action === "APPROVE" ? "SUCCESS" : "ALERT" }
          ]
        })
      } catch (notifyError) {
        console.error("Error notifying agents on swap approval:", notifyError)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (err) {
    console.error("Error approving:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
