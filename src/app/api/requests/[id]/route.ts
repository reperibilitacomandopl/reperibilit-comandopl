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

    await prisma.agentRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Errore durante l'eliminazione" }, { status: 500 })
  }
}
