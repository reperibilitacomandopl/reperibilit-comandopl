import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const dateStr = url.searchParams.get("date")
  if (!dateStr) return NextResponse.json({ error: "Missing date" }, { status: 400 })

  try {
    const targetDate = new Date(dateStr)
    const nextDate = new Date(targetDate)
    nextDate.setDate(targetDate.getDate() + 1)

    // Fetch only present people (excluding 104, ferie, malattie depending on how they are coded, but here we fetch all with a Shift and then filter by type)
    const shifts = await prisma.shift.findMany({
      where: {
        date: { gte: targetDate, lt: nextDate },
        // You might want to filter out base types like "F", "M", "104" etc.
      },
      include: {
        user: { select: { id: true, name: true, matricola: true, squadra: true, servizio: true, qualifica: true, defaultServiceCategoryId: true, defaultServiceTypeId: true, isUfficiale: true } },
        serviceCategory: true,
        serviceType: true,
        vehicle: true
      },
      orderBy: { user: { name: 'asc' } }
    })

    return NextResponse.json({ success: true, shifts })
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
      await prisma.shift.update({
        where: { id: update.id },
        data: {
          serviceCategoryId: update.serviceCategoryId !== undefined ? update.serviceCategoryId : undefined,
          serviceTypeId: update.serviceTypeId !== undefined ? update.serviceTypeId : undefined,
          vehicleId: update.vehicleId !== undefined ? update.vehicleId : undefined,
          timeRange: update.timeRange !== undefined ? update.timeRange : undefined,
          patrolGroupId: update.patrolGroupId !== undefined ? update.patrolGroupId : undefined,
          serviceDetails: update.serviceDetails !== undefined ? update.serviceDetails : undefined,
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
