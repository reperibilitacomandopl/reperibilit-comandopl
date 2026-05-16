import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 1. Get all Clock IN records for today that don't have a corresponding OUT
    const clocksToday = await prisma.clockRecord.findMany({
      where: {
        tenantId,
        timestamp: { gte: today, lt: tomorrow },
        deletedAt: null
      },
      orderBy: { timestamp: 'desc' }
    })

    // Map user to their current status (IN or OUT) based on most recent record
    const userStatus = new Map<string, string>()
    for (const c of clocksToday) {
      if (!userStatus.has(c.userId)) {
         userStatus.set(c.userId, c.type)
      }
    }

    const activeUserIds = Array.from(userStatus.entries())
      .filter(([_, status]) => status === 'IN' || status === 'INGRESSO')
      .map(([userId]) => userId)

    // 2. Get the current shift for these active users to get their Vehicle and Radio
    const shiftsToday = await prisma.shift.findMany({
      where: {
        tenantId,
        userId: { in: activeUserIds },
        date: { gte: today, lt: tomorrow },
        deletedAt: null
      },
      include: {
        vehicle: true,
        radio: true,
        user: {
           select: { id: true, name: true, matricola: true, lastLat: true, lastLng: true, lastSeenAt: true }
        }
      }
    })

    // Format active patrols
    const activePatrols = shiftsToday.map(shift => {
       // Se abbiamo la location dell'utente recente, usiamo quella
       const u = shift.user
       return {
          userId: u.id,
          name: u.name,
          matricola: u.matricola,
          vehicle: shift.vehicle?.name || null,
          radio: shift.radio?.name || null,
          patrolGroupId: shift.patrolGroupId,
          lat: u.lastLat,
          lng: u.lastLng,
          lastSeenAt: u.lastSeenAt
       }
    })

    // 3. Get Active Interventions
    const activeInterventions = await prisma.intervention.findMany({
      where: {
        tenantId,
        status: { notIn: ["COMPLETED", "CANCELED"] }
      },
      include: {
        assignedTo: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
       patrols: activePatrols,
       interventions: activeInterventions
    })

  } catch (error) {
    console.error("[LIVE_MAP_API_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
