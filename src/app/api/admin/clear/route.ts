import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const ClearSchema = z.object({
  month: z.number(),
  year: z.number(),
  type: z.enum(["all", "base", "rep"]).optional().default("all")
})

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Fail-Safe: Impossibile cancellare i dati senza aver prima selezionato un comando specifico." }, { status: 400 })
  }

  // Rate Limiting: max 5 richieste al minuto
  if (!rateLimit(`clear-${tenantId}`, 5, 60000)) {
    return NextResponse.json({ error: "Troppe richieste (Rate Limit). Riprova tra poco." }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = ClearSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Mese e anno richiesti e validi" }, { status: 400 })
    }

    const { month, year, type } = parsed.data
    const tf = { tenantId }

    const startDate = new Date(Date.UTC(year, month - 1, 1))
    const endDate = new Date(Date.UTC(year, month, 1))

    const commonWhere = {
      ...tf,
      date: { gte: startDate, lt: endDate }
    }

    if (type === "base") {
      // Pulisci solo il turno base
      await prisma.shift.updateMany({
        where: commonWhere,
        data: { 
          type: "", 
          timeRange: null, 
          serviceCategoryId: null, 
          serviceTypeId: null, 
          vehicleId: null, 
          serviceDetails: null 
        }
      })
    } else if (type === "rep") {
      // Pulisci solo la reperibilità
      await prisma.shift.updateMany({
        where: commonWhere,
        data: { repType: null }
      })
    } else {
      // Cancella tutto
      await prisma.shift.deleteMany({
        where: commonWhere
      })
    }

    // Cleanup: elimina record che non hanno né turno né reperibilità
    if (type !== "all") {
      await prisma.shift.deleteMany({
        where: {
          ...commonWhere,
          type: "",
          repType: null
        }
      })
    }
    
    // Aggiorna anche lo stato di pubblicazione se stiamo cancellando "tutto"
    if (type === "all") {
      await prisma.monthStatus.upsert({
        where: { month_year_tenantId: { month, year, tenantId: tenantId || "" } },
        update: { isPublished: false },
        create: { month, year, isPublished: false, tenantId: tenantId || null }
      })
    }

    await logAudit({
      tenantId: tenantId || null,
      adminId: session.user.id!,
      adminName: session.user.name!,
      action: "CLEAR_MONTH",
      details: `Cancellazione periodica per ${month}/${year}. Modalità: ${type}`
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
