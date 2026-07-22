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

function generateNameVariants(fullName: string): { full: string[], initials: string[] } {
  const clean = superClean(fullName).replace(/[.,]/g, "")
  const parts = clean.split(" ").filter(Boolean)
  if (parts.length === 0) return { full: [], initials: [] }

  const fullSet = new Set<string>()
  const initSet = new Set<string>()

  fullSet.add(clean)
  fullSet.add(parts.slice().reverse().join(" "))

  if (parts.length >= 2) {
    const firstWord = parts[0]
    const lastWord = parts[parts.length - 1]
    const firstInit = firstWord[0]
    const lastInit = lastWord[0]

    const restAfterFirst = parts.slice(1).join(" ")
    initSet.add(`${firstInit} ${restAfterFirst}`)
    initSet.add(`${firstInit}. ${restAfterFirst}`)

    const restBeforeLast = parts.slice(0, parts.length - 1).join(" ")
    initSet.add(`${restBeforeLast} ${lastInit}`)
    initSet.add(`${restBeforeLast} ${lastInit}.`)
  }

  return { full: Array.from(fullSet), initials: Array.from(initSet) }
}

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
    const initialsMap = new Map<string, any>()
    const matricolaMap = new Map<string, any>()
    const rawDigitsMap = new Map<string, any>()

    allUsers.forEach((u: any) => {
      if (u.name) {
        const { full, initials } = generateNameVariants(u.name)
        full.forEach(v => nameMap.set(v, u))
        initials.forEach(v => {
          if (!initialsMap.has(v)) initialsMap.set(v, u)
        })
      }
      if (u.matricola) {
        const m = String(u.matricola).trim()
        matricolaMap.set(m, u)
        matricolaMap.set(m.replace(/^0+/, ""), u) // Senza zeri iniziali
        const digits = m.replace(/\D/g, "")
        if (digits) rawDigitsMap.set(digits, u)
      }
    })

    const resolvedOps: any[] = []
    const missingUsers = new Set<string>()

    // 2. Risoluzione Agenti
    for (const shiftData of shifts) {
      const { name, matricola, date, type } = shiftData
      const cleanName = superClean(name)
      const cleanMatricola = matricola ? String(matricola).trim() : ""
      const digitsMatricola = cleanMatricola.replace(/\D/g, "")
      
      let userObj = null
      if (cleanMatricola) {
        userObj = matricolaMap.get(cleanMatricola) 
          || matricolaMap.get(cleanMatricola.replace(/^0+/, "")) 
          || rawDigitsMap.get(digitsMatricola)
      }
      if (!userObj && cleanName) {
        // Se cleanName è numerico o ha matricola, prova la ricerca per matricola
        const nameDigits = cleanName.replace(/\D/g, "")
        if (nameDigits) {
          userObj = matricolaMap.get(cleanName) 
            || matricolaMap.get(cleanName.replace(/^0+/, ""))
            || rawDigitsMap.get(nameDigits)
        }
        if (!userObj) {
          userObj = nameMap.get(cleanName) || nameMap.get(cleanName.replace(/[.,]/g, ""))
        }
        if (!userObj) {
          userObj = initialsMap.get(cleanName) || initialsMap.get(cleanName.replace(/[.,]/g, ""))
        }
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

    await prisma.$transaction(async (tx: any) => {
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
        agentsFull.forEach((a: any) => agentsMap.set(a.id, a))

        // Carichiamo anche eventuali assenze già presenti nel DB per il giorno dopo l'ultimo importato
        const nextDayBufferMin = new Date(minDate); nextDayBufferMin.setUTCDate(nextDayBufferMin.getUTCDate() + 1);
        const nextDayBufferMax = new Date(maxDate); nextDayBufferMax.setUTCDate(nextDayBufferMax.getUTCDate() + 1);
        const bufferAbsences = await prisma.absence.findMany({
          where: { userId: { in: affectedUserIds }, date: { gte: nextDayBufferMin, lte: nextDayBufferMax }, tenantId }
        })

        // Upsert per ogni turno: preserva 'type' (M, P, etc) se esiste, crea se nuovo
        for (const op of resolvedOps) {
          // Logica di protezione stacco rimossa per import manuale Excel
          /*
          const tomorrow = new Date(op.date)
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
          
          const tomorrowStatus = resolveTheoreticalShift({
            user: agentsMap.get(op.userId),
            date: tomorrow,
            existingShifts: resolvedOps, 
            existingAbsences: bufferAbsences
          })

          if (isAssenza(tomorrowStatus)) {
            continue 
          }
          */

          await tx.shift.upsert({
            where: {
              userId_date_tenantId: {
                userId: op.userId,
                date: op.date,
                tenantId: tenantId as any 
              }
            },
            update: {
              repType: "rep_i",
              deletedAt: null
            },
            create: {
              userId: op.userId,
              date: op.date,
              tenantId: tenantId,
              type: (op.type && !op.type.toUpperCase().includes("REP")) ? op.type : "RP",
              repType: "rep_i",
              deletedAt: null
            }
          })
          processedCount++
        }
      } else {
        // Import Base: Reset totale nel periodo per questo comando
        // NOTA: Usiamo una query raw per assicurarci di fare un HARD DELETE 
        // ed evitare blocchi dovuti al Soft Delete di Prisma su record esistenti.
        for (const userId of affectedUserIds) {
          await tx.$executeRaw`DELETE FROM "Shift" WHERE "userId" = ${userId} AND "date" >= ${minDate} AND "date" <= ${maxDate} AND "tenantId" = ${tenantId}`
        }

        const res = await tx.shift.createMany({
          data: resolvedOps.map(op => ({ 
            userId: op.userId, 
            date: op.date, 
            tenantId, 
            type: op.type || "RP" 
          })),
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
