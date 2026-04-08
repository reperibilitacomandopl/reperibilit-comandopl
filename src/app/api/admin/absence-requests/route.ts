import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "ADMIN" && !session?.user?.canManageShifts)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING'

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const requests = await (prisma as any).agentRequest.findMany({
      where: {
        ...(status !== 'ALL' ? { status } : {}),
        ...tf
      },
      include: {
        user: { select: { name: true, matricola: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(requests)
  } catch (error: any) {
    return NextResponse.json({ error: "Errore durante il recupero delle richieste" }, { status: 500 })
  }
}
