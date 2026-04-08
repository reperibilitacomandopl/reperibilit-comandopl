import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeShiftData } from "@/utils/sync-shift"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get("date")
    if (!dateStr) return NextResponse.json({ error: "Missing date" }, { status: 400 })

    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}

    const date = new Date(dateStr)
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const [users, shifts, absences, categories, vehicles] = await Promise.all([
      prisma.user.findMany({ 
        where: { ...tf, role: "AGENTE" }, 
        orderBy: { name: "asc" },
        select: { id: true, name: true, matricola: true, isUfficiale: true, qualifica: true, servizio: true, squadra: true, defaultServiceCategoryId: true, defaultServiceTypeId: true }
      }),
      prisma.shift.findMany({ 
        where: { ...tf, date: { gte: startDate, lte: endDate } },
        include: { serviceCategory: true, serviceType: true, vehicle: true }
      }),
      Promise.resolve([]), 
      prisma.serviceCategory.findMany({
        where: { ...tf },
        include: { types: true },
        orderBy: { orderIndex: "asc" }
      }),
      prisma.vehicle.findMany({ where: { ...tf }, orderBy: { name: "asc" } })
    ])

    return NextResponse.json({ users, shifts, absences, categories, vehicles })
  } catch (error) {
    console.error("[DAILY SHIFTS GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { date, userId, type, timeRange, serviceCategoryId, serviceTypeId, vehicleId, serviceDetails, patrolGroupId } = body
    const tenantId = session.user.tenantId

    // Crea la data esattamente a mezzanotte UTC
    const [y, m, d] = date.split("-").map(Number)
    const targetDate = new Date(Date.UTC(y, m - 1, d))

    const startDate = new Date(targetDate)
    const endDate = new Date(targetDate)
    endDate.setUTCHours(23, 59, 59, 999)
    
    const existingShift = await prisma.shift.findFirst({
       where: { tenantId, userId, date: { gte: startDate, lte: endDate } }
    })

    const rawMacro = type !== undefined ? type : (existingShift?.type || "M8");

    const normalized = normalizeShiftData({
      macroType: rawMacro,
      timeRange: timeRange !== undefined ? timeRange : existingShift?.timeRange,
      serviceCategoryId: serviceCategoryId !== undefined ? serviceCategoryId : existingShift?.serviceCategoryId,
      serviceTypeId: serviceTypeId !== undefined ? serviceTypeId : existingShift?.serviceTypeId,
      vehicleId: vehicleId !== undefined ? vehicleId : existingShift?.vehicleId,
      repType: existingShift?.repType
    });

    let shift;
    if (existingShift) {
        shift = await prisma.shift.update({
           where: { id: existingShift.id }, // ID è già univoco, ma per sicurezza findFirst ha filtrato per tenant
           data: {
             type: normalized.type,
             timeRange: normalized.timeRange,
             serviceCategoryId: normalized.serviceCategoryId,
             serviceTypeId: normalized.serviceTypeId,
             vehicleId: normalized.vehicleId,
             serviceDetails: serviceDetails !== undefined ? serviceDetails : existingShift.serviceDetails,
             patrolGroupId: patrolGroupId !== undefined ? patrolGroupId : existingShift.patrolGroupId,
             repType: normalized.repType
           }
        })
    } else {
        shift = await prisma.shift.create({
          data: {
            tenantId,
            userId,
            date: targetDate,
            type: normalized.type, 
            timeRange: normalized.timeRange,
            serviceCategoryId: normalized.serviceCategoryId,
            serviceTypeId: normalized.serviceTypeId,
            vehicleId: normalized.vehicleId,
            serviceDetails,
            patrolGroupId,
            repType: normalized.repType
          }
        })
    }

    return NextResponse.json({ success: true, shift })
  } catch (error) {
    console.error("[DAILY SHIFTS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
