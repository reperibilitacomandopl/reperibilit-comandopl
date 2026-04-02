import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get("date")
    if (!dateStr) return NextResponse.json({ error: "Missing date" }, { status: 400 })

    const date = new Date(dateStr)
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const [users, shifts, absences, categories, vehicles] = await Promise.all([
      prisma.user.findMany({ 
        where: { role: "AGENTE" }, 
        orderBy: { name: "asc" },
        select: { id: true, name: true, matricola: true, isUfficiale: true, qualifica: true, servizio: true, squadra: true, rotationGroup: true }
      }),
      prisma.shift.findMany({ 
        where: { date: { gte: startDate, lte: endDate } },
        include: { serviceCategory: true, serviceType: true, vehicle: true }
      }),
      Promise.resolve([]), // Removed invalid prisma.absence call to preserve array restructuring index
      prisma.serviceCategory.findMany({
        include: { types: true },
        orderBy: { orderIndex: "asc" }
      }),
      prisma.vehicle.findMany({ orderBy: { name: "asc" } })
    ])

    return NextResponse.json({ users, shifts, absences, categories, vehicles })
  } catch (error) {
    console.error("[DAILY SHIFTS GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { date, userId, type, timeRange, serviceCategoryId, serviceTypeId, vehicleId, serviceDetails } = body

    // Crea la data esattamente a mezzanotte UTC come fa l'importazione Excel
    const [y, m, d] = date.split("-").map(Number)
    const targetDate = new Date(Date.UTC(y, m - 1, d))

    // Per sicurezza, siccome l'upsert con unique su DateTime può essere sensibile,
    // troviamo prima il turno esatto (se esiste) in questa giornata
    const startDate = new Date(targetDate)
    const endDate = new Date(targetDate)
    endDate.setUTCHours(23, 59, 59, 999)
    
    const existingShift = await prisma.shift.findFirst({
       where: { userId, date: { gte: startDate, lte: endDate } }
    })

    let shift;
    if (existingShift) {
        shift = await prisma.shift.update({
           where: { id: existingShift.id },
           data: {
             type: type !== undefined ? type : existingShift.type,
             timeRange: timeRange !== undefined ? timeRange : existingShift.timeRange,
             serviceCategoryId: serviceCategoryId !== undefined ? serviceCategoryId : existingShift.serviceCategoryId,
             serviceTypeId: serviceTypeId !== undefined ? serviceTypeId : existingShift.serviceTypeId,
             vehicleId: vehicleId !== undefined ? vehicleId : existingShift.vehicleId,
             serviceDetails: serviceDetails !== undefined ? serviceDetails : existingShift.serviceDetails,
           }
        })
    } else {
        shift = await prisma.shift.create({
          data: {
            userId,
            date: targetDate, // Mezzanotte UTC
            type: type || "M7", 
            timeRange,
            serviceCategoryId,
            serviceTypeId,
            vehicleId,
            serviceDetails
          }
        })
    }

    return NextResponse.json({ success: true, shift })
  } catch (error) {
    console.error("[DAILY SHIFTS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
