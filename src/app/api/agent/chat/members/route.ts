import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const patrolGroupId = searchParams.get('patrolGroupId')

    if (!patrolGroupId) {
      return NextResponse.json({ error: "patrolGroupId mancante" }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let members: any[] = []

    if (patrolGroupId.startsWith("SECTION_")) {
      const sectionId = patrolGroupId.replace("SECTION_", "")
      
      // Fetch users assigned to this category today
      const shifts = await prisma.shift.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          OR: [
            { serviceCategoryId: sectionId },
            { patrolGroupId: patrolGroupId } // Special case for added members
          ]
        },
        include: {
          user: {
            select: { id: true, name: true, isUfficiale: true, qualifica: true }
          }
        }
      })
      
      // Unique members
      const memberMap = new Map()
      shifts.forEach(s => {
        if (!memberMap.has(s.user.id)) {
          memberMap.set(s.user.id, s.user)
        }
      })
      members = Array.from(memberMap.values())
    } else {
      // Regular patrol group
      const shifts = await prisma.shift.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          patrolGroupId: patrolGroupId
        },
        include: {
          user: {
            select: { id: true, name: true, isUfficiale: true, qualifica: true }
          }
        }
      })
      members = shifts.map(s => s.user)
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error("GET /api/agent/chat/members error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    // Solo ufficiali o admin possono aggiungere membri
    if (!session?.user?.isUfficiale && session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Azione permessa solo agli ufficiali" }, { status: 403 })
    }

    const { patrolGroupId, userId } = await req.json()

    if (!patrolGroupId || !userId) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Trova se l'utente ha già un turno oggi
    const existingShift = await prisma.shift.findFirst({
      where: {
        userId,
        date: today
      }
    })

    if (existingShift) {
      // Aggiorna il turno esistente aggiungendo il patrolGroupId
      // Nota: non cambiamo la categoria di servizio originale per non rovinare le statistiche,
      // ma aggiungiamo il patrolGroupId che serve per la chat.
      await prisma.shift.update({
        where: { id: existingShift.id },
        data: { patrolGroupId }
      })
    } else {
      // Crea un turno di supporto per permettere la partecipazione alla chat
      await prisma.shift.create({
        data: {
          userId,
          date: today,
          tenantId: session.user.tenantId,
          type: "SUPPLEMENTARE",
          timeRange: "00:00-23:59",
          patrolGroupId,
          serviceDetails: "Aggiunto manualmente alla chat reparto/pattuglia"
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/agent/chat/members error:", error)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
