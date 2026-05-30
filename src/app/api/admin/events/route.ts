import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const year = searchParams.get('year')

  try {
    let whereClause: any = { tenantId: session.user.tenantId }
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      whereClause.startDate = { gte: startDate }
      whereClause.endDate = { lte: endDate }
    }

    const events = await prisma.specialEvent.findMany({
      where: whereClause,
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, squadra: true } }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('[EVENTS_GET]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, startDate, endDate, ordinanza, odsNotes, assignments } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    const event = await prisma.specialEvent.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        ordinanza,
        odsNotes,
        assignments: assignments?.length ? {
          create: assignments.map((a: any) => ({
            tenantId: session.user.tenantId,
            userId: a.userId,
            serviceType: a.serviceType || null,
            timeRange: a.timeRange,
            ordinaryHours: parseFloat(a.ordinaryHours) || 0,
            overtimeHours: parseFloat(a.overtimeHours) || 0,
            projectHours: parseFloat(a.projectHours) || 0,
          }))
        } : undefined
      },
      include: { assignments: { include: { user: { select: { id: true, name: true, squadra: true } } } } }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('[EVENTS_POST]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
