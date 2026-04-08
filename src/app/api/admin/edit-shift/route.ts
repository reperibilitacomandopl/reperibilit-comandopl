// @ts-nocheck
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { normalizeShiftData } from "@/utils/sync-shift"

// PUT: Update or create a single shift/absence for an agent on a specific day
export async function PUT(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  try {
    const { userId, date, type } = await req.json()

    if (!userId || !date) {
      return NextResponse.json({ error: "userId and date are required" }, { status: 400 })
    }

    const targetUser = await prisma.user.findFirst({ 
      where: { id: userId, tenantId: tenantId || null }, 
      select: { name: true } 
    })
    
    if (!targetUser) return NextResponse.json({ error: "Utente non trovato o non appartenente al tuo comando" }, { status: 404 })

    if (!type || type.trim() === "") {
      // Logic: if clearing, we first try to remove the Reperibilità layer.
      // If there was no Reperibilità, we clear the base shift.
      const currentShift = await prisma.shift.findUnique({
        where: { userId_date_tenantId: { userId, date: new Date(date), tenantId: tenantId || "" } }
      })

      if (currentShift?.repType) {
        // Clear only REPERIBILITÀ, keep base shift
        await prisma.shift.update({
          where: { id: currentShift.id, tenantId: tenantId || null },
          data: { repType: null }
        })
      } else {
        // Clear everything (or just the base shift)
        await prisma.shift.deleteMany({
          where: { userId, date: new Date(date), tenantId: tenantId || null }
        })
      }

      await logAudit({
        tenantId,
        adminId: session.user.id!,
        adminName: session.user.name!,
        action: "CLEAR_SHIFT",
        targetId: userId,
        targetName: targetUser?.name,
        details: `Cancellato turno per il giorno ${new Date(date).toLocaleDateString("it-IT")}`
      })

      return NextResponse.json({ success: true, action: "cleared" })
    }

    const valueRaw = type.trim()
    const value = valueRaw.toLowerCase() === "rep" ? "rep" : valueRaw.toUpperCase()
    const isRep = value.toUpperCase().includes("REP")

    // Retrieve existing shift to preserve Operativa/Reperibilità info when updating macro
    const existingShift = await prisma.shift.findUnique({
      where: { userId_date_tenantId: { userId, date: new Date(date), tenantId: tenantId || "" } }
    })

    // Prepare raw input for normalization
    let rawMacro = isRep ? (existingShift?.type || "") : value;
    let rawRep = isRep ? value : (existingShift?.repType || null);

    // Run the pipeline
    const normalized = normalizeShiftData({
      macroType: rawMacro,
      timeRange: existingShift?.timeRange,
      serviceCategoryId: existingShift?.serviceCategoryId,
      serviceTypeId: existingShift?.serviceTypeId,
      vehicleId: existingShift?.vehicleId,
      repType: rawRep
    });

    // Upsert the shift
    await prisma.shift.upsert({
      where: {
        userId_date_tenantId: {
          userId,
          date: new Date(date),
          tenantId: tenantId || ""
        }
      },
      update: {
        type: normalized.type,
        timeRange: normalized.timeRange,
        serviceCategoryId: normalized.serviceCategoryId,
        serviceTypeId: normalized.serviceTypeId,
        vehicleId: normalized.vehicleId,
        repType: normalized.repType
      },
      create: {
        tenantId: tenantId || null,
        userId,
        date: new Date(date),
        type: normalized.type,
        timeRange: normalized.timeRange,
        serviceCategoryId: normalized.serviceCategoryId,
        serviceTypeId: normalized.serviceTypeId,
        vehicleId: normalized.vehicleId,
        repType: normalized.repType
      }
    })

    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "UPDATE_SHIFT",
      targetId: userId,
      targetName: targetUser?.name,
      details: `Aggiornato turno a ${value} per il giorno ${new Date(date).toLocaleDateString("it-IT")}`
    })

    return NextResponse.json({ success: true, action: "saved" })
  } catch (error) {
    console.error("[EDIT SHIFT ERROR]", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
