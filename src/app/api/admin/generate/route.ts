import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { generateMonthShifts } from "@/utils/generation-engine"
import { resolveTheoreticalShift } from "@/utils/theoretical-shift"
import { notifyAdminActivity } from "@/lib/telegram"

const GenerateSchema = z.object({
  year: z.union([z.number(), z.string()]).optional(),
  month: z.union([z.number(), z.string()]).optional()
})

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId = session.user.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant isolato richiesto" }, { status: 400 })
  }

  if (!rateLimit(`generate-${tenantId}`, 5, 60000)) {
    return NextResponse.json({ error: "Troppe richieste (Rate Limit). Riprova tra poco." }, { status: 429 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = GenerateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Input non valido" }, { status: 400 })
    }

    // === LOAD SETTINGS ===
    const tf = { tenantId }
    const settings = await prisma.globalSettings.findFirst({ where: tf })
    
    const year = parsed.data.year ? parseInt(String(parsed.data.year), 10) : (settings?.annoCorrente ?? 2026)
    const month = parsed.data.month ? parseInt(String(parsed.data.month), 10) : (settings?.meseCorrente ?? 4)

    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", isActive: true, ...tf },
      include: { rotationGroup: true },
      orderBy: { name: "asc" }
    })

    if (agents.length === 0) {
      return NextResponse.json({ error: "Nessun agente trovato" }, { status: 400 })
    }

    // Load active rules
    const activeRules = await prisma.shiftRule.findMany({
      where: { tenantId, isActive: true }
    })

    // Load shifts for current month + buffer for spacing/eve rules
    const existingShifts = await prisma.shift.findMany({
      where: {
        ...tf,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 2))
        }
      }
    })

    const existingAbsences = await prisma.absence.findMany({
      where: {
        ...tf,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 2))
        }
      }
    })

    // === GHOST LOOK-AHEAD LOGIC ===
    // Inietto il 1° del mese successivo se manca, per proteggere l'ultimo giorno del mese corrente
    const nextMonthFirst = new Date(Date.UTC(year, month, 1))
    
    agents.forEach(agent => {
      // 1. Verifichiamo se l'agente ha già un turno o un'assenza reale salvata per il 1° del mese dopo
      const hasShiftInDB = existingShifts.some(s => 
        s.userId === agent.id && 
        new Date(s.date).getTime() === nextMonthFirst.getTime()
      )
      const hasAbsenceInDB = existingAbsences.some(a => 
        a.userId === agent.id && 
        new Date(a.date).getTime() === nextMonthFirst.getTime()
      )

      // 2. Se non ha nulla nel DB, calcoliamo il teorico (Pattern/Riposo Fisso)
      if (!hasShiftInDB && !hasAbsenceInDB) {
        const theoretical = resolveTheoreticalShift({
          user: agent,
          date: nextMonthFirst,
          existingShifts: [],
          existingAbsences: []
        })

        if (theoretical) {
          // Lo aggiungiamo agli existingShifts caricati in memoria per l'engine
          existingShifts.push({
            userId: agent.id,
            date: nextMonthFirst,
            type: theoretical,
            tenantId: tenantId
          } as any)
        }
      } else if (hasAbsenceInDB && !hasShiftInDB) {
        // Se ha un'assenza ma non un turno, iniettiamo l'assenza per l'engine
        const abs = existingAbsences.find(a => 
          a.userId === agent.id && 
          new Date(a.date).getTime() === nextMonthFirst.getTime()
        )
        existingShifts.push({
          userId: agent.id,
          date: nextMonthFirst,
          type: abs?.code || "ASS",
          tenantId: tenantId
        } as any)
      }
    })

    // === EXECUTE ENGINE ===
    const result = generateMonthShifts(
      agents.map(a => ({ 
        id: a.id, 
        name: a.name, 
        isUfficiale: a.isUfficiale, 
        massimale: a.massimale 
      })),
      existingShifts,
      {
        year,
        month,
        repPerAgente: settings?.massimaleAgente ?? 5,
        repPerUfficiale: settings?.massimaleUfficiale ?? 6,
        minSpacing: settings?.distaccoMinimo ?? 2,
        allowConsecutive: settings?.permettiConsecutivi ?? false,
        usaProporzionale: settings?.usaProporzionale ?? true,
        minUfficiali: settings?.minUfficiali ?? 1,
        checkRestHours: true, // Per ora impostato su true come da discussione
        activeRules
      }
    )

    if (!result.success) throw new Error("Generazione fallita")

    // === PERSIST RESULTS ===
    // Reset REP existing in the month
    await prisma.shift.updateMany({
      where: {
        ...tf,
        date: { 
          gte: new Date(Date.UTC(year, month - 1, 1)), 
          lt: new Date(Date.UTC(year, month, 1)) 
        }
      },
      data: { repType: null }
    })

    // Upsert new shifts
    const upsertPromises = result.newShifts.map(s => (
      prisma.shift.upsert({
        where: { userId_date_tenantId: { userId: s.userId, date: s.date, tenantId: tenantId || "" } },
        update: { repType: s.repType },
        create: { 
          tenantId: tenantId || null, 
          userId: s.userId, 
          date: s.date, 
          type: "", 
          repType: s.repType 
        }
      })
    ))

    const chunkSize = 50
    for (let i = 0; i < upsertPromises.length; i += chunkSize) {
      await Promise.all(upsertPromises.slice(i, i + chunkSize))
    }

    // --- NOTIFICA TELEGRAM DI GENERAZIONE AVVENUTA ---
    await notifyAdminActivity(
      `🧩 <b>Generazione Turni Completata</b>\n\n` +
      `📅 Mese: ${month}/${year}\n` +
      `👤 Operatore: ${session.user.name}\n` +
      `📦 Record Assegnati: ${result.stats.totalAssigned}`,
      tenantId
    );

    return NextResponse.json({
        success: true,
        ...result.stats
    })

  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 })
  }
}
