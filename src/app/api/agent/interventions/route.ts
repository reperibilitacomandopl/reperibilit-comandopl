import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const today = new Date()
    today.setHours(0,0,0,0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Trova il turno dell'agente oggi
    const myShift = await prisma.shift.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
        deletedAt: null
      }
    })

    let userIdsToCheck = [session.user.id]

    // Se ha un turno con veicolo o gruppo, trova i colleghi
    if (myShift && (myShift.vehicleId || myShift.patrolGroupId)) {
      const matchCriteria: any[] = []
      if (myShift.vehicleId) matchCriteria.push({ vehicleId: myShift.vehicleId })
      if (myShift.patrolGroupId) matchCriteria.push({ patrolGroupId: myShift.patrolGroupId })
      
      const partnerShifts = await prisma.shift.findMany({
        where: {
          tenantId,
          date: { gte: today, lt: tomorrow },
          deletedAt: null,
          OR: matchCriteria
        },
        select: { userId: true }
      })
      userIdsToCheck = [...new Set([...userIdsToCheck, ...partnerShifts.map((s: any) => s.userId)])]
    }

    const interventions = await prisma.intervention.findMany({
      where: {
        tenantId,
        assignedToId: { in: userIdsToCheck },
        status: { notIn: ["COMPLETED", "CANCELED"] }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(interventions)
  } catch (error) {
    console.error("[GET_AGENT_INTERVENTIONS_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const { id, action, outcome, outcomeNotes } = await req.json()
    // action: "ACCEPT", "ARRIVE", "COMPLETE"

    const existing = await prisma.intervention.findUnique({ where: { id } })
    if (!existing || existing.tenantId !== tenantId || existing.assignedToId !== session.user.id) {
       return NextResponse.json({ error: "Not found or not assigned to you" }, { status: 404 })
    }

    const updateData: any = {}
    
    if (action === "ACCEPT" && existing.status === "DISPATCHED") {
       updateData.status = "ACCEPTED"
       updateData.acceptedAt = new Date()
    } else if (action === "ARRIVE" && existing.status === "ACCEPTED") {
       updateData.status = "ON_SITE"
       updateData.arrivedAt = new Date()
    } else if (action === "COMPLETE" && existing.status === "ON_SITE") {
       updateData.status = "COMPLETED"
       updateData.completedAt = new Date()
       if (outcome) updateData.outcome = outcome // POSITIVO, NEGATIVO, INFONDATO
       if (outcomeNotes) updateData.outcomeNotes = outcomeNotes
    } else {
       return NextResponse.json({ error: "Invalid action for current status" }, { status: 400 })
    }

    const updated = await prisma.intervention.update({
       where: { id },
       data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT_AGENT_INTERVENTION_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
