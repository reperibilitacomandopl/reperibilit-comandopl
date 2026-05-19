import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { status, code, hours, notes } = body

    // C3 FIX: Verificare ownership + autorizzazione prima di modificare
    const existing = await prisma.agentRequest.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })

    const isOwner = existing.userId === session.user.id
    const isAdmin = session.user.role === "ADMIN" || session.user.isSuperAdmin
    const isOfficer = session.user.isUfficiale

    // Solo admin/ufficiali possono cambiare lo status
    if (status && !isAdmin && !isOfficer) {
      return NextResponse.json({ error: "Non autorizzato a modificare lo stato" }, { status: 403 })
    }

    // Un agente può modificare solo le proprie richieste e solo se in stato PENDING
    if (!isAdmin && !isOfficer) {
      if (!isOwner) {
        return NextResponse.json({ error: "Non puoi modificare richieste altrui" }, { status: 403 })
      }
      if (!existing.status.startsWith("PENDING")) {
        return NextResponse.json({ error: "Non puoi modificare una richiesta già processata" }, { status: 403 })
      }
    }

    // Isolamento multi-tenant: verifica che la richiesta appartenga allo stesso tenant
    if (existing.tenantId && existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const request = await prisma.agentRequest.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(code && { code }),
        ...(hours !== undefined && { hours: parseFloat(hours) || null }),
        ...(notes !== undefined && { notes })
      }
    })
    
    return NextResponse.json({ success: true, request })
  } catch (error) {
    return NextResponse.json({ error: "Errore durante l'aggiornamento" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    
    const existing = await prisma.agentRequest.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 })

    // C4 FIX: Verificare ownership + autorizzazione prima di cancellare
    const isOwner = existing.userId === session.user.id
    const isAdmin = session.user.role === "ADMIN" || session.user.isSuperAdmin

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Non puoi eliminare richieste altrui" }, { status: 403 })
    }

    // Un agente può cancellare solo richieste in stato PENDING
    if (!isAdmin && !existing.status.startsWith("PENDING")) {
      return NextResponse.json({ error: "Non puoi eliminare una richiesta già processata" }, { status: 403 })
    }

    // Isolamento multi-tenant
    if (existing.tenantId && existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.agentRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Errore durante l'eliminazione" }, { status: 500 })
  }
}
