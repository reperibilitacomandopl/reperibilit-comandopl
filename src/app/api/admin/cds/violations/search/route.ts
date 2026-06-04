import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { searchCdsViolations } from '@/lib/cds-search'

const searchSchema = z.object({
  testo: z.string().optional(),
  articolo: z.string().optional()
}).refine(data => data.testo || data.articolo, {
  message: "Fornisci un testo di ricerca o un articolo"
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const body = await req.json()
    const validationResult = searchSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Dati di ricerca non validi' }, { status: 400 })
    }

    const { testo, articolo } = validationResult.data

    const result = await searchCdsViolations({ testo, articolo })

    return NextResponse.json(result)

  } catch (error) {
    console.error('[ADMIN_CDS_SEARCH_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
