import { DashboardShift } from "@/types/dashboard"
import { isHoliday } from "./holidays"
import { isAssenza } from "./shift-logic"

export interface Agent {
  id: string
  name: string
  isUfficiale: boolean
  massimale?: number | null
}

export interface GenerationOptions {
  year: number
  month: number // 1-indexed (1-12)
  repPerAgente: number
  repPerUfficiale: number
  minSpacing: number
  allowConsecutive: boolean
  usaProporzionale: boolean
  minUfficiali: number
  checkRestHours?: boolean
  activeRules?: any[]
}

export interface GenerationResult {
  success: boolean
  newShifts: { userId: string, date: Date, type: string, repType: string }[]
  stats: {
    totalAssigned: number
    emptyDays: number[]
    warningDays: number[]
    noOfficerDays: number[]
    summary: { name: string, tot: number, fes: number }[]
  }
}

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

function getDayOfWeek(day: number, month: number, year: number): number {
  return new Date(year, month - 1, day).getDay()
}

export function generateMonthShifts(
  agents: Agent[],
  existingShifts: any[], // Shifts for the month + some buffer
  options: GenerationOptions
): GenerationResult {
  const { year, month: month1, repPerAgente, repPerUfficiale, minSpacing: defaultSpacing, allowConsecutive, usaProporzionale, minUfficiali, checkRestHours = false, activeRules = [] } = options
  const month0 = month1 - 1 // JS internal
  const daysInMonth = getDaysInMonth(month1, year)

  // === PARSE DYNAMIC RULES ===
  const forbiddenBaseShifts = new Set<string>();
  const scoreModifiers: { baseShift: string, score: number, target: string }[] = [];
  let minSpacing = defaultSpacing;

  activeRules.forEach(rule => {
    try {
      const cfg = JSON.parse(rule.config);
      if (rule.type === 'DISTANCE' && cfg.minDays !== undefined) {
        minSpacing = cfg.minDays;
      }
      if (rule.type === 'FORBIDDEN_BASE_SHIFT' && cfg.baseShift) {
        forbiddenBaseShifts.add(cfg.baseShift.toUpperCase());
      }
      if (rule.type === 'SCORE_MODIFIER' && cfg.baseShift && cfg.score !== undefined) {
        scoreModifiers.push({ baseShift: cfg.baseShift.toUpperCase(), score: cfg.score, target: rule.targetRole });
      }
    } catch(e) {}
  });

  // === SETUP BASE DATA ===
  const baseShifts: Record<string, Record<string, string>> = {}
  for (const agent of agents) baseShifts[agent.id] = {}
  
  for (const s of existingShifts) {
    const d = new Date(s.date)
    const key = `${d.getUTCDate()}-${d.getUTCMonth()}`
    if (baseShifts[s.userId]) {
      baseShifts[s.userId][key] = s.type || ""
    }
  }

  const isFestivo: Record<number, boolean> = {}
  const isSab: Record<number, boolean> = {}
  const isDom: Record<number, boolean> = {}
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = getDayOfWeek(d, month1, year)
    isSab[d] = dow === 6
    isDom[d] = dow === 0
    isFestivo[d] = isHoliday(new Date(year, month0, d))
  }

  const isBlocked = (agentId: string, d: number): boolean => {
    const checkDate = new Date(Date.UTC(year, month0, d))
    const key = `${checkDate.getUTCDate()}-${checkDate.getUTCMonth()}`
    const shift = (baseShifts[agentId]?.[key] || "").toUpperCase().trim()

    // Regola 1: Assenza dell'agente (INFR, FERIE, RIPOSO, MALATTIA, BR, ecc.)
    // Se l'agente ha un turno normale (M7, P14) anche su un festivo, è OK
    if (isAssenza(shift)) return true;
    
    // Regola Dinamica: Divieti Assoluti (FORBIDDEN_BASE_SHIFT)
    if (forbiddenBaseShifts.has(shift)) return true;
    
    // Regola 2: Se DOMANI l'agente ha un'assenza → no rep oggi (tutela stacco)
    const nextDate = new Date(Date.UTC(year, month0, d + 1))
    const nextKey = `${nextDate.getUTCDate()}-${nextDate.getUTCMonth()}`
    const nextShift = (baseShifts[agentId]?.[nextKey] || "").toUpperCase().trim()
    if (isAssenza(nextShift)) return true;
    
    // Regola 3: Stacco di 11 ore se attivo
    if (checkRestHours && shift) {
      if (shift.includes("N") || nextShift.includes("N")) return true
    }

    return false
  }

  const isVigilia = (d: number): boolean => {
    const nextDayDate = new Date(Date.UTC(year, month0, d + 1))
    return isHoliday(nextDayDate)
  }

  const isGiornoFestivo = (d: number): boolean => {
    return !!(isSab[d] || isDom[d] || isFestivo[d])
  }

  const isFestivoWeekend = (d: number): boolean => {
    return isSab[d] || isDom[d]
  }

  const isFestivoInfrasettimanale = (d: number): boolean => {
    return isFestivo[d] && !isSab[d] && !isDom[d]
  }

  // === CALCULATE TARGETS ===
  const repTarget: Record<string, number> = {}
  let totalTargetGlobal = 0

  for (const agent of agents) {
    // Definizione del target base (Globali del Comando)
    let baseTarget = agent.isUfficiale ? repPerUfficiale : repPerAgente
    
    // Se l'agente ha un massimale specifico impostato (diverso dallo standard del database 8)
    // lo usiamo come override. Altrimenti usiamo quello globale.
    if (agent.massimale && agent.massimale !== 8) {
      baseTarget = agent.massimale
    }

    let availableDays = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isBlocked(agent.id, d)) availableDays++
    }

    if (usaProporzionale) {
      // Logica proporzionale corretta: riduciamo solo se i giorni disponibili sono insufficienti
      // a coprire il target mantenedo un minimo di respiro, o se l'assenza è massiccia.
      // Esempio: se ho 5 turni target su 30 giorni, e ne manco 2, posso ancora fare 5 turni.
      const safetyMargin = Math.max(minSpacing + 1, 3);
      const theoreticalMaxPossible = Math.floor(availableDays / (minSpacing + 1));
      
      let target = baseTarget;
      if (theoreticalMaxPossible < baseTarget) {
        target = theoreticalMaxPossible;
      }
      
      // Assicuriamo almeno 1 turno se l'agente è disponibile almeno un giorno
      if (availableDays > 0 && target < 1) target = 1;
      repTarget[agent.id] = target;
    } else {
      // Se non è proporzionale, cerchiamo di raggiungere il baseTarget o il massimo fisico possibile
      const theoreticalMaxPossible = Math.floor(availableDays / (minSpacing + 1));
      repTarget[agent.id] = Math.min(baseTarget, theoreticalMaxPossible);
    }
    totalTargetGlobal += repTarget[agent.id]
  }

  const dayTarget: Record<number, number> = {}
  // FORZATURA MINIMO 7: Calcoliamo il basePerDay assicurando che sia almeno 7
  let basePerDay = Math.floor(totalTargetGlobal / daysInMonth)
  if (basePerDay < 7) {
    basePerDay = 7
    // Ricalcoliamo il totalTargetGlobal se la forzatura a 7 lo aumenta
    totalTargetGlobal = Math.max(totalTargetGlobal, basePerDay * daysInMonth)
  }
  
  for (let d = 1; d <= daysInMonth; d++) dayTarget[d] = basePerDay
  let extraNeeded = totalTargetGlobal - (basePerDay * daysInMonth)
  for (let d = 1; d <= daysInMonth && extraNeeded > 0; d++) {
    dayTarget[d]++
    extraNeeded--
  }

  // === INIT COUNTERS ===
  const repResults: Record<string, Record<number, string>> = {}
  const repCount: Record<string, number> = {}
  const repFesCount: Record<string, number> = {}
  const numSabati: Record<string, number> = {}
  const numDomeniche: Record<string, number> = {}
  const assignedDays: Record<string, number[]> = {}
  const dayAssigned: Record<number, number> = {}
  const uffAssigned: Record<number, number> = {}

  for (const a of agents) {
    repResults[a.id] = {}
    repCount[a.id] = 0
    repFesCount[a.id] = 0
    numSabati[a.id] = 0
    numDomeniche[a.id] = 0
    assignedDays[a.id] = []
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dayAssigned[d] = 0
    uffAssigned[d] = 0
  }

  // === PHASE -1: EXISTING REPS ===
  for (const s of existingShifts) {
    if (s.repType) {
      const day = new Date(s.date).getUTCDate()
      const monthS = new Date(s.date).getUTCMonth()
      if (monthS === month0) {
        repResults[s.userId][day] = s.repType
        repCount[s.userId]++
        assignedDays[s.userId].push(day)
        dayAssigned[day]++
        if (agents.find(a => a.id === s.userId)?.isUfficiale) uffAssigned[day]++
        if (isGiornoFestivo(day)) repFesCount[s.userId]++
      }
    }
  }
  
  // === PHASE 0.5: UFFICIALI MINIMUM (Ensure at least 1 officer per day BEFORE weekends clump them) ===
  const ufficiali = agents.filter(a => a.isUfficiale)
  for (let d = 1; d <= daysInMonth; d++) {
    if (uffAssigned[d] >= minUfficiali) continue
    const candidates = ufficiali
      .filter(u => repCount[u.id] < repTarget[u.id] && !repResults[u.id][d] && !isBlocked(u.id, d))
      .filter(u => !assignedDays[u.id].some(ad => Math.abs(d - ad) <= minSpacing))
      .sort((a, b) => (repCount[a.id]/repTarget[a.id]) - (repCount[b.id]/repTarget[b.id]))
    
    if (candidates.length > 0) {
      const uff = candidates[0]
      repResults[uff.id][d] = "REP 22-07"
      repCount[uff.id]++
      assignedDays[uff.id].push(d)
      dayAssigned[d]++
      uffAssigned[d]++
      if (isFestivo[d] || isVigilia(d)) repFesCount[uff.id]++
      if (isSab[d]) numSabati[uff.id]++
      if (isDom[d]) numDomeniche[uff.id]++
    }
  }

  // === PHASE 1: MANDATORY WEEKENDS (1 Saturday + 1 Sunday for everyone) ===
  const saturdays = Object.keys(isSab).filter(d => isSab[parseInt(d)]).map(Number);
  const sundays = Object.keys(isDom).filter(d => isDom[parseInt(d)]).map(Number);

  // 1a: Mandatory Saturday
  for (const a of agents) {
    if (repCount[a.id] >= repTarget[a.id]) continue; // Skip if already maxed
    if (repCount[a.id] >= 1 && numSabati[a.id] >= 1) continue;
    const availableSaturdays = saturdays
      .filter(d => !repResults[a.id][d] && !isBlocked(a.id, d) && dayAssigned[d] < dayTarget[d] + 1)
      .filter(d => !assignedDays[a.id].some(ad => Math.abs(d - ad) <= minSpacing))
      .sort((a_day, b_day) => dayAssigned[a_day] - dayAssigned[b_day]);
    
    if (availableSaturdays.length > 0) {
      const d = availableSaturdays[0];
      repResults[a.id][d] = "REP 22-07";
      repCount[a.id]++;
      numSabati[a.id]++;
      assignedDays[a.id].push(d);
      dayAssigned[d]++;
      if (a.isUfficiale) uffAssigned[d]++;
      if (isFestivo[d] || isVigilia(d)) repFesCount[a.id]++;
    }
  }

  // 1b: Mandatory Sunday
  for (const a of agents) {
    if (repCount[a.id] >= repTarget[a.id]) continue; // Skip if already maxed
    if (numDomeniche[a.id] >= 1) continue;
    const availableSundays = sundays
      .filter(d => !repResults[a.id][d] && !isBlocked(a.id, d) && dayAssigned[d] < dayTarget[d] + 1)
      .filter(d => !assignedDays[a.id].some(ad => Math.abs(d - ad) <= minSpacing))
      .sort((a_day, b_day) => dayAssigned[a_day] - dayAssigned[b_day]);
    
    if (availableSundays.length > 0) {
      const d = availableSundays[0];
      repResults[a.id][d] = "REP 22-07";
      repCount[a.id]++;
      numDomeniche[a.id]++;
      assignedDays[a.id].push(d);
      dayAssigned[d]++;
      if (a.isUfficiale) uffAssigned[d]++;
      if (isFestivo[d] || isVigilia(d)) repFesCount[a.id]++;
    }
  }

  // === PHASE 2: BALANCED FILLING (Reach current day target, e.g. 7) ===
  let changesPhase2 = true;
  while (changesPhase2) {
    changesPhase2 = false;
    
    // Sort agents by progress towards their target
    const candidates = agents
      .filter(a => repCount[a.id] < repTarget[a.id])
      .sort((a, b) => {
        const progressA = repCount[a.id] / repTarget[a.id];
        const progressB = repCount[b.id] / repTarget[b.id];
        if (progressA !== progressB) return progressA - progressB;
        return Math.random() - 0.5;
      });

    for (const a of candidates) {
      if (repCount[a.id] >= repTarget[a.id]) continue;

      const validDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (dayAssigned[d] >= dayTarget[d]) continue; // Ferma se il giorno ha raggiunto il target (es. 7)
        if (repResults[a.id][d] || isBlocked(a.id, d)) continue;
        if (assignedDays[a.id].some(ad => Math.abs(d - ad) <= minSpacing)) continue;
        validDays.push(d);
      }

      if (validDays.length > 0) {
        // Logica Bilancio: 3/2 (Agenti) e 4/2 (Ufficiali)
        const targetFes = 2; // Target fisso di festivi richiesto
        const currentFes = repFesCount[a.id];
        const needsFeriale = (repCount[a.id] - currentFes) < (a.isUfficiale ? 4 : 3);
        const needsFestivo = currentFes < targetFes;

        validDays.sort((d1, d2) => {
          // 1. Priorità al tipo di giorno di cui l'agente ha bisogno per il bilancio
          const isFes1 = isGiornoFestivo(d1);
          const isFes2 = isGiornoFestivo(d2);

          if (needsFestivo && !needsFeriale) {
            // Se ha solo 1 festivo (weekend), dai priorità assoluta ai festivi infrasettimanali
            const isWeekend1 = isFestivoWeekend(d1);
            const isWeekend2 = isFestivoWeekend(d2);
            const isInf1 = isFestivoInfrasettimanale(d1);
            const isInf2 = isFestivoInfrasettimanale(d2);

            if (isInf1 && !isInf2) return -1;
            if (!isInf1 && isInf2) return 1;

            if (isFes1 && !isFes2) return -1;
            if (!isFes1 && isFes2) return 1;
          }
          if (needsFeriale && !needsFestivo) {
            if (!isFes1 && isFes2) return -1;
            if (isFes1 && !isFes2) return 1;
          }

          // 1.5 Dynamic Score Modifiers
          const shift1 = (baseShifts[a.id]?.[`${d1}-${month0}`] || "").toUpperCase().trim();
          const shift2 = (baseShifts[a.id]?.[`${d2}-${month0}`] || "").toUpperCase().trim();
          let score1 = 0; let score2 = 0;
          scoreModifiers.forEach(sm => {
             if (sm.target === 'ALL' || (sm.target === 'AGENT' && !a.isUfficiale) || (sm.target === 'OFFICER' && a.isUfficiale)) {
               if (shift1 === sm.baseShift) score1 += sm.score;
               if (shift2 === sm.baseShift) score2 += sm.score;
             }
          });
          if (score1 !== score2) return score1 - score2;

          // 2. Bilancia il carico dei giorni (scegli il giorno meno sguarnito tra quelli validi)
          return dayAssigned[d1] - dayAssigned[d2];
        });

        const d = validDays[0];
        repResults[a.id][d] = "REP 22-07";
        repCount[a.id]++;
        assignedDays[a.id].push(d);
        dayAssigned[d]++;
        if (a.isUfficiale) uffAssigned[d]++;
        if (isGiornoFestivo(d)) repFesCount[a.id]++;
        if (isSab[d]) numSabati[a.id]++;
        if (isDom[d]) numDomeniche[a.id]++;
        changesPhase2 = true;
      }
    }
  }

  // === PHASE 4: REDISTRIBUTION (Move from >7 to <7) ===
  for (let dUnder = 1; dUnder <= daysInMonth; dUnder++) {
    if (dayAssigned[dUnder] >= 7) continue;

    // Troviamo i giorni con esubero (>7)
    const surplusDays = Object.keys(dayAssigned)
      .map(Number)
      .filter(d => dayAssigned[d] > 7)
      .sort((a, b) => dayAssigned[b] - dayAssigned[a]);

    for (const dOver of surplusDays) {
      if (dayAssigned[dUnder] >= 7) break;

      // Cerchiamo un agente assegnato a dOver che può spostarsi a dUnder
      const candidates = agents.filter(a => 
        repResults[a.id][dOver] && 
        !repResults[a.id][dUnder] && 
        !isBlocked(a.id, dUnder) &&
        !assignedDays[a.id].some(ad => ad !== dOver && Math.abs(dUnder - ad) <= minSpacing)
      );

      if (candidates.length > 0) {
        // Spostiamo l'assegnazione
        const a = candidates[0];
        const type = repResults[a.id][dOver];
        delete repResults[a.id][dOver];
        repResults[a.id][dUnder] = type;
        
        assignedDays[a.id] = assignedDays[a.id].filter(ad => ad !== dOver);
        assignedDays[a.id].push(dUnder);
        
        dayAssigned[dOver]--;
        dayAssigned[dUnder]++;
        
        if (isGiornoFestivo(dOver)) repFesCount[a.id]--;
        if (isGiornoFestivo(dUnder)) repFesCount[a.id]++;
      }
    }
  }

  // === PHASE 3: FINAL CATCH-UP (Reach massimale 5/6 ignoring 7 limit, balanced) ===
  // Se gli agenti hanno ancora massimali liberi, riempiamo i giorni più vuoti anche oltre il "dayTarget"
  let changesPhase3 = true;
  while (changesPhase3) {
    changesPhase3 = false;
    
    const candidates = agents
      .filter(a => repCount[a.id] < repTarget[a.id])
      .sort((a, b) => {
        const pA = repCount[a.id] / repTarget[a.id];
        const pB = repCount[b.id] / repTarget[b.id];
        if (pA !== pB) return pA - pB;
        return Math.random() - 0.5;
      });

    for (const a of candidates) {
      if (repCount[a.id] >= repTarget[a.id]) continue;

      const validDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        if (repResults[a.id][d] || isBlocked(a.id, d)) continue;
        if (assignedDays[a.id].some(ad => Math.abs(d - ad) <= minSpacing)) continue;
        validDays.push(d);
      }

      if (validDays.length > 0) {
        let totalFestivi = 0;
        for (const dayStr in repResults[a.id]) {
           const dNum = parseInt(dayStr);
           if (isFestivo[dNum] || isVigilia(dNum) || isSab[dNum] || isDom[dNum]) totalFestivi++;
        }
        const hasReachedFestiviLimit = totalFestivi >= 2;

        validDays.sort((d1, d2) => {
          const isF1 = isFestivo[d1] || isVigilia(d1) || isSab[d1] || isDom[d1];
          const isF2 = isFestivo[d2] || isVigilia(d2) || isSab[d2] || isDom[d2];

          if (hasReachedFestiviLimit) {
            if (!isF1 && isF2) return -1;
            if (isF1 && !isF2) return 1;
          }

          if (dayAssigned[d1] !== dayAssigned[d2]) return dayAssigned[d1] - dayAssigned[d2];

          if (!isF1 && isF2) return -1;
          if (isF1 && !isF2) return 1;

          return 0;
        });
        const bestDay = validDays[0];

        repResults[a.id][bestDay] = "REP 22-07";
        repCount[a.id]++;
        assignedDays[a.id].push(bestDay);
        dayAssigned[bestDay]++;
        if (a.isUfficiale) uffAssigned[bestDay]++;
        if (isFestivo[bestDay] || isVigilia(bestDay)) repFesCount[a.id]++;
        if (isSab[bestDay]) numSabati[a.id]++;
        if (isDom[bestDay]) numDomeniche[a.id]++;
        
        changesPhase3 = true;
      }
    }
  }

  // === PREPARE OUTPUT ===
  const newShifts: any[] = []
  for (const agentId in repResults) {
    for (const day in repResults[agentId]) {
      newShifts.push({
        userId: agentId,
        date: new Date(Date.UTC(year, month0, parseInt(day))),
        type: "",
        repType: repResults[agentId][day]
      })
    }
  }

  return {
    success: true,
    newShifts,
    stats: {
      totalAssigned: newShifts.length,
      emptyDays: Object.keys(dayAssigned).filter(d => dayAssigned[parseInt(d)] === 0).map(Number),
      warningDays: [], // Simplified for now
      noOfficerDays: Object.keys(uffAssigned).filter(d => uffAssigned[parseInt(d)] === 0).map(Number),
      summary: agents.map(a => ({ name: a.name, tot: repCount[a.id], fes: repFesCount[a.id] }))
    }
  }
}
