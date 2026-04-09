import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isHoliday } from "@/utils/holidays"
import { isAssenza } from "@/utils/shift-logic"

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getDayOfWeek(day: number, month: number, year: number): number {
  return new Date(year, month, day).getDay()
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && !session?.user?.canManageShifts) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { year: reqYear, month: reqMonth } = await req.json()
    const tenantId = session.user.tenantId
    const tf = tenantId ? { tenantId } : {}
    
    const settings = await prisma.globalSettings.findFirst({ where: { ...tf } })
    const year = reqYear ? parseInt(reqYear, 10) : (settings?.annoCorrente ?? 2026)
    const month = reqMonth ? parseInt(reqMonth, 10) - 1 : ((settings?.meseCorrente ?? 4) - 1)
    const daysInMonth = getDaysInMonth(month, year)

    const agents = await prisma.user.findMany({
      where: { role: "AGENTE", isActive: true, ...tf },
      orderBy: { name: "asc" }
    })

    if (agents.length === 0) {
      return NextResponse.json({ error: "Nessun agente attivo trovato" }, { status: 400 })
    }

    // Pescaggio spinto al +2 del mese successivo per leggere i turni e rispettare le ore di stacco "fine mese"
    const existingShifts = await prisma.shift.findMany({
      where: {
        ...tf,
        date: {
          gte: new Date(Date.UTC(year, month, 1)),
          lt: new Date(Date.UTC(year, month + 1, 2))
        }
      }
    })

    const baseShifts: Record<string, Record<string, string>> = {}
    const repResults: Record<string, Record<number, string>> = {}
    const repCount: Record<string, number> = {}
    const numSabati: Record<string, number> = {}
    const numDomeniche: Record<string, number> = {}
    const assignedDays: Record<string, number[]> = {}
    const dayAssigned: Record<number, number> = {}

    for (const a of agents) {
      baseShifts[a.id] = {}
      repResults[a.id] = {}
      repCount[a.id] = 0
      numSabati[a.id] = 0
      numDomeniche[a.id] = 0
      assignedDays[a.id] = []
    }
    
    for (let d = 1; d <= daysInMonth; d++) dayAssigned[d] = 0

    const isSab: Record<number, boolean> = {}
    const isDom: Record<number, boolean> = {}

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = getDayOfWeek(d, month, year)
      isSab[d] = dow === 6
      isDom[d] = dow === 0
    }

    // Caricamento Dati
    for (const s of existingShifts) {
      const d = new Date(s.date)
      const key = `${d.getUTCDate()}-${d.getUTCMonth()}`
      if (baseShifts[s.userId]) baseShifts[s.userId][key] = s.type
      
      if (s.repType && d.getUTCMonth() === month) {
        const day = d.getUTCDate()
        if (repResults[s.userId]) {
          repResults[s.userId][day] = s.repType
          repCount[s.userId]++
          assignedDays[s.userId].push(day)
          dayAssigned[day]++
          if (isSab[day]) numSabati[s.userId]++
          if (isDom[day]) numDomeniche[s.userId]++
        }
      }
    }

    function isBlockedByAbsence(agentId: string, d: number): boolean {
      const checkDate = new Date(Date.UTC(year, month, d))
      const key = `${checkDate.getUTCDate()}-${checkDate.getUTCMonth()}`
      const shift = (baseShifts[agentId]?.[key] || "").toUpperCase().trim()
      return isAssenza(shift)
    }

    // CHECK MATTINA (Sotto le 11h di stacco)
    function hasMorningShift(agentId: string, d: number): boolean {
      const checkDate = new Date(Date.UTC(year, month, d))
      const key = `${checkDate.getUTCDate()}-${checkDate.getUTCMonth()}`
      const shift = (baseShifts[agentId]?.[key] || "").toUpperCase().trim()
      return shift.startsWith("M") 
    }

    function hasEveningShift(agentId: string, d: number): boolean {
      const checkDate = new Date(Date.UTC(year, month, d))
      const key = `${checkDate.getUTCDate()}-${checkDate.getUTCMonth()}`
      const shift = (baseShifts[agentId]?.[key] || "").toUpperCase().trim()
      return shift.startsWith("P") || shift.startsWith("S") 
    }

    // Calcolo target per "chiudere un buco"
    let basePerDay = 6;
    if (settings && settings.massimaleAgente && agents.length > 0) {
       const uffs = agents.filter(a => a.isUfficiale).length
       const totalTarget = (uffs * (settings.massimaleUfficiale ?? 6)) + ((agents.length - uffs) * (settings.massimaleAgente ?? 5))
       basePerDay = Math.floor(totalTarget / daysInMonth)
       if (basePerDay < 5) basePerDay = 5 
    }

    let holesResolved = 0
    let changesLog: string[] = []
    
    // START ALGORITMO
    for (let day = 1; day <= daysInMonth; day++) {
      if (dayAssigned[day] >= basePerDay) continue; // Livello accettabile, Skippo.

      const candidates: { agentId: string, score: number, isUff: boolean }[] = []

      for (const agent of agents) {
        // [1] Limite Mensile (Gerarchia: Agente specifico > Setting Globale > Fallback)
        let maxRep = 5 // Fallback prudenziale
        if (agent.isUfficiale) {
          maxRep = settings?.massimaleUfficiale || 6
        } else {
          maxRep = settings?.massimaleAgente || 5
        }
        
        // Se l'agente ha un massimale personalizzato nel profilo (diverso dal default 8 di Prisma) lo usiamo
        if (agent.massimale && agent.massimale !== 8) {
          maxRep = agent.massimale
        }

        if (repCount[agent.id] >= maxRep) continue;

        // [2] Turnover: già assegnato oggi o ieri/domani?
        if (repResults[agent.id][day]) continue;
        if (repResults[agent.id][day - 1] || repResults[agent.id][day + 1]) continue;

        // [3] Protezione Assenze Correnti e Indomani
        if (isBlockedByAbsence(agent.id, day)) continue;
        if (isBlockedByAbsence(agent.id, day + 1)) continue;

        // [4] SALVAGUARDIA 11H (Scarto chi ha il MAttina l'indomani)
        if (hasMorningShift(agent.id, day + 1)) continue;

        let score = (repCount[agent.id] / Math.max(1, maxRep)) * 1000 
        
        // [5] Equità WEEKEND: Do priorità a chi non ha ancora fatto alcun Sab/Dom.  
        if (isSab[day]) {
           if (numSabati[agent.id] > 0) score += 5000; else score -= 2000;
        }
        if (isDom[day]) {
           if (numDomeniche[agent.id] > 0) score += 5000; else score -= 2000;
        }

        // [6] Pre-Stacco (Fresco vs Stanco)
        if (hasEveningShift(agent.id, day)) score += 500; // Penalizzato (stacca alle 22)
        if (hasMorningShift(agent.id, day)) score -= 500; // Avvantaggiato (stacca alle 14 e ha tempo per dormire)

        if (agent.isUfficiale) score += 100;

        candidates.push({ agentId: agent.id, score, isUff: agent.isUfficiale })
      }

      candidates.sort((a, b) => a.score - b.score)

      while (dayAssigned[day] < basePerDay && candidates.length > 0) {
        const best = candidates.shift()!
        
        repResults[best.agentId][day] = "REP 22-07"
        repCount[best.agentId]++
        assignedDays[best.agentId].push(day)
        dayAssigned[day]++
        if (isSab[day]) numSabati[best.agentId]++
        if (isDom[day]) numDomeniche[best.agentId]++

        holesResolved++
        changesLog.push(`Giorno ${day}: Assegnato ${agents.find(a => a.id === best.agentId)?.name}`)
      }
    }

    // Salva le modifiche Elettroniche (ma non tocca i tuoi turni base!)
    const upsertPromises: any[] = []
    for (const agent of agents) {
      for (let day = 1; day <= daysInMonth; day++) {
        if (repResults[agent.id][day]) {
          upsertPromises.push(prisma.shift.upsert({
            where: { userId_date_tenantId: { userId: agent.id, date: new Date(Date.UTC(year, month, day)), tenantId: tenantId || "" } },
            update: { repType: repResults[agent.id][day] },
            create: { tenantId: tenantId || null, userId: agent.id, date: new Date(Date.UTC(year, month, day)), type: "", repType: repResults[agent.id][day] }
          }))
        }
      }
    }
    const chunkSize = 50
    for (let i = 0; i < upsertPromises.length; i += chunkSize) await Promise.all(upsertPromises.slice(i, i + chunkSize))

    return NextResponse.json({ 
      success: true, 
      holesResolved,
      changesLog
    })
  } catch (error) {
    console.error("Resolve Holes error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 })
  }
}
