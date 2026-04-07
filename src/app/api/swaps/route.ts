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

    // Verify shift belongs to requester
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
    if (!shift || shift.userId !== session.user.id) {
      return NextResponse.json({ error: 'Turno non trovato o non di tua competenza' }, { status: 400 })
    }

    // Check if swap already requested for this shift and user
    const existing = await prisma.shiftSwapRequest.findFirst({
      where: {
        requesterId: session.user.id,
        targetUserId,
        shiftId,
        status: 'PENDING'
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Hai già richiesto uno scambio per questo turno con questo collega' }, { status: 400 })
    }

    const swapRequest = await prisma.shiftSwapRequest.create({
      data: {
        requesterId: session.user.id,
        targetUserId,
        shiftId,
        status: 'PENDING'
      }
    })

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
    const sent = await prisma.shiftSwapRequest.findMany({
      where: { requesterId: session.user.id },
      include: { targetUser: { select: { name: true, matricola: true } }, shift: true },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({ success: true, requests: sent })
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
