import { prisma } from '@/lib/prisma'

export interface CdsViolationResult {
  id: string
  articoloId: string
  comma: string | null
  codice: string | null
  descrizione: string
  sanzione: number
  sanzioneScontata: number | null
  sanzioneAccessoria: string | null
  puntiPatente: number
  sospensione: boolean
  fermo: boolean
  contestoOperativo: string | null
  note: string | null
  paroleChiave: string[]
  score: number
  articolo: {
    id: string
    articolo: number
    titolo: string | null
    rubrica: string | null
  }
}

export async function loadCdsCatalog() {
  return prisma.cdsViolation.findMany({
    include: { articolo: true }
  })
}

export function scoreCatalog(
  violations: any[],
  inputWords: string[],
  inputTesto: string
): CdsViolationResult[] {
  const scored = violations.map((viol: any) => {
    let score = 0
    const paroleChiave = viol.paroleChiave.map((k: string) => k.toLowerCase())
    const descrWords = viol.descrizione.toLowerCase().replace(/[^\w\sàèéìòù]/g, '').split(/\s+/)

    inputWords.forEach((word: string) => {
      if (paroleChiave.some((k: string) => k === word || k.includes(word) || word.includes(k))) {
        score += 3
      }
      if (descrWords.some((w: string) => w === word || w.includes(word))) {
        score += 1
      }
    })

    if (viol.articolo && inputWords.includes(viol.articolo.articolo.toString())) {
      score += 5
    }

    if (viol.codice && inputTesto.includes(viol.codice)) {
      score += 50
    }

    return { ...viol, score }
  })

  return scored
    .filter((v: any) => v.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 50)
}

export interface SearchCdsOptions {
  testo?: string
  articolo?: string
}

export async function searchCdsViolations(options: SearchCdsOptions): Promise<{
  risultati: CdsViolationResult[]
  paroleAnalizzate: string[]
}> {
  const { testo, articolo } = options

  const inputTesto = testo ? testo.toLowerCase() : ""
  const inputWords = [...new Set(inputTesto.replace(/[^\w\sàèéìòù]/g, '').split(/\s+/).filter(w => w.length > 2))]

  const allViolations = await loadCdsCatalog()

  let filtered = allViolations
  if (articolo && articolo.trim() !== "") {
    filtered = allViolations.filter((v: any) => v.articolo?.articolo?.toString() === articolo.trim())
  }

  let risultati: CdsViolationResult[]
  if (inputWords.length > 0) {
    risultati = scoreCatalog(filtered, inputWords, inputTesto)
  } else {
    risultati = filtered
      .sort((a: any, b: any) => (a.comma || "").localeCompare(b.comma || ""))
      .slice(0, 50)
      .map((v: any) => ({ ...v, score: 0 }))
  }

  return { risultati, paroleAnalizzate: inputWords }
}

export function normalizeInput(text: string): string[] {
  return [...new Set(text.toLowerCase().replace(/[^\w\sàèéìòù]/g, '').split(/\s+/).filter(w => w.length > 2))]
}
