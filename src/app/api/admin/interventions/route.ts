import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/push-notifications"

export async function POST(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const data = await req.json()
    // data: type, priority, address, description, callerName, callerPhone, assignedToId
    
    let status = "PENDING"
    let dispatchedAt = null
    
    if (data.assignedToId) {
       status = "DISPATCHED"
       dispatchedAt = new Date()
    }

    const intervention = await prisma.intervention.create({
      data: {
        tenantId,
        type: data.type,
        priority: data.priority,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        description: data.description,
        callerName: data.callerName,
        callerPhone: data.callerPhone,
        status,
        assignedToId: data.assignedToId || null,
        dispatchedAt
      }
    })

    // Invia notifica all'agente assegnato
    if (data.assignedToId) {
       try {
         const alertTitle = data.priority === 'RED' ? '🔴 EMERGENZA' : data.priority === 'YELLOW' ? '🟡 INTERVENTO' : '🟢 SERVIZIO'
         await sendPushNotification(data.assignedToId, {
           title: alertTitle,
           body: `${data.type} in ${data.address}`,
           url: `/${session.user.tenantSlug}/agent/interventi`
         })
       } catch (pushErr) {
         console.error("Failed to send push to agent:", pushErr)
       }
    }

    return NextResponse.json(intervention)

  } catch (error) {
    console.error("[POST_INTERVENTION_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && !session.user.isSuperAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  
  try {
    const data = await req.json()
    const { id, assignedToId, status, notes, outcome, outcomeNotes, address, type, priority, description } = data

    const existing = await prisma.intervention.findUnique({ where: { id } })
    if (!existing || existing.tenantId !== tenantId) {
       return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updateData: any = {
       notes: notes !== undefined ? notes : existing.notes
    }
    
    if (outcome !== undefined) updateData.outcome = outcome
    if (outcomeNotes !== undefined) updateData.outcomeNotes = outcomeNotes
    if (address !== undefined) updateData.address = address
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = priority
    if (description !== undefined) updateData.description = description

    if (status && status !== existing.status) {
       updateData.status = status
       if (status === 'COMPLETED') updateData.completedAt = new Date()
       if (status === 'CANCELED') updateData.completedAt = new Date() // reuse completedAt for canceled
    }

    if (assignedToId !== undefined && assignedToId !== existing.assignedToId) {
       updateData.assignedToId = assignedToId || null
       if (assignedToId) {
          updateData.status = "DISPATCHED"
          updateData.dispatchedAt = new Date()
          
          // Invia Push
          const alertTitle = existing.priority === 'RED' ? '🔴 EMERGENZA' : existing.priority === 'YELLOW' ? '🟡 INTERVENTO' : '🟢 SERVIZIO'
          await sendPushNotification(assignedToId, {
            title: alertTitle,
            body: `${existing.type} in ${existing.address}`,
            url: `/${session.user.tenantSlug}/agent/dashboard?tab=interventions`
          }).catch(console.error)
       } else {
          updateData.status = "PENDING"
       }
    }

    const updated = await prisma.intervention.update({
       where: { id },
       data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PUT_INTERVENTION_ERROR]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
