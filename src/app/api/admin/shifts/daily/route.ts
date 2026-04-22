import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeShiftData } from "@/utils/sync-shift"
import { logAudit } from "@/lib/audit"
import { dailyShiftSchema } from "@/lib/validations/admin"

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

    const [users, shifts, absences, categories, vehicles, certifiedDoc] = await Promise.all([
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
      prisma.vehicle.findMany({ where: { ...tf }, orderBy: { name: "asc" } }),
      prisma.certifiedDocument.findFirst({
        where: { 
          tenantId: tenantId || null,
          type: "ODS",
          metadata: { contains: dateStr }
        }
      })
    ])

    return NextResponse.json({ 
      users, 
      shifts, 
      absences, 
      categories, 
      vehicles,
      isCertified: !!certifiedDoc 
    })
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
    const parsed = dailyShiftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Formato dati non valido", details: parsed.error.format() }, { status: 400 })
    }

    const { date, userId, type, timeRange, serviceCategoryId, serviceTypeId, vehicleId, serviceDetails, patrolGroupId } = parsed.data
    const tenantId = session.user.tenantId

    // VERIFICA CERTIFICAZIONE (HARDENING)
    const certifiedDoc = await prisma.certifiedDocument.findFirst({
      where: { 
        tenantId: tenantId || null,
        type: "ODS",
        metadata: { contains: date }
      }
    })

    if (certifiedDoc) {
      return NextResponse.json({ 
        error: "Non è possibile modificare un Ordine di Servizio già certificato ed emesso. Il sigillo digitale ne garantisce l'integrità." 
      }, { status: 403 })
    }

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

    // Registra nel database l'azione specifica sul turno agente
    const targetAgent = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: existingShift ? "UPDATE_SINGLE_SHIFT" : "CREATE_SINGLE_SHIFT",
      targetId: shift.id,
      targetName: targetAgent ? targetAgent.name : "Agente",
      details: `${existingShift ? "Aggiornato" : "Creato"} O.d.S per ${targetAgent?.name || 'Agente'} in data ${date}. Valori: ${normalized.type} ${normalized.timeRange || ''}`
    })

    return NextResponse.json({ success: true, shift })
  } catch (error) {
    console.error("[DAILY SHIFTS PUT]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
