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
    let pattern: string[] = [];
    try {
      pattern = JSON.parse(user.rotationGroup.pattern);
    } catch {
      pattern = [];
    }

    if (pattern.length > 0 && user.rotationGroup.startDate) {
      const anchor = new Date(user.rotationGroup.startDate);
      const diffTime = targetDate.getTime() - anchor.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const patternIndex = ((diffDays % 28) + 28) % 28;
      const pVal = pattern[patternIndex];

      if (pVal) {
        // Se è M o P, converti nel codice completo se possibile
        if (pVal === "M") return formatShiftCode("M", user.rotationGroup.mStartTime);
        if (pVal === "P") return formatShiftCode("P", user.rotationGroup.pStartTime);
        return pVal.toUpperCase().trim();
      }
    }
  }

  // 4. Calcolo dal Riposo Fisso
  if (user.fixedRestDay !== null && user.fixedRestDay !== undefined) {
    const dayOfWeek = targetDate.getUTCDay(); // 0=Dom, 1=Lun...
    if (dayOfWeek === user.fixedRestDay) {
      // Se è il riposo fisso (es. Lunedì), verifichiamo se ha lavorato la domenica precedente (logica RP)
      // Per semplicità nel look-ahead, se è il giorno di riposo fisso, lo consideriamo "R"
      return "R";
    }
  }

  return "";
}
