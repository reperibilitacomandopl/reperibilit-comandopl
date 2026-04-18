import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getLabel } from '@/utils/agenda-codes'

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, endDate, code, notes, startTime, endTime, hours } = body

    if (!date || !code) {
      return NextResponse.json({ error: "Data e causale obbligatori" }, { status: 400 })
    }

    const tenantId = session.user.tenantId

    const existing = await prisma.agentRequest.findFirst({
      where: {
        userId: session.user.id,
        date: new Date(date),
        status: "PENDING",
        tenantId: tenantId || null
      }
    })

    if (existing) {
      return NextResponse.json({ error: "Hai già una richiesta in attesa per questa data." }, { status: 400 })
    }

    const request = await prisma.agentRequest.create({
      data: {
        tenantId: tenantId || null,
        userId: session.user.id,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        startTime: startTime || null,
        endTime: endTime || null,
        hours: hours ? parseFloat(hours) : null,
        code,
        notes,
        status: "PENDING"
      }
    })

    // --- NOTIFICA PER GLI ADMIN ---
    try {
      const admins = await prisma.user.findMany({
        where: { 
          tenantId: tenantId || null,
          role: "ADMIN"
        },
        select: { id: true }
      })

      if (admins.length > 0) {
        const label = getLabel(code)

        await (prisma as any).notification.createMany({
          data: admins.map(admin => ({
            tenantId: tenantId || null,
            userId: admin.id,
            title: "Nuova Richiesta",
            message: `${session.user.name} ha richiesto ${label} per il ${new Date(date).toLocaleDateString("it-IT")}.`,
            type: "REQUEST",
            link: `/admin/richieste`,
            metadata: JSON.stringify({ requestId: request.id })
          }))
        })
      }
    } catch (notifyError) {
      console.error("Error creating notification for admins:", notifyError)
    }

    return NextResponse.json({ success: true, request })

  } catch (error: any) {
    console.error("Error creating request:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
