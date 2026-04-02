/**
 * Logica centralizzata per la distinzione dei codici turno.
 * Mattina: M7, M8, M7,30 etc.
 * Pomeriggio: P14, P15, P16 etc.
 * Malattia: M, MALATTIA (esatto o alias storici)
 */

export const isMalattia = (code: string | null | undefined): boolean => {
  if (!code) return false;
  const c = code.toUpperCase().trim();
  // Malattia è esattamente "M" o inizia con "MAL"
  return c === "M" || c.startsWith("MALATTIA") || c === "MAL";
};

export const isMattina = (code: string | null | undefined): boolean => {
  if (!code) return false;
  const c = code.toUpperCase().trim();
  // È un turno di mattina se inizia con "M" ma NON è malattia (es. "M7")
  return c.startsWith("M") && !isMalattia(c);
};

export const isPomeriggio = (code: string | null | undefined): boolean => {
  if (!code) return false;
  const c = code.toUpperCase().trim();
  // È un turno di pomeriggio se inizia con "P" (es. "P14")
  return c.startsWith("P");
};

export const isAssenza = (code: string | null | undefined): boolean => {
  if (!code) return false;
  // Rimuovi eventuali parentesi per far combaciare (F) con F
  const c = code.toUpperCase().replace(/[()]/g, '').trim();
  const assenze = ["F", "FERIE", "104", "RR", "RP", "RPS", "CONGEDO", "ASS", "INFR", "CS", "PNR", "SD", "RF", "AM", "AP"];
  return assenze.includes(c) || isMalattia(c);
};

export const isLavoro = (code: string | null | undefined): boolean => {
  return isMattina(code) || isPomeriggio(code);
};

export const formatShiftCode = (prefix: string, timeStr: string | null | undefined): string => {
  if (!timeStr) return prefix;
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const minute = parseInt(m);
  if (isNaN(hour)) return prefix;
  if (!minute) return `${prefix}${hour}`;
  return `${prefix}${hour},${minute}`;
};
