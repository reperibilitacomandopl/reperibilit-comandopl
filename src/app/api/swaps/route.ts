// @ts-nocheck
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { targetUserId, shiftId } = await req.json()
    if (!targetUserId || !shiftId) {
      return NextResponse.json({ error: 'Mancano i parametri richiesti per il cambio turno' }, { status: 400 })
    }

    const tenantId = session.user.tenantId

    // Verify shift belongs to requester and correct tenant
    const shift = await prisma.shift.findFirst({ 
      where: { id: shiftId, userId: session.user.id, tenantId: tenantId || null } 
    })
    if (!shift) {
      return NextResponse.json({ error: 'Turno non trovato o non di tua competenza' }, { status: 400 })
    }

    // Check if swap already requested for this shift and user
    const existing = await prisma.shiftSwapRequest.findFirst({
      where: {
        requesterId: session.user.id,
        targetUserId,
        shiftId,
        status: 'PENDING',
        tenantId: tenantId || null
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Hai già richiesto uno scambio per questo turno con questo collega' }, { status: 400 })
    }

    const swapRequest = await prisma.shiftSwapRequest.create({
      data: {
        tenantId: tenantId || null,
        requesterId: session.user.id,
        targetUserId,
        shiftId,
        status: 'PENDING'
      }
    })

    // --- NOTIFICA PER IL COLLEGA DESTINATARIO ---
    try {
      await (prisma as any).notification.create({
        data: {
          tenantId: tenantId || null,
          userId: targetUserId,
          title: "Proposta Scambio Turno",
          message: `${session.user.name} ti ha proposto uno scambio per il turno del ${new Date(shift.date).toLocaleDateString("it-IT")}.`,
          type: "REQUEST",
          link: "/?view=agent" // O la sezione specifica degli scambi se separata
        }
      })
    } catch (notifyError) {
      console.error("Error notifying target user on swap request:", notifyError)
    }

    return NextResponse.json({ success: true, swapRequest })
  } catch (error) {
    console.error('Error creating swap request:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tenantId = session.user.tenantId
    const sent = await prisma.shiftSwapRequest.findMany({
      where: { requesterId: session.user.id, tenantId: tenantId || null },
      include: { targetUser: { select: { name: true, matricola: true } }, shift: true },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, requests: sent })
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
