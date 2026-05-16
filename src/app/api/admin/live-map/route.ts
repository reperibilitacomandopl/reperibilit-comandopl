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

    // 2. Build patrol list from active users
    let activePatrols: any[] = []
    
    if (activeUserIds.length > 0) {
      // Try to find shifts for today to get vehicle/radio info
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

      const shiftUserIds = new Set(shiftsToday.map((s: any) => s.userId))

      // Users clocked IN but without a shift assigned today — still show them
      const usersWithoutShift = activeUserIds.filter(id => !shiftUserIds.has(id))
      
      if (usersWithoutShift.length > 0) {
        const extraUsers = await prisma.user.findMany({
          where: { id: { in: usersWithoutShift } },
          select: { id: true, name: true, matricola: true, lastLat: true, lastLng: true, lastSeenAt: true }
        })
        for (const u of extraUsers) {
          activePatrols.push({
            userId: u.id, name: u.name, matricola: u.matricola,
            vehicle: null, radio: null, patrolGroupId: null,
            lat: u.lastLat, lng: u.lastLng, lastSeenAt: u.lastSeenAt
          })
        }
      }

      // Format patrols from shifts (with vehicle/radio)
      for (const shift of shiftsToday) {
        const u = (shift as any).user
        activePatrols.push({
          userId: u.id, name: u.name, matricola: u.matricola,
          vehicle: (shift as any).vehicle?.name || null,
          radio: (shift as any).radio?.name || null,
          patrolGroupId: (shift as any).patrolGroupId,
          lat: u.lastLat, lng: u.lastLng, lastSeenAt: u.lastSeenAt
        })
      }
    }

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

    // 4. Get Tenant coordinates (HQ position for map center)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { lat: true, lng: true, name: true }
    })

    return NextResponse.json({
       patrols: activePatrols,
       interventions: activeInterventions,
       hq: tenant ? { lat: tenant.lat, lng: tenant.lng, name: tenant.name } : null
    })

  } catch (error) {
    console.error("[LIVE_MAP_API_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
