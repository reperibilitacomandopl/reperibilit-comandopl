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

    const searchQuery = q.trim()

    // Cerca le vie che contengono la stringa cercata nella denominazione o nella chiave
    const streets = await prisma.street.findMany({
      where: {
        tenantId: session.user.tenantId,
        OR: [
          { denominazione: { contains: searchQuery, mode: 'insensitive' } },
          { chiave: { contains: searchQuery, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: {
        denominazione: 'asc'
      }
    })

    return NextResponse.json(streets)
  } catch (error) {
    console.error('[STREETS_SEARCH_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
