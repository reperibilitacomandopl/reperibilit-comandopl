import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * POST /api/admin/shifts/copy-month
 * Copia i turni dal mese precedente al mese corrente.
 * Non sovrascrive turni già esistenti nel mese target.
 * 
 * Body: { year: number, month: number }
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const { year, month } = await req.json()
    if (!year || !month) {
      return NextResponse.json({ error: "Anno e mese richiesti" }, { status: 400 })
    }

    const tenantId = session.user.tenantId || null
    const tf = tenantId ? { tenantId } : {}

    // Calcola mese precedente
    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth < 1) {
      prevMonth = 12
      prevYear = year - 1
    }

    // Fetch turni del mese precedente
    const prevShifts = await prisma.shift.findMany({
      where: {
        ...tf,
        date: {
          gte: new Date(Date.UTC(prevYear, prevMonth - 1, 1)),
          lt: new Date(Date.UTC(prevYear, prevMonth, 1)),
        },
      },
      select: {
        userId: true,
        date: true,
        type: true,
        repType: true,
      },
    })

    if (prevShifts.length === 0) {
      return NextResponse.json({ 
        error: `Nessun turno trovato nel mese precedente (${prevMonth}/${prevYear})` 
      }, { status: 404 })
    }

    // Fetch turni già esistenti nel mese target
    const existingShifts = await prisma.shift.findMany({
      where: {
        ...tf,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        },
      },
      select: {
        userId: true,
        date: true,
      },
    })

    // Mappa delle date esistenti per evitare duplicati
    const existingKeys = new Set(
      existingShifts.map((s: { userId: string; date: Date | string }) => `${s.userId}-${new Date(s.date).getUTCDate()}`)
    )

    // Calcola il numero di giorni nel mese target
    const daysInTargetMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

    // Crea i nuovi turni (solo dove non esistono già)
    let created = 0
    let skipped = 0
    const batchData: { userId: string; date: Date; type: string; repType: string | null; tenantId: string | null }[] = []

    for (const shift of prevShifts) {
      const prevDate = new Date(shift.date)
      const dayOfMonth = prevDate.getUTCDate()
      
      // Salta se il giorno non esiste nel mese target
      if (dayOfMonth > daysInTargetMonth) {
        skipped++
        continue
      }

      const key = `${shift.userId}-${dayOfMonth}`
      if (existingKeys.has(key)) {
        skipped++
        continue
      }

      const targetDate = new Date(Date.UTC(year, month - 1, dayOfMonth))
      batchData.push({
        userId: shift.userId,
        date: targetDate,
        type: shift.type || "",
        repType: shift.repType || null,
        tenantId,
      })
      existingKeys.add(key) // Evita duplicati nel batch stesso
      created++
    }

    // Insert in batch
    if (batchData.length > 0) {
      await prisma.shift.createMany({
        data: batchData,
        skipDuplicates: true,
      })
    }

    console.log(`[COPY-MONTH] Copiati ${created} turni da ${prevMonth}/${prevYear} → ${month}/${year}. Saltati: ${skipped}`)

    return NextResponse.json({ 
      success: true, 
      created, 
      skipped,
      source: `${prevMonth}/${prevYear}`,
      target: `${month}/${year}`
    })

  } catch (error: any) {
    console.error("[COPY-MONTH ERROR]", error)
    return NextResponse.json({ error: error.message || "Errore interno" }, { status: 500 })
  }
}
