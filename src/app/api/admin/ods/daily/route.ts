import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

function calculateDurationAndOvertime(timeRange: string | null): { durationHours: number | null, overtimeHours: number | null } {
  if (!timeRange) return { durationHours: null, overtimeHours: null }
  const match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/)
  if (!match) return { durationHours: null, overtimeHours: null }
  
  const [_, h1, m1, h2, m2] = match
  let startMinutes = parseInt(h1, 10) * 60 + parseInt(m1, 10)
  let endMinutes = parseInt(h2, 10) * 60 + parseInt(m2, 10)
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60 // Spostamento al giorno successivo (scavalcamento mezzanotte)
  }
  
  const durationHours = (endMinutes - startMinutes) / 60
  const overtimeHours = Math.max(0, durationHours - 6) // Assumiamo 6 ore come turno base standard
  
  return { durationHours, overtimeHours }
}

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  if (!dateStr) return NextResponse.json({ error: "Missing date" }, { status: 400 })

  try {
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const targetDate = new Date(dateStr)
    const nextDate = new Date(targetDate)
    nextDate.setDate(targetDate.getDate() + 1)

    const [shifts, users, categories, vehicles] = await Promise.all([
      prisma.shift.findMany({
        where: { ...tf, date: { gte: targetDate, lt: nextDate } },
        include: {
          user: { select: { id: true, name: true, matricola: true, squadra: true, servizio: true, qualifica: true, defaultServiceCategoryId: true, defaultServiceTypeId: true, isUfficiale: true } },
          serviceCategory: true,
          serviceType: true,
          vehicle: true
        },
        orderBy: { user: { name: 'asc' } }
      }),
      prisma.user.findMany({ where: { ...tf }, orderBy: { name: 'asc' } }),
      prisma.serviceCategory.findMany({ where: { ...tf }, include: { types: true }, orderBy: { orderIndex: 'asc' } }),
      prisma.vehicle.findMany({ where: { ...tf }, orderBy: { name: 'asc' } })
    ])

    return NextResponse.json({ 
      success: true, 
      shifts,
      users,
      categories,
      vehicles
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { updates } = await req.json()
    // updates is an array of { id: shiftId, serviceCategoryId, serviceTypeId, vehicleId, timeRange, patrolGroupId, serviceDetails }

    for (const update of updates) {
      let durationUpdate = {}
      if (update.timeRange !== undefined) {
        const { durationHours, overtimeHours } = calculateDurationAndOvertime(update.timeRange)
        durationUpdate = { durationHours, overtimeHours }
      }

      await prisma.shift.update({
        where: { id: update.id },
        data: {
          serviceCategoryId: update.serviceCategoryId !== undefined ? update.serviceCategoryId : undefined,
          serviceTypeId: update.serviceTypeId !== undefined ? update.serviceTypeId : undefined,
          vehicleId: update.vehicleId !== undefined ? update.vehicleId : undefined,
          timeRange: update.timeRange !== undefined ? update.timeRange : undefined,
          patrolGroupId: update.patrolGroupId !== undefined ? update.patrolGroupId : undefined,
          serviceDetails: update.serviceDetails !== undefined ? update.serviceDetails : undefined,
          ...durationUpdate
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
