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

const RAW_AGENDA_CATEGORIES = [
  {
    group: "Ferie e Festività", emoji: "🏖️", color: "amber",
    items: [
      { code: "0015", label: "Ferie Anno Corrente" },
      { code: "0016", label: "Ferie Anni Precedenti" },
      { code: "0010", label: "Festività Soppresse" },
      { code: "BR", label: "Blocco Reperibilità" },
    ]
  },
  {
    group: "Congedi", emoji: "👶", color: "rose",
    items: [
      { code: "0112", label: "Congedo di Paternità" },
      { code: "0111", label: "Congedo Parentale 100% Figlio 1" },
      { code: "0110", label: "Congedo Parentale 100% Figlio 2" },
      { code: "0098", label: "Congedo Parentale 80% Figlio 1" },
      { code: "0095", label: "Congedo Parentale 80% Figlio 2" },
      { code: "0097", label: "Congedo Parentale 30% Figlio 1" },
      { code: "0096", label: "Congedo Parentale 30% Figlio 2" },
    ]
  },
  {
    group: "Permessi", emoji: "📋", color: "blue",
    items: [
      { code: "0004", label: "Permessi Istituzionali Non Retribuiti" },
      { code: "0005", label: "Permessi Istituzionali Retribuiti" },
      { code: "0031", label: "Permessi L.104/92 Art.33 Assistito 1" },
      { code: "0038", label: "Permessi L.104/92 Art.33 Assistito 2" },
      { code: "0014", label: "Particolari Motivi Personali o Familiari" },
      { code: "0002", label: "Esercizio Funzioni Elettorali" },
    ]
  },
  {
    group: "Malattia e Salute", emoji: "🏥", color: "red",
    items: [
      { code: "0018", label: "Malattia Figlio 0-3 Anni Figlio 1" },
      { code: "0019", label: "Malattia Figlio 0-3 Anni Figlio 2" },
      { code: "0032", label: "Visite Terapie Prestazioni o Esami Diagnostici" },
      { code: "0054", label: "Controlli Prenatali" },
      { code: "0003", label: "Allattamento" },
      { code: "0035", label: "Donazione Sangue" },
      { code: "0133", label: "Disponibilità Covid-19" },
    ]
  },
  {
    group: "Recupero Ore", emoji: "🔄", color: "teal",
    items: [
      { code: "0009", label: "Recupero A.O." },
      { code: "0067", label: "Recupero Ore Corsi" },
      { code: "0008", label: "Recupero Ore Eccedenti" },
      { code: "0081", label: "Recupero Ore Straord. Elettorale" },
      { code: "0036", label: "Riposo Compensativo Elettorale" },
      { code: "0037", label: "Riposo Recupero PL" },
      { code: "2027", label: "Ore Servizio Elettorale da Recuperare" },
    ]
  },
  {
    group: "Straordinario", emoji: "⏰", color: "orange",
    items: [
      { code: "2000", label: "Straordinario - Pagamento" },
      { code: "2050", label: "Straordinario A.O." },
      { code: "2001", label: "Straordinario Notturno" },
      { code: "2002", label: "Straordinario Festivo Diurno" },
      { code: "2003", label: "Straordinario Festivo Notturno" },
      { code: "2020", label: "Straordinario Elettorale - Diurno" },
      { code: "2021", label: "Straordinario Notturno" },
      { code: "2022", label: "Straordinario Elettorale Festivo Diurno" },
      { code: "2023", label: "Straordinario Elettorale Festivo Notturno" },
      { code: "2026", label: "Straordinario Stato Civile" },
      { code: "10001", label: "Straordinario Stato Civile Notturno" },
      { code: "10002", label: "Straordinario Stato Civile Festivo Diurno" },
      { code: "10003", label: "Straordinario Stato Civile Festivo Notturno" },
    ]
  },
  {
    group: "Formazione e Altro", emoji: "🎓", color: "indigo",
    items: [
      { code: "2041", label: "Corso di Aggiornamento" },
      { code: "10004", label: "Corso di Formazione" },
      { code: "0012", label: "Concorsi ed Esami" },
      { code: "0011", label: "Diritto allo Studio 150 Ore" },
      { code: "0131", label: "Lavoro Agile" },
      { code: "0068", label: "Missione" },
      { code: "0062", label: "Servizio Fuori Sede" },
    ]
  },
]

export const AGENDA_CATEGORIES: AgendaCategory[] = RAW_AGENDA_CATEGORIES.map(cat => ({
  ...cat,
  items: cat.items.map(item => ({
    ...item,
    shortCode: (item as any).shortCode || item.code,
    unit: (item as any).unit || (item.code.startsWith('2') || item.code === "0009" ? "HOURS" : "DAYS")
  }))
})) as AgendaCategory[]

export function getCategoryForCode(code: string) {
  return AGENDA_CATEGORIES.find(c => c.items.some(i => i.code === code))
}

export function paramsToColor(color: string) { return CAT_COLORS[color]?.bar || 'bg-indigo-500' }
