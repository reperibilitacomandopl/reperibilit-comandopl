import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    const municipalities = await prisma.municipality.findMany({
      where: {
        tenantId: session.user.tenantId,
        OR: [
          { denominazione: { startsWith: q, mode: 'insensitive' } },
          { denominazione: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: {
        denominazione: 'asc'
      }
    })

    return NextResponse.json(municipalities)
  } catch (error) {
    console.error('[MUNICIPALITIES_SEARCH] Error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
