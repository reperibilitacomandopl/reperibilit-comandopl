import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const today = new Date()
    const targetDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
    const nextDate = new Date(targetDate)
    nextDate.setDate(targetDate.getDate() + 1)

    // Cerca il turno di oggi per l'utente loggato
    const myShift = await prisma.shift.findFirst({
      where: { userId: session.user.id, date: { gte: targetDate, lt: nextDate } },
      include: { serviceCategory: true, serviceType: true, vehicle: true }
    })
    
    // Se l'agente è in una pattuglia, cerca i colleghi (partners) con lo stesso patrolGroupId
    let partners: any[] = []
    if (myShift?.patrolGroupId) {
       partners = await prisma.shift.findMany({
         where: { patrolGroupId: myShift.patrolGroupId, id: { not: myShift.id } },
         include: { user: { select: { name: true, matricola: true } } }
       })
    }

    return NextResponse.json({ success: true, shift: myShift, partners })
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
