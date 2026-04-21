export interface AgendaItem {
  code: string;
  shortCode: string;
  label: string;
  unit: "DAYS" | "HOURS";
  emoji?: string;
}

export interface AgendaCategory {
  group: string;
  emoji: string;
  color: string;
  items: AgendaItem[];
}

const RAW_AGENDA_CATEGORIES = [
  {
    group: "Ferie e Festività", emoji: "🏖️", color: "amber",
    items: [
      { code: "0015", shortCode: "FERIE", label: "Ferie Anno Corrente" },
      { code: "0016", shortCode: "FERIE_", label: "Ferie Anni Precedenti" },
      { code: "0010", shortCode: "FEST_S", label: "Festività Soppresse" },
      { code: "BR", shortCode: "BR", label: "Blocco Reperibilità" },
    ]
  },
  {
    group: "Congedi", emoji: "👶", color: "rose",
    items: [
      { code: "0112", shortCode: "CONG_P", label: "Congedo di Paternità" },
      { code: "0111", shortCode: "CONG_P", label: "Congedo Parentale 100% Figlio 1" },
      { code: "0110", shortCode: "CONG_P", label: "Congedo Parentale 100% Figlio 2" },
      { code: "0098", shortCode: "CONG_P", label: "Congedo Parentale 80% Figlio 1" },
      { code: "0095", shortCode: "CONG_P", label: "Congedo Parentale 80% Figlio 2" },
      { code: "0097", shortCode: "CONG_P", label: "Congedo Parentale 30% Figlio 1" },
      { code: "0096", shortCode: "CONG_P", label: "Congedo Parentale 30% Figlio 2" },
    ]
  },
  {
    group: "Permessi", emoji: "📋", color: "blue",
    items: [
      { code: "0004", shortCode: "INST_N", label: "Permessi Istituzionali Non Retribuiti" },
      { code: "0005", shortCode: "INST_R", label: "Permessi Istituzionali Retribuiti" },
      { code: "0031", shortCode: "104_1", label: "Permessi L.104/92 Art.33 Assistito 1" },
      { code: "0038", shortCode: "104_2", label: "Permessi L.104/92 Art.33 Assistito 2" },
      { code: "104_1H", shortCode: "104_1H", label: "Permessi L.104/92 Assistito 1 (Ore)" },
      { code: "104_2H", shortCode: "104_2H", label: "Permessi L.104/92 Assistito 2 (Ore)" },
      { code: "0014", shortCode: "MOT_PE", label: "Particolari Motivi Personali o Familiari" },
      { code: "0002", shortCode: "ELETT", label: "Esercizio Funzioni Elettorali" },
    ]
  },
  {
    group: "Malattia e Salute", emoji: "🏥", color: "red",
    items: [
      { code: "MALATTIA", shortCode: "MALATT", label: "Malattia Standard" },
      { code: "0018", shortCode: "MAL_FI", label: "Malattia Figlio 0-3 Anni Figlio 1" },
      { code: "0019", shortCode: "MAL_FI", label: "Malattia Figlio 0-3 Anni Figlio 2" },
      { code: "0032", shortCode: "VISITA", label: "Visite Terapie Prestazioni o Esami Diagnostici" },
      { code: "0054", shortCode: "CONTR_PRE", label: "Controlli Prenatali" },
      { code: "0003", shortCode: "ALLATT", label: "Allattamento" },
      { code: "0035", shortCode: "DON_SA", label: "Donazione Sangue" },
      { code: "0133", shortCode: "COVID", label: "Disponibilità Covid-19" },
    ]
  },
  {
    group: "Recupero Ore", emoji: "🔄", color: "teal",
    items: [
      { code: "0009", shortCode: "RP", label: "Recupero A.O." },
      { code: "0067", shortCode: "REC_CORS", label: "Recupero Ore Corsi" },
      { code: "0008", shortCode: "REC_ECC", label: "Recupero Ore Eccedenti" },
      { code: "0081", shortCode: "REC_ELET", label: "Recupero Ore Straord. Elettorale" },
      { code: "0036", shortCode: "RIP_COMP_EL", label: "Riposo Compensativo Elettorale" },
      { code: "0037", shortCode: "RR", label: "Riposo Recupero PL" },
      { code: "2027", shortCode: "ORE_SERV_EL", label: "Ore Servizio Elettorale da Recuperare" },
    ]
  },
  {
    group: "Straordinario", emoji: "⏰", color: "orange",
    items: [
      { code: "2000", shortCode: "STR", label: "Straordinario - Pagamento" },
      { code: "2050", shortCode: "STR_AO", label: "Straordinario A.O." },
      { code: "2001", shortCode: "STR_NOT", label: "Straordinario Notturno" },
      { code: "2002", shortCode: "STR_FES_DIU", label: "Straordinario Festivo Diurno" },
      { code: "2003", shortCode: "STR_FES_NOT", label: "Straordinario Festivo Notturno" },
      { code: "2020", shortCode: "STR_ELE_DIU", label: "Straordinario Elettorale - Diurno" },
      { code: "2021", shortCode: "STR_NOT_EL", label: "Straordinario Notturno Elettorale" },
      { code: "2022", shortCode: "STR_ELE_FES_DIU", label: "Straordinario Elettorale Festivo Diurno" },
      { code: "2023", shortCode: "STR_ELE_FES_NOT", label: "Straordinario Elettorale Festivo Notturno" },
      { code: "2026", shortCode: "STR_SC", label: "Straordinario Stato Civile" },
      { code: "10001", shortCode: "STR_SC_NOT", label: "Straordinario Stato Civile Notturno" },
      { code: "10002", shortCode: "STR_SC_FES_DIU", label: "Straordinario Stato Civile Festivo Diurno" },
      { code: "10003", shortCode: "STR_SC_FES_NOT", label: "Straordinario Stato Civile Festivo Notturno" },
    ]
  },
  {
    group: "Formazione e Altro", emoji: "🎓", color: "indigo",
    items: [
      { code: "2041", shortCode: "CORS_AGG", label: "Corso di Aggiornamento" },
      { code: "10004", shortCode: "CORSO", label: "Corso di Formazione" },
      { code: "0012", shortCode: "CONCORSI", label: "Concorsi ed Esami" },
      { code: "0150", shortCode: "STUDIO", label: "Diritto allo Studio 150 Ore" },
      { code: "0131", shortCode: "SMART", label: "Lavoro Agile" },
      { code: "0068", shortCode: "MISSIO", label: "Missione" },
      { code: "0062", shortCode: "SERV_FUORI", label: "Servizio Fuori Sede" },
    ]
  },
]

