import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = await params

    const checkpoint = await prisma.checkpoint.findFirst({
      where: { id, tenantId: session.user.tenantId, deletedAt: null },
      include: {
        operator: { select: { id: true, name: true, matricola: true } },
        vehicles: { orderBy: { oraControllo: 'asc' } }
      }
    })

    if (!checkpoint) {
      return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
    }

    return NextResponse.json(checkpoint)
  } catch (error) {
    console.error('[CHECKPOINT_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    // Verify tenant ownership
    const existing = await prisma.checkpoint.findFirst({
      where: { id, tenantId: session.user.tenantId, deletedAt: null }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.dataControllo) updateData.dataControllo = new Date(data.dataControllo)
    if (data.oraInizio) updateData.oraInizio = data.oraInizio
    if (data.oraFine) updateData.oraFine = data.oraFine
    if (data.luogo !== undefined) updateData.luogo = data.luogo
    if (data.operatori !== undefined) updateData.operatori = data.operatori || null
    if (data.veicoloServizio !== undefined) updateData.veicoloServizio = data.veicoloServizio || null
    if (data.note !== undefined) updateData.note = data.note || null

    const updated = await prisma.checkpoint.update({
      where: { id },
      data: updateData
    })

    await logAudit({
      tenantId: session.user.tenantId,
      adminId: session.user.id,
      adminName: session.user.name || undefined,
      action: 'CHECKPOINT_UPDATE',
      targetId: id,
      details: `Aggiornato posto di controllo: ${updated.luogo}`
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[CHECKPOINT_PUT] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.checkpoint.findFirst({
      where: { id, tenantId: session.user.tenantId, deletedAt: null }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
    }

    // Soft delete
    await prisma.checkpoint.update({
      where: { id },
      data: { deletedAt: new Date() }
    })

    await logAudit({
      tenantId: session.user.tenantId,
      adminId: session.user.id,
      adminName: session.user.name || undefined,
      action: 'CHECKPOINT_DELETE',
      targetId: id,
      details: `Eliminato posto di controllo: ${existing.luogo} del ${existing.dataControllo.toISOString().split('T')[0]}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CHECKPOINT_DELETE] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
