// ====== BLOCK CODES ======
// Agent cannot do REP if their base shift is one of these
// Centralized here so both generate/route.ts and generate-agent/route.ts use the same list
export const BLOCK_CODES = [
  "F", "FERIE", 
  "M", "MALATTIA", 
  "104", 
  "RR", "RP", "RPS", 
  "CONGEDO", "ASS", "INFR", 
  "CS", "PNR", "SD", "RF", 
  "AM", "AP"
]
