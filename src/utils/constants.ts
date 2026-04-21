import { AgendaCategory } from "./agenda-codes"

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

export const CAT_COLORS: Record<string, { bg: string, text: string, border: string, dot: string, bar: string }> = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400',  bar: 'bg-gradient-to-r from-amber-400 to-amber-600' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',  dot: 'bg-rose-400',   bar: 'bg-gradient-to-r from-rose-400 to-rose-600' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-400',   bar: 'bg-gradient-to-r from-blue-400 to-blue-600' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   dot: 'bg-red-400',    bar: 'bg-gradient-to-r from-red-400 to-red-600' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',  dot: 'bg-teal-400',   bar: 'bg-gradient-to-r from-teal-400 to-teal-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',dot: 'bg-orange-400', bar: 'bg-gradient-to-r from-orange-400 to-orange-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',dot: 'bg-indigo-400', bar: 'bg-gradient-to-r from-indigo-400 to-indigo-600' },
}


export function paramsToColor(color: string) { return CAT_COLORS[color]?.bar || 'bg-indigo-500' }

