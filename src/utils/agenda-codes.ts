export const AGENDA_CATEGORIES = [
  {
    group: "Ferie e Festività",
    emoji: "🏖️",
    color: "amber",
    items: [
      { code: "0015", shortCode: "FERIE", label: "Ferie Anno Corrente", unit: "DAYS" },
      { code: "0016", shortCode: "FERIE_AP", label: "Ferie Anni Precedenti", unit: "DAYS" },
      { code: "0010", shortCode: "FEST_SOP", label: "Festività Soppresse", unit: "DAYS" },
      { code: "BR", shortCode: "BR", label: "Blocco Reperibilità", unit: "DAYS" },
    ]
  },
  {
    group: "Congedi",
    emoji: "👶",
    color: "rose",
    items: [
      { code: "0112", shortCode: "CONG_PAT", label: "Congedo di Paternità", unit: "DAYS" },
      { code: "0111", shortCode: "CONG_PAR_100_1", label: "Congedo Parentale 100% Figlio 1", unit: "DAYS" },
      { code: "0110", shortCode: "CONG_PAR_100_2", label: "Congedo Parentale 100% Figlio 2", unit: "DAYS" },
      { code: "0098", shortCode: "CONG_PAR_80_1", label: "Congedo Parentale 80% Figlio 1", unit: "DAYS" },
      { code: "0095", shortCode: "CONG_PAR_80_2", label: "Congedo Parentale 80% Figlio 2", unit: "DAYS" },
      { code: "0097", shortCode: "CONG_PAR_30_1", label: "Congedo Parentale 30% Figlio 1", unit: "DAYS" },
      { code: "0096", shortCode: "CONG_PAR_30_2", label: "Congedo Parentale 30% Figlio 2", unit: "DAYS" },
    ]
  },
  {
    group: "Permessi",
    emoji: "📋",
    color: "blue",
    items: [
      { code: "0031", shortCode: "104_1", label: "Permessi L.104/92 Assistito 1", unit: "DAYS" },
      { code: "0038", shortCode: "104_2", label: "Permessi L.104/92 Assistito 2", unit: "DAYS" },
      { code: "0014", shortCode: "MOT_PERS", label: "Particolari Motivi Personali/Familiari", unit: "DAYS" },
      { code: "0002", shortCode: "ELETT", label: "Esercizio Funzioni Elettorali", unit: "DAYS" },
      { code: "0004", shortCode: "INST_NR", label: "Permessi Ist. Non Retribuiti", unit: "HOURS" },
      { code: "0005", shortCode: "INST_R", label: "Permessi Ist. Retribuiti", unit: "HOURS" },
    ]
  },
  {
    group: "Malattia",
    emoji: "🏥",
    color: "red",
    items: [
      { code: "MALATTIA", shortCode: "MALATTIA", label: "Malattia Standard", unit: "DAYS" },
      { code: "0018", shortCode: "MAL_FIGLIO", label: "Malattia Figlio 0-3 Anni", unit: "DAYS" },
      { code: "0032", shortCode: "VISITA", label: "Visite e Prestazioni Specialistiche", unit: "DAYS" },
      { code: "0003", shortCode: "ALLATT", label: "Allattamento", unit: "DAYS" },
      { code: "0035", shortCode: "DON_SANGUE", label: "Donazione Sangue", unit: "DAYS" },
    ]
  },
  {
    group: "Recupero e Straord.",
    emoji: "🔄",
    color: "teal",
    items: [
      { code: "0037", shortCode: "RR", label: "Riposo Recupero PL", unit: "DAYS" },
      { code: "0009", shortCode: "RP", label: "Recupero Straordinari / Ore", unit: "HOURS" },
    ]
  },
  {
    group: "Altro",
    emoji: "🎓",
    color: "indigo",
    items: [
      { code: "10004", shortCode: "CORSO", label: "Corso di Formazione", unit: "DAYS" },
      { code: "0131", shortCode: "SMART", label: "Lavoro Agile", unit: "DAYS" },
      { code: "0068", shortCode: "MISSIONE", label: "Missione", unit: "DAYS" },
    ]
  },
]

export function getCategoryColor(codeOrShortCode: string) {
  for (const cat of AGENDA_CATEGORIES) {
    if (cat.items.some(item => item.code === codeOrShortCode || item.shortCode === codeOrShortCode)) {
      return cat.color
    }
  }
  return "slate"
}

export function getShortCode(codeOrShortCode: string): string {
  for (const cat of AGENDA_CATEGORIES) {
    for (const item of cat.items) {
      if (item.code === codeOrShortCode) return item.shortCode
      if (item.shortCode === codeOrShortCode) return item.shortCode
    }
  }
  return codeOrShortCode
}

export function getLabel(codeOrShortCode: string): string {
  for (const cat of AGENDA_CATEGORIES) {
    for (const item of cat.items) {
      if (item.code === codeOrShortCode || item.shortCode === codeOrShortCode) return item.label
    }
  }
  return codeOrShortCode
}

export function getUnit(codeOrShortCode: string): "DAYS" | "HOURS" {
  for (const cat of AGENDA_CATEGORIES) {
    for (const item of cat.items) {
      if (item.code === codeOrShortCode || item.shortCode === codeOrShortCode) return item.unit as "DAYS" | "HOURS"
    }
  }
  return "DAYS"
}

export const FERIE_CODES = ["FERIE", "FERIE_AP"]
export const PERMESSI_104_CODES = ["104_1", "104_2"]
export const FESTIVITA_CODES = ["FEST_SOP"]
export const MALATTIA_CODES = ["MALATTIA", "MAL_FIGLIO"]
export const RECUPERO_CODES = ["RR", "RP"]
export const CONGEDO_CODES = ["CONG_PAT", "CONG_PAR_100_1", "CONG_PAR_100_2", "CONG_PAR_80_1", "CONG_PAR_80_2", "CONG_PAR_30_1", "CONG_PAR_30_2"]
