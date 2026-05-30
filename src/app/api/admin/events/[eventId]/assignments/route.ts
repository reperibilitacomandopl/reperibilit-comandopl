import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { assignments } = body // array of { userId, serviceType, shiftPeriod, timeRange, ordinaryHours, overtimeHours, projectHours }

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'assignments deve essere un array' }, { status: 400 })
    }

    const event = await prisma.specialEvent.findUnique({
      where: { id: eventId, tenantId: session.user.tenantId }
    })
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })

    // Delete old assignments and recreate
    await prisma.eventAssignment.deleteMany({ where: { eventId } })

    if (assignments.length > 0) {
      await prisma.eventAssignment.createMany({
        data: assignments.map((a: any) => ({
          tenantId: session.user.tenantId,
          eventId,
          userId: a.userId,
          serviceType: a.serviceType || null,
          shiftPeriod: a.shiftPeriod || null,
          timeRange: a.timeRange || '',
          ordinaryHours: parseFloat(a.ordinaryHours) || 0,
          overtimeHours: parseFloat(a.overtimeHours) || 0,
          projectHours: parseFloat(a.projectHours) || 0,
        }))
      })
    }

    const updated = await prisma.specialEvent.findUnique({
      where: { id: eventId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, squadra: true, qualifica: true } } }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[ASSIGNMENTS_PUT]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
