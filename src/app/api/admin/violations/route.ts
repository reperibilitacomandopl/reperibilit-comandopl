import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const stato = searchParams.get('stato')
    const agenteId = searchParams.get('agenteId')

    const whereClause: any = {
      tenantId: session.user.tenantId,
      deletedAt: null
    }

    if (stato) whereClause.stato = stato
    if (agenteId) whereClause.userId = agenteId

    const violations = await prisma.violation.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, matricola: true }
        },
        payments: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(violations)
  } catch (error) {
    console.error('[ADMIN_VIOLATION_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
