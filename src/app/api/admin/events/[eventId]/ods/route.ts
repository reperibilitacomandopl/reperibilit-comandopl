import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { generateEventODSPDF } from '@/utils/pdf-generator'

export async function GET(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  try {
    const event = await prisma.specialEvent.findUnique({
      where: { id: eventId, tenantId: session.user.tenantId },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, squadra: true } }
          }
        },
        tenant: { select: { name: true } }
      }
    })

    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 })

    const assignments = event.assignments.map((a: any) => ({
      name: a.user.name,
      serviceType: a.serviceType || '',
      timeRange: a.timeRange || '',
      ordinaryHours: a.ordinaryHours || 0,
      overtimeHours: a.overtimeHours || 0,
      projectHours: a.projectHours || 0,
    }))

    const pdfBuffer = await generateEventODSPDF({
      eventName: event.name,
      eventDescription: event.description || '',
      startDate: event.startDate,
      endDate: event.endDate,
      ordinanza: event.ordinanza || '',
      odsNotes: event.odsNotes || '',
      assignments,
      tenantName: event.tenant?.name || 'Comando Polizia Locale',
    })

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ODS_Evento_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('[EVENT_ODS_ERROR]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
