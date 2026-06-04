import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ targa: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const targa = resolvedParams.targa?.toUpperCase().trim()
    
    if (!targa) {
      return NextResponse.json({ error: 'Targa mancante' }, { status: 400 })
    }

    // Fetch violations for this targa, created by anyone in the same tenant
    // Sort by most recent first
    const violations = await prisma.violation.findMany({
      where: {
        targa: targa,
        tenantId: session.user.tenantId,
      },
      include: {
        cdsViolation: {
          include: {
            articolo: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Only return the most recent 10 to avoid huge payloads
    })

    return NextResponse.json(violations)
  } catch (error) {
    console.error('[VIOLATIONS_BY_TARGA_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
