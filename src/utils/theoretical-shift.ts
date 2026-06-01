import { isAssenza, isMattina, isPomeriggio, formatShiftCode } from "./shift-logic";

/**
 * Risolve lo stato teorico di un agente in una data specifica.
 * Utile per i controlli sui confini del mese (look-ahead).
 * 
 * Logica di priorità:
 * 1. Turni salvati nel DB (Shift)
 * 2. Assenze salvate nel DB (Absence - Ferie, Malattia, etc.)
 * 3. Pattern di Rotazione (RotationGroup)
 * 4. Riposo Fisso (fixedRestDay)
 */
export function resolveTheoreticalShift({
  user,
  date,
  existingShifts = [],
  existingAbsences = []
}: {
  user: any;
  date: Date;
  existingShifts?: any[];
  existingAbsences?: any[];
}): string {
  const targetDate = new Date(date);
  targetDate.setUTCHours(0,0,0,0);
  const targetTime = targetDate.getTime();

  // 1. Cerca nei turni esistenti (Shift)
  const shift = existingShifts.find(s => {
    const d = new Date(s.date);
    d.setUTCHours(0,0,0,0);
    return d.getTime() === targetTime && s.userId === user.id;
  });
  if (shift && shift.type) return shift.type.toUpperCase().trim();

  // 2. Cerca nelle assenze esistenti (Absence)
  const absence = existingAbsences.find(a => {
    const d = new Date(a.date);
    d.setUTCHours(0,0,0,0);
    return d.getTime() === targetTime && a.userId === user.id;
  });
  if (absence && absence.code) return absence.code.toUpperCase().trim();

  // 3. Calcolo dal Pattern di Rotazione
  if (user.rotationGroup && user.rotationGroup.pattern) {
    let sequence: string[] = [];
    let shiftTimes: Record<string, { start: string; end: string }> = {};

    try {
      const parsed = JSON.parse(user.rotationGroup.pattern);
      if (Array.isArray(parsed)) {
        sequence = parsed;
      } else {
        sequence = parsed.sequence || [];
        shiftTimes = parsed.shiftTimes || {};
      }
    } catch {
      sequence = [];
    }

    if (sequence.length > 0 && user.rotationGroup.startDate) {
      const anchor = new Date(user.rotationGroup.startDate);
      const diffTime = targetDate.getTime() - anchor.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const pLen = sequence.length;
      const patternIndex = ((diffDays % pLen) + pLen) % pLen;
      const pVal = sequence[patternIndex];

      if (pVal) {
        // Se è M o P legacy, usa i campi fissi del gruppo
        if (pVal === "M") return formatShiftCode("M", user.rotationGroup.mStartTime);
        if (pVal === "P") return formatShiftCode("P", user.rotationGroup.pStartTime);
        
        // Se abbiamo un orario specifico salvato per questo codice nel pattern
        if (shiftTimes[pVal]) {
          return formatShiftCode(pVal, shiftTimes[pVal].start);
        }

        return pVal.toUpperCase().trim();
      }
    }
  }

  // 4. Calcolo dal Riposo Fisso
  if (user.fixedRestDay !== null && user.fixedRestDay !== undefined) {
    const dayOfWeek = targetDate.getUTCDay(); // 0=Dom, 1=Lun...
    if (dayOfWeek === user.fixedRestDay) {
      return "R";
    }
  }

  // 5. Calcolo dal Riposo Dinamico (ruota ogni settimana)
  if (user.fixedRestDay === null && user.dynamicRestStartDay != null && user.rotationGroup?.startDate) {
    const anchor = new Date(user.rotationGroup.startDate)
    const dayDiff = Math.floor((targetDate.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24))
    const weekNumber = Math.floor(dayDiff / 7)
    const dynamicRestDay = ((user.dynamicRestStartDay + weekNumber) % 7 + 7) % 7
    if (targetDate.getUTCDay() === dynamicRestDay) {
      return "R"
    }
  }

  return "";
}
