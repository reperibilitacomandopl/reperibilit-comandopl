import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = params
    const body = await req.json()
    const { stato } = body

    if (!stato) {
      return NextResponse.json({ error: 'Stato obbligatorio' }, { status: 400 })
    }

    // Verify it belongs to the tenant
    const existing = await prisma.violation.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
        deletedAt: null
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Verbale non trovato' }, { status: 404 })
    }

    const updated = await prisma.violation.update({
      where: { id },
      data: { stato }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        tenantId: session.user.tenantId,
        adminId: session.user.id,
        adminName: session.user.name,
        action: 'UPDATE_VIOLATION_STATUS',
        targetId: id,
        targetName: `Verbale ${updated.targa}`,
        details: `Stato cambiato da ${existing.stato} a ${stato}`
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ADMIN_VIOLATION_PUT] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
