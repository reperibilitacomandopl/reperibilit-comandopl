export const AGENDA_CATEGORIES = [
  {
    group: "Ferie e Festività",
    emoji: "🏖️",
    color: "amber",
    items: [
      { code: "0015", shortCode: "FERIE", label: "Ferie Anno Corrente" },
      { code: "0016", shortCode: "FERIE_AP", label: "Ferie Anni Precedenti" },
      { code: "0010", shortCode: "FEST_SOP", label: "Festività Soppresse" },
    ]
  },
  {
    group: "Congedi",
    emoji: "👶",
    color: "rose",
    items: [
      { code: "0112", shortCode: "CONG_PAT", label: "Congedo di Paternità" },
      { code: "0111", shortCode: "CONG_PAR", label: "Congedo Parentale" },
    ]
  },
  {
    group: "Permessi",
    emoji: "📋",
    color: "blue",
    items: [
      { code: "0031", shortCode: "104", label: "Permessi L.104/92" },
      { code: "0014", shortCode: "MOT_PERS", label: "Particolari Motivi Personali/Familiari" },
      { code: "0002", shortCode: "ELETT", label: "Esercizio Funzioni Elettorali" },
    ]
  },
  {
    group: "Malattia",
    emoji: "🏥",
    color: "red",
    items: [
      { code: "MALATTIA", shortCode: "MALATTIA", label: "Malattia Standard" },
      { code: "0018", shortCode: "MAL_FIGLIO", label: "Malattia Figlio 0-3 Anni" },
      { code: "0032", shortCode: "VISITA", label: "Visite e Prestazioni Specialistiche" },
      { code: "0003", shortCode: "ALLATT", label: "Allattamento" },
      { code: "0035", shortCode: "DON_SANGUE", label: "Donazione Sangue" },
    ]
  },
  {
    group: "Recupero",
    emoji: "🔄",
    color: "teal",
    items: [
      { code: "0037", shortCode: "RR", label: "Riposo Recupero PL" },
      { code: "0009", shortCode: "RP", label: "Recupero A.O. / Straordinari" },
    ]
  },
  {
    group: "Altro",
    emoji: "🎓",
    color: "indigo",
    items: [
      { code: "10004", shortCode: "CORSO", label: "Corso di Formazione" },
      { code: "0131", shortCode: "SMART", label: "Lavoro Agile" },
      { code: "0068", shortCode: "MISSIONE", label: "Missione" },
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
