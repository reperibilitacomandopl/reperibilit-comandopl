import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = await params

    const checkpoint = await prisma.checkpoint.findFirst({
      where: { id, tenantId: session.user.tenantId, operatorId: session.user.id, deletedAt: null },
      include: { vehicles: { orderBy: { oraControllo: 'asc' } } }
    })

    if (!checkpoint) {
      return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
    }

    return NextResponse.json(checkpoint)
  } catch (error) {
    console.error('[AGENT_CHECKPOINT_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
