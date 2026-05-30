import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request, { params }: { params: { eventId: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const event = await prisma.specialEvent.findUnique({
      where: { id: params.eventId, tenantId: session.user.tenantId },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, squadra: true } }
          }
        }
      }
    })

    if (!event) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })

    return NextResponse.json(event)
  } catch (error) {
    console.error('[EVENT_GET]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { eventId: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, startDate, endDate, ordinanza, odsNotes, assignments } = body

    // 1. Aggiorna i dati dell'evento
    const event = await prisma.specialEvent.update({
      where: { id: params.eventId, tenantId: session.user.tenantId },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ordinanza,
        odsNotes
      }
    })

    // 2. Se vengono passate le assegnazioni, le sovrascrive
    if (assignments && Array.isArray(assignments)) {
      // Elimina quelle vecchie
      await prisma.eventAssignment.deleteMany({
        where: { eventId: params.eventId }
      })

      // Crea le nuove
      if (assignments.length > 0) {
        await prisma.eventAssignment.createMany({
          data: assignments.map((a: any) => ({
            tenantId: session.user.tenantId,
            eventId: params.eventId,
            userId: a.userId,
            timeRange: a.timeRange,
            ordinaryHours: parseFloat(a.ordinaryHours) || 0,
            overtimeHours: parseFloat(a.overtimeHours) || 0,
            projectHours: parseFloat(a.projectHours) || 0,
            equipment: a.equipment || null
          }))
        })
      }
    }

    const updatedEvent = await prisma.specialEvent.findUnique({
      where: { id: params.eventId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, squadra: true } } }
        }
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('[EVENT_PUT]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { eventId: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    await prisma.specialEvent.delete({
      where: { id: params.eventId, tenantId: session.user.tenantId }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EVENT_DELETE]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
