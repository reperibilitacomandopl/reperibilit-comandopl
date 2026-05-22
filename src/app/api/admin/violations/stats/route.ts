import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const tenantId = session.user.tenantId

    // 1. Totale verbali per stato
    const groupedByStato = await prisma.violation.groupBy({
      by: ['stato'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
      _sum: { importo: true }
    })

    // 2. Trend ultimi 30 giorni
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentViolations = await prisma.violation.findMany({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { createdAt: true, importo: true }
    })

    // Group by day for the chart
    const trendMap = new Map()
    for (const v of recentViolations) {
      const dateKey = v.createdAt.toISOString().split('T')[0]
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { date: dateKey, count: 0, amount: 0 })
      }
      const data = trendMap.get(dateKey)
      data.count += 1
      data.amount += v.importo
    }
    const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // 3. Totale per tipo infrazione
    const groupedByType = await prisma.violation.groupBy({
      by: ['tipoInfrazione'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    })

    return NextResponse.json({
      byStatus: groupedByStato,
      trend,
      byType: groupedByType
    })
  } catch (error) {
    console.error('[ADMIN_VIOLATION_STATS_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