export const AGENDA_CATEGORIES: AgendaCategory[] = RAW_AGENDA_CATEGORIES.map(cat => ({
  ...cat,
  items: cat.items.map(item => ({
    ...item,
    shortCode: (item as any).shortCode || item.code,
    unit: (item as any).unit || (item.code.startsWith('2') || item.code === "0009" || item.code === "104_1H" || item.code === "104_2H" || item.code === "0150" ? "HOURS" : "DAYS")
  }))
})) as AgendaCategory[]

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

export const FERIE_CODES = ["FERIE", "FERIE_", "0015", "0016"]
export const PERMESSI_104_CODES = ["104_1", "104_2", "104_1H", "104_2H", "0031", "0038"]
export const FESTIVITA_CODES = ["FEST_S", "0010"]
export const MALATTIA_CODES = ["MALATT", "MAL_FI", "MALATTIA", "0018", "0019"]
export const RECUPERO_CODES = ["RR", "RP", "0037", "0009"]
export const CONGEDO_CODES = ["CONG_P", "CONG_PAT", "0112", "0111", "0110", "0098", "0095", "0097", "0096"]

export function getCategoryForCode(code: string) {
  return AGENDA_CATEGORIES.find(c => c.items.some(i => i.code === code || i.shortCode === code))
}
