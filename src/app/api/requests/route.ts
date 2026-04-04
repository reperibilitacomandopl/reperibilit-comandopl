import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { date, endDate, code, notes } = body

    if (!date || !code) {
      return NextResponse.json({ error: "Data e causale obbligatori" }, { status: 400 })
    }

    // Check if a request for this exact date already exists to prevent spam
    const existing = await (prisma as any).agentRequest.findFirst({
      where: {
        userId: session.user.id,
        date: new Date(date),
        status: "PENDING"
      }
    })

    if (existing) {
      return NextResponse.json({ error: "Hai già una richiesta in attesa per questa data." }, { status: 400 })
    }

    const request = await (prisma as any).agentRequest.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        endDate: endDate ? new Date(endDate) : null,
        code,
        notes,
        status: "PENDING"
      }
    })

    return NextResponse.json({ success: true, request })

  } catch (error: any) {
    console.error("Error creating request:", error)
    return NextResponse.json({ error: "Errore interno o database non aggiornato" }, { status: 500 })
  }
}
