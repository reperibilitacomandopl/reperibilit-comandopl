/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notifyAdminActivity } from "@/lib/telegram"
import { resolveTheoreticalShift } from "@/utils/theoretical-shift"
import { isAssenza } from "@/utils/shift-logic"

function getGradoLivello(qualifica: string): number {
  const q = (qualifica || "").toUpperCase()
  if (q.includes("DIRIGENTE GENERALE")) return 1
  if (q.includes("DIRIGENTE SUPERIORE")) return 2
  if (q.includes("DIRIGENTE")) return 3
  if (q.includes("COMANDANTE")) return 4
  if (q.includes("COMMISSARIO SUPERIORE")) return 5
  if (q.includes("COMMISSARIO CAPO")) return 6
  if (q.includes("COMMISSARIO")) return 7
  if (q.includes("VICE COMMISSARIO")) return 8
  if (q.includes("ISPETTORE SUPERIORE")) return 9
  if (q.includes("ISPETTORE CAPO")) return 10
  if (q.includes("VICE ISPETTORE")) return 11
  if (q.includes("SOVRINTENDENTE CAPO")) return 12
  if (q.includes("SOVRINTENDENTE")) return 13
  if (q.includes("VICE SOVRINTENDENTE")) return 14
  if (q.includes("ASSISTENTE SCELTO")) return 15
  if (q.includes("ASSISTENTE")) return 16
  if (q.includes("AGENTE SCELTO")) return 17
  if (q.includes("AGENTE")) return 18
  return 19
}

