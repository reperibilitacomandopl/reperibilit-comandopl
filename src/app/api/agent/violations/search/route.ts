import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const searchSchema = z.object({
  testo: z.string().min(3, "Il testo deve contenere almeno 3 caratteri")
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
      return NextResponse.json({ error: 'Testo non valido' }, { status: 400 })
    }

    const inputTesto = validationResult.data.testo.toLowerCase()
    // Normalizzazione input: rimuove punteggiatura e converte in array di parole uniche lunghe almeno 3 caratteri
    const inputWords = [...new Set(inputTesto.replace(/[^\w\sàèéìòù]/g, '').split(/\s+/).filter(w => w.length > 2))]

    // Recuperiamo tutte le violazioni dal DB con gli articoli collegati
    const allViolations = await prisma.cdsViolation.findMany({
      include: {
        articolo: true
      }
    })

    const scoredViolations = allViolations.map((viol: any) => {
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

      // Bonus se l'agente menziona esplicitamente un numero di articolo (es. "173" o "art 173")
      if (inputWords.includes(viol.articolo.articolo.toString())) {
        score += 5
      }

      return {
        ...viol,
        score
      }
    })

    // Filtriamo i risultati con punteggio maggiore di 0 e li ordiniamo per score decrescente
    const results = scoredViolations
      .filter((v: any) => v.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3) // Ritorniamo solo le top 3 proposte

    return NextResponse.json({
      risultati: results,
      paroleAnalizzate: inputWords
    })

  } catch (error) {
    console.error('[AGENT_VIOLATION_SEARCH_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
