import { isAssenza, isLavoro, isPomeriggio } from "./shift-logic";

/**
 * Deriva programmaticamente un timeRange base (di 6 ore standard) 
 * a partire da un Macro Codice (es. M7 -> 07:00-13:00, M7,30 -> 07:30-13:30)
 */
export function inferTimeRangeFromMacro(macroCode: string): string | null {
  if (!macroCode || isAssenza(macroCode) || !isLavoro(macroCode)) return null;
  
  const c = macroCode.toUpperCase().trim();
  // Estrae lettere iniziali (es. M, P) e il resto (es. 7, 7,30, 14)
  const match = c.match(/^([A-Z]+)(\d+)?(,\d+)?$/);
  if (!match) return null; // Codice anomalo

  const prefix = match[1]; // M o P
  const hourStr = match[2];
  const minStr = match[3];

  let startHour = 0;
  let startMin = 0;

  if (hourStr) {
    startHour = parseInt(hourStr, 10);
    if (minStr) {
      startMin = parseInt(minStr.replace(',', ''), 10);
    }
  } else {
    // Default fallback storici
    if (prefix === "M") startHour = 7;
    else if (prefix === "P") startHour = 14;
    else return null;
  }

  // Turno standard di 6 ore
  const endHour = (startHour + 6) % 24;
  const endMin = startMin;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(startHour)}:${pad(startMin)}-${pad(endHour)}:${pad(endMin)}`;
}

/**
 * Operazione inversa: da un timeRange esatto forzato in Sala Operativa (es. 07:30-13:30), 
 * ricostruisce il Macro Codice (es. M7,30) in modo che la Pianificazione resti sincronizzata.
 */
export function inferMacroFromTimeRange(timeRange: string, fallbackPrefix: string = "M"): string {
  const parts = timeRange.split('-');
  if (parts.length !== 2) return fallbackPrefix;
  
  const startParts = parts[0].split(':');
  if (startParts.length !== 2) return fallbackPrefix;

  const h = parseInt(startParts[0], 10);
  const m = parseInt(startParts[1], 10);

  if (isNaN(h)) return fallbackPrefix;

  // Determina automaticamente se è Mattina o Pomeriggio in base all'orario di ingresso
  let prefix = fallbackPrefix;
  if (h >= 0 && h < 13) prefix = "M"; // Ingresso tra le 0:00 e le 12:59 -> Mattina
  else if (h >= 13 && h < 20) prefix = "P"; // Ingresso tra le 13:00 e le 19:59 -> Pomeriggio
  else prefix = "S"; // Sera/Notte (se usato)

  if (m === 0) return `${prefix}${h}`;
  return `${prefix}${h},${m}`;
}

export type ShiftSyncInput = {
  macroType: string;         // Es. "M7", "MALATTIA", "F"
  timeRange?: string | null; // Es. "07:00-13:00"
  serviceCategoryId?: string | null;
  serviceTypeId?: string | null;
  vehicleId?: string | null;
  radioId?: string | null;
  weaponId?: string | null;
  armorId?: string | null;
  repType?: string | null;
}

export type ShiftSyncOutput = {
  type: string;
  timeRange: string | null;
  serviceCategoryId: string | null;
  serviceTypeId: string | null;
  vehicleId: string | null;
  radioId: string | null;
  weaponId: string | null;
  armorId: string | null;
  repType: string | null;
}

/**
 * IL CERVELLO CENTRALE (Unified Pipeline)
 * Prende un input misto dal frontend e restituisce un Output canonico e blindato.
 * Applica le Leggi della "Sincronizzazione a Muro".
 */
export function normalizeShiftData(input: ShiftSyncInput): ShiftSyncOutput {
  let { macroType, timeRange, serviceCategoryId, serviceTypeId, vehicleId, radioId, weaponId, armorId, repType } = input;
  
  macroType = macroType.trim().toUpperCase();
  
  // LEGGE 1: ASSENZA ASSOLUTA
  // Se è un'assenza, brucia tutto quello che è "Operativo" e "Reperibilità"
  if (isAssenza(macroType)) {
    return {
      type: macroType, // "M", "F", "104", ecc.
      timeRange: null,
      serviceCategoryId: null,
      serviceTypeId: null,
      vehicleId: null,
      radioId: null,
      weaponId: null,
      armorId: null,
      repType: null // Niente reperibilità se sei assente!
    };
  }

  // LEGGE 2 & 3: RETROATTIVITA E NORMALIZZAZIONE
  // Caso A: Se mi passi un timeRange (es. dal drag&drop operativo) ma il macroType discorda,
  // vince il timeRange! Devo aggiustare il macroType.
  if (timeRange && macroType !== 'RIPOSO' && macroType !== '') {
     const computedMacro = inferMacroFromTimeRange(timeRange, isPomeriggio(macroType) ? "P" : "M");
     macroType = computedMacro;
  } 
  // Caso B: Se inserisci SOLO il macroType (dalla Griglia Pianificazione base) e NON hai un timeRange
  // (oppure ne hai uno vecchio scollato), forziamo il timeRange standard derivandolo dal macro.
  else if (!timeRange && isLavoro(macroType)) {
     timeRange = inferTimeRangeFromMacro(macroType);
  }

  return {
    type: macroType,      // Es. "M7,30"
    timeRange: timeRange || null, // Es. "07:30-13:30"
    serviceCategoryId: serviceCategoryId || null,
    serviceTypeId: serviceTypeId || null,
    vehicleId: vehicleId || null,
    radioId: radioId || null,
    weaponId: weaponId || null,
    armorId: armorId || null,
    repType: repType || null
  };
}
