import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const luogo = searchParams.get('luogo')
    const operatore = searchParams.get('operatore')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const whereClause: any = {
      tenantId: session.user.tenantId,
      deletedAt: null
    }

    if (from || to) {
      whereClause.dataControllo = {}
      if (from) whereClause.dataControllo.gte = new Date(from)
      if (to) whereClause.dataControllo.lte = new Date(to + 'T23:59:59.999Z')
    }
    if (luogo) whereClause.luogo = { contains: luogo, mode: 'insensitive' }
    if (operatore) whereClause.operatori = { contains: operatore, mode: 'insensitive' }

    const [checkpoints, total] = await Promise.all([
      prisma.checkpoint.findMany({
        where: whereClause,
        include: {
          operator: { select: { id: true, name: true, matricola: true } },
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
    console.error('[CHECKPOINTS_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const data = await req.json()
    const { dataControllo, oraInizio, oraFine, luogo, operatori, veicoloServizio, note } = data

    if (!dataControllo || !oraInizio || !oraFine || !luogo) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: data, ora inizio/fine, luogo' }, { status: 400 })
    }

    // Geocoding via Nominatim (best-effort)
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
    } catch { /* geocoding is best-effort */ }

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
        operatori: operatori || null,
        veicoloServizio: veicoloServizio || null,
        note: note || null,
        importSource: 'MANUALE'
      },
      include: {
        _count: { select: { vehicles: true } }
      }
    })

    await logAudit({
      tenantId: session.user.tenantId,
      adminId: session.user.id,
      adminName: session.user.name || undefined,
      action: 'CHECKPOINT_CREATE',
      targetId: checkpoint.id,
      details: `Creato posto di controllo: ${luogo} del ${dataControllo}`
    })

    return NextResponse.json(checkpoint, { status: 201 })
  } catch (error) {
    console.error('[CHECKPOINTS_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
