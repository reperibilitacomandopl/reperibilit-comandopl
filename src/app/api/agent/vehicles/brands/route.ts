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

    let whereClause: any = { tenantId: session.user.tenantId }
    
    if (q && q.length >= 1) {
      whereClause = {
        ...whereClause,
        OR: [
          { descrizione: { contains: q, mode: 'insensitive' } },
          { codice: { startsWith: q, mode: 'insensitive' } }
        ]
      }
    }

    const brands = await prisma.vehicleBrand.findMany({
      where: whereClause,
      take: q ? 20 : undefined, // Ritorna tutto se non c'è query (sono solo 54 marche)
      orderBy: {
        descrizione: 'asc'
      }
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error('[VEHICLE_BRANDS_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
