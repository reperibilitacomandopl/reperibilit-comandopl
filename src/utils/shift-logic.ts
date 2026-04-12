/**
 * Logica centralizzata per la distinzione dei codici turno.
 * 
 * CODICI UNIFICATI (shortCode da agenda-codes.ts):
 * Turni:     M7, M8, P14, P15, etc.
 * Ferie:     FERIE, FERIE_AP, FEST_SOP
 * Permessi:  104, MOT_PERS, ELETT
 * Congedi:   CONG_PAT, CONG_PAR
 * Malattia:  MALATTIA, MAL_FIGLIO, VISITA, ALLATT, DON_SANGUE
 * Recupero:  RR, RP
 * Altro:     CORSO, SMART, MISSIONE
 * 
 * RETROCOMPATIBILITÀ: riconosce anche i codici storici (F, M, MAL, 104, etc.)
 */

export const isMalattia = (code: string | null | undefined): boolean => {
  if (!code) return false;
  const c = code.toUpperCase().trim();
  return c === "M" || c === "MAL" || c === "MALATTIA" || c === "MAL_FIGLIO" 
    || c === "VISITA" || c === "ALLATT" || c === "DON_SANGUE"
    || c === "0018" || c === "0032" || c === "0003" || c === "0035";
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
  return c.startsWith("P");
};

export const isAssenza = (code: string | null | undefined): boolean => {
  if (!code) return false;
  const c = code.toUpperCase().replace(/[()]/g, '').trim();
  
  // Tutti i codici di assenza (shortCode + storici)
  const assenze = [
    // Ferie
    "F", "FERIE", "FERIE_AP", "FEST_SOP",
    // Permessi
    "104", "MOT_PERS", "ELETT",
    // Congedi
    "CONG_PAT", "CONG_PAR", "CONGEDO",
    // Recupero
    "RR", "RP", "RPS",
    // Blocco
    "BR",
    // Altro
    "CORSO", "SMART", "MISSIONE",
    // Storici
    "ASS", "INFR", "CS", "PNR", "SD", "RF", "AM", "AP"
  ];
  
  return assenze.includes(c) || isMalattia(c);
};

export const isLavoro = (code: string | null | undefined): boolean => {
  return isMattina(code) || isPomeriggio(code);
};

/**
 * Assenze che devono essere PROTETTE dai reset automatici.
 * (Ferie, Malattia, 104, Missioni, Corso, etc.)
 * Esclude esplicitamente i riposi generati (RP, RR).
 */
export const isAssenzaProtetta = (code: string | null | undefined): boolean => {
  if (!code) return false;
  const c = code.toUpperCase().replace(/[()]/g, '').trim();
  
  // Lista di codici da PROTEGGERE (NON cancellare al reset)
  const protette = [
    // Ferie
    "F", "FERIE", "FERIE_AP", "FEST_SOP",
    // Permessi
    "104", "MOT_PERS", "ELETT",
    // Congedi
    "CONG_PAT", "CONG_PAR", "CONGEDO",
    // Altro
    "CORSO", "SMART", "MISSIONE",
    "BR",
    // Storici (esclusi RP/RR)
    "ASS", "INFR", "CS", "PNR", "SD", "RF", "AM", "AP"
  ];
  
  return protette.includes(c) || isMalattia(c);
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
