import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // 1. Troviamo gli utenti che hanno una posizione recente (es. ultime 24 ore) 
    // e che sono attivi nel comando.
    const agents = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        lastSeenAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Solo chi si è mosso nelle ultime 24h
        }
      },
      select: {
        id: true,
        name: true,
        matricola: true,
        qualifica: true,
        lastLat: true,
        lastLng: true,
        lastSeenAt: true
      }
    })

    // 2. Troviamo anche l'ultimo stato di timbratura per ogni agente per essere sicuri
    // (Potevamo farlo nel query sopra, ma così è più pulito per la logica di business)
    const activeAgents = []

    for (const agent of agents) {
      const lastClock = await prisma.clockRecord.findFirst({
        where: { userId: agent.id, tenantId },
        orderBy: { timestamp: 'desc' }
      })

      // Se l'agente ha fatto OUT o non ha mai fatto IN oggi, non lo mostriamo sulla mappa
      // per rispettare il requisito di privacy.
      if (lastClock && lastClock.type === 'IN') {
        // Verifica se l'agente ha un SOS attivo (PENDING) negli ultimi 60 minuti
        const activeSos = await prisma.emergencyAlert.findFirst({
          where: {
            adminId: agent.id,
            tenantId,
            status: "PENDING",
            date: {
              gte: new Date(Date.now() - 60 * 60 * 1000)
            }
          }
        })

        activeAgents.push({
          ...agent,
          isClockedIn: true,
          isSosActive: !!activeSos
        })
      }
    }

    return NextResponse.json({ success: true, agents: activeAgents })
  } catch (error) {
    console.error("[FETCH_AGENTS_LOCATION_ERROR]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