// Pulisce una stringa rimuovendo doppi spazi e portandola a UpperCase
const superClean = (s: string) => (s || "").toString().toUpperCase().replace(/\s+/g, " ").trim()

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { shifts, importType } = await req.json()
    if (!shifts || !Array.isArray(shifts)) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 })
    }

    // TenantId dalla sessione - Questo è il nostro riferimento unico
    const tenantId = session.user.tenantId || null
    
    // 1. Caricamento anagrafica Command filtrato per tenant
    const allUsers = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, matricola: true, tenantId: true }
    })

    const nameMap = new Map<string, any>()
    const matricolaMap = new Map<string, any>()
    allUsers.forEach(u => {
      if (u.name) nameMap.set(superClean(u.name), u)
      if (u.matricola) matricolaMap.set(String(u.matricola).trim(), u)
    })

    const resolvedOps: any[] = []
    const missingUsers = new Set<string>()

    // 2. Risoluzione Agenti
    for (const shiftData of shifts) {
      const { name, matricola, date, type } = shiftData
      const cleanName = superClean(name)
      const cleanMatricola = matricola ? String(matricola).trim() : ""
      
      let userObj = cleanMatricola ? matricolaMap.get(cleanMatricola) : null
      if (!userObj && cleanName) {
        userObj = nameMap.get(cleanName)
      }

      if (!userObj) {
        if (cleanName) missingUsers.add(cleanName)
        continue
      }

      const targetDate = new Date(date)
      if (isNaN(targetDate.getTime())) continue
      targetDate.setUTCHours(0, 0, 0, 0)
      
      resolvedOps.push({ 
        userId: userObj.id, 
        date: targetDate, 
        type: (type || "RP").toString().trim(),
        tenantId: tenantId // Usiamo sempre il tenantId della sessione per coerenza
      })
    }

    if (resolvedOps.length === 0) {
      const missingList = Array.from(missingUsers).slice(0, 10).join(", ")
      return NextResponse.json({ 
        error: `Nessun agente riconosciuto nel database per questo comando. Mancanti: ${missingList}...` 
      }, { status: 400 })
    }

    // 3. Esecuzione Import
    let processedCount = 0
    const affectedUserIds = [...new Set(resolvedOps.map(op => op.userId))]
    const allDates = resolvedOps.map(op => op.date.getTime())
    const minDate = new Date(Math.min(...allDates))
    const maxDate = new Date(Math.max(...allDates))

    await prisma.$transaction(async (tx) => {
      if (importType === "rep") {
        // Reset REP selettivo: togliamo solo il flag repType per gli agenti e il periodo coinvolto
        await tx.shift.updateMany({
          where: {
            userId: { in: affectedUserIds },
            date: { gte: minDate, lte: maxDate },
            tenantId,
            repType: { not: null }
          },
          data: { repType: null }
        })

        // Carichiamo dati aggiuntivi degli agenti per il controllo pattern stacchi
        const agentsFull = await prisma.user.findMany({
          where: { id: { in: affectedUserIds }, tenantId },
          include: { rotationGroup: true }
        })
        const agentsMap = new Map<string, any>()
        agentsFull.forEach(a => agentsMap.set(a.id, a))

        // Carichiamo anche eventuali assenze già presenti nel DB per il giorno dopo l'ultimo importato
        const nextDayBufferMin = new Date(minDate); nextDayBufferMin.setUTCDate(nextDayBufferMin.getUTCDate() + 1);
        const nextDayBufferMax = new Date(maxDate); nextDayBufferMax.setUTCDate(nextDayBufferMax.getUTCDate() + 1);
        const bufferAbsences = await prisma.absence.findMany({
          where: { userId: { in: affectedUserIds }, date: { gte: nextDayBufferMin, lte: nextDayBufferMax }, tenantId }
        })

        // Upsert per ogni turno: preserva 'type' (M, P, etc) se esiste, crea se nuovo
        for (const op of resolvedOps) {
          // --- LOGICA DI PROTEZIONE STACCO (LOOK-AHEAD) ---
          const tomorrow = new Date(op.date)
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
          
          const tomorrowStatus = resolveTheoreticalShift({
            user: agentsMap.get(op.userId),
            date: tomorrow,
            existingShifts: resolvedOps, // Controlla anche quello che stiamo importando ora (es. se importa tutto il mese)
            existingAbsences: bufferAbsences
          })

          // Se domani l'agente è a riposo/assente, NON importiamo la reperibilità per oggi
          if (isAssenza(tomorrowStatus)) {
            continue 
          }

          await tx.shift.upsert({
            where: {
              userId_date_tenantId: {
                userId: op.userId,
                date: op.date,
                tenantId: tenantId as any 
              }
            },
            update: {
              repType: "rep_i"
            },
            create: {
              userId: op.userId,
              date: op.date,
              tenantId: tenantId,
              type: (op.type && !op.type.toUpperCase().includes("REP")) ? op.type : "RP",
              repType: "rep_i"
            }
          })
          processedCount++
        }
      } else {
        // Import Base: Reset totale nel periodo per questo comando
        await tx.shift.deleteMany({
          where: { userId: { in: affectedUserIds }, date: { gte: minDate, lte: maxDate }, tenantId }
        })
        const res = await tx.shift.createMany({
          data: resolvedOps.map(op => ({ userId: op.userId, date: op.date, tenantId, type: op.type })),
          skipDuplicates: true
        })
        processedCount = res.count
      }
    }, { timeout: 60000 })

    // 4. Report Finale
    const matchCount = affectedUserIds.length
    const msg = `Elaborati ${processedCount} turni per ${matchCount} agenti. I nomi non riconosciuti sono stati saltati.`
    
    try {
      notifyAdminActivity(
        `📊 <b>Importazione Excel (${importType})</b>\n` +
        `✅ Record elaborati: ${processedCount}\n` +
        `👥 Agenti coinvolti: ${matchCount}\n` +
        `⚠️ Nomi non trovati: ${missingUsers.size}\n` +
        `👤 Da: ${session.user.name}`,
        tenantId || undefined
      );
    } catch (e) {}

    return NextResponse.json({ 
      success: true, 
      count: processedCount, 
      message: msg,
      details: {
        matched: matchCount,
        missing: Array.from(missingUsers)
      }
    })
  } catch (error) {
    console.error("[IMPORT ERROR]", error)
    return NextResponse.json({ error: "Errore interno durante il salvataggio" }, { status: 500 })
  }
}
