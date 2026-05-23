import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const searchSchema = z.object({
  testo: z.string().optional(),
  articolo: z.string().optional()
}).refine(data => data.testo || data.articolo, {
  message: "Fornisci un testo di ricerca o un articolo"
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await req.json()
    const validationResult = searchSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Dati di ricerca non validi' }, { status: 400 })
    }

    const { testo, articolo } = validationResult.data

    const inputTesto = testo ? testo.toLowerCase() : ""
    // Normalizzazione input: rimuove punteggiatura e converte in array di parole uniche lunghe almeno 3 caratteri
    const inputWords = [...new Set(inputTesto.replace(/[^\w\sàèéìòù]/g, '').split(/\s+/).filter(w => w.length > 2))]

    // Recuperiamo tutte le violazioni dal DB con gli articoli collegati
    const allViolations = await prisma.cdsViolation.findMany({
      include: {
        articolo: true
      }
    })

    // Se fornito l'articolo, filtriamo direttamente
    let filteredViolations = allViolations
    if (articolo && articolo.trim() !== "") {
      filteredViolations = allViolations.filter((v: any) => v.articolo.articolo.toString() === articolo.trim())
    }

    let results = []
    
    if (inputWords.length > 0) {
      const scoredViolations = filteredViolations.map((viol: any) => {
        let score = 0
        const paroleChiave = viol.paroleChiave.map((k: string) => k.toLowerCase())
        const descrWords = viol.descrizione.toLowerCase().replace(/[^\w\sàèéìòù]/g, '').split(/\s+/)
        
        // Match 1: Parole chiave esatte definite nel DB (peso alto)
        inputWords.forEach((word: string) => {
          if (paroleChiave.some((k: string) => k === word || k.includes(word) || word.includes(k))) {
            score += 3
          }
          // Match 2: Parole presenti nella descrizione (peso medio)
          if (descrWords.some((w: string) => w === word || w.includes(word))) {
            score += 1
          }
        })

        // Bonus se l'agente menziona esplicitamente un numero di articolo
        if (inputWords.includes(viol.articolo.articolo.toString())) {
          score += 5
        }
        
        // Match esatto con il codice infrazione EGAF (es. "16075")
        if (viol.codice && inputTesto.includes(viol.codice)) {
          score += 50 // Punteggio altissimo per farla apparire per prima
        }

        return {
          ...viol,
          score
        }
      })

      // Filtriamo i risultati con punteggio maggiore di 0 e li ordiniamo per score decrescente
      results = scoredViolations
        .filter((v: any) => v.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 50) // Limite aumentato a 50
    } else {
      // Se c'è solo l'articolo (senza testo), restituiamo tutte le violazioni per quell'articolo
      results = filteredViolations
        .sort((a: any, b: any) => (a.comma || "").localeCompare(b.comma || ""))
        .slice(0, 50)
    }

    return NextResponse.json({
      risultati: results,
      paroleAnalizzate: inputWords
    })

  } catch (error) {
    console.error('[AGENT_VIOLATION_SEARCH_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
