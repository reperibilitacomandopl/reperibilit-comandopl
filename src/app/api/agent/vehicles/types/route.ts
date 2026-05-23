import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const types = await prisma.vehicleType.findMany({
      where: {
        tenantId: session.user.tenantId
      },
      orderBy: {
        descrizione: 'asc'
      }
    })

    return NextResponse.json(types)
  } catch (error) {
    console.error('[VEHICLE_TYPES_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
