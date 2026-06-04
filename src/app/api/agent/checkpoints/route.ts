import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

/**
 * API per gli agenti — inserimento posti di controllo dal campo.
 * GET: lista propri controlli
 * POST: crea nuovo controllo
 */

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // L'agente vede solo i propri controlli
    const whereClause = {
      tenantId: session.user.tenantId,
      operatorId: session.user.id,
      deletedAt: null
    }

    const [checkpoints, total] = await Promise.all([
      prisma.checkpoint.findMany({
        where: whereClause,
        include: {
          _count: { select: { vehicles: true } }
        },
        orderBy: { dataControllo: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.checkpoint.count({ where: whereClause })
    ])

    return NextResponse.json({ checkpoints, total, page, limit })
  } catch (error) {
    console.error('[AGENT_CHECKPOINTS_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const data = await req.json()
    const { dataControllo, oraInizio, oraFine, luogo, operatori, veicoloServizio, note } = data

    if (!dataControllo || !oraInizio || !oraFine || !luogo) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    // Geocoding best-effort
    let lat: number | null = null
    let lng: number | null = null
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(luogo)}&format=json&limit=1`
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'SentinelPro-PoliziaLocale' },
        signal: AbortSignal.timeout(5000)
      })
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (geoData.length > 0) {
          lat = parseFloat(geoData[0].lat)
          lng = parseFloat(geoData[0].lon)
        }
      }
    } catch { /* best-effort */ }

    const checkpoint = await prisma.checkpoint.create({
      data: {
        tenantId: session.user.tenantId,
        operatorId: session.user.id,
        dataControllo: new Date(dataControllo),
        oraInizio,
        oraFine,
        luogo,
        lat,
        lng,
        operatori: operatori || session.user.name || null,
        veicoloServizio: veicoloServizio || null,
        note: note || null,
        importSource: 'MANUALE'
      },
      include: { _count: { select: { vehicles: true } } }
    })

    return NextResponse.json(checkpoint, { status: 201 })
  } catch (error) {
    console.error('[AGENT_CHECKPOINTS_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
