import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const violationSchema = z.object({
  targa: z.string().min(1, 'Targa obbligatoria'),
  tipoInfrazione: z.string().min(1, 'Tipo infrazione obbligatorio'),
  articoloCDS: z.string().min(1, 'Articolo CDS obbligatorio'),
  importo: z.number().positive('L\'importo deve essere positivo'),
  puntiPatente: z.number().int().min(0).optional().default(0),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  foto: z.array(z.string()).optional(),
  documentType: z.string().optional().default('VERBALE'),
  motivoMancataContestazione: z.string().optional().nullable(),
  // Dati trasgressore
  trasgressoreNome: z.string().optional().nullable(),
  trasgressoreCognome: z.string().optional().nullable(),
  patenteNumero: z.string().optional().nullable(),
  // Dati veicolo
  marcaVeicolo: z.string().optional().nullable(),
  modelloVeicolo: z.string().optional().nullable(),
  coloreVeicolo: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await req.json()
    const validationResult = violationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Dati non validi', 
        details: validationResult.error.issues 
      }, { status: 400 })
    }

    const data = validationResult.data

    const violation = await prisma.violation.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        targa: data.targa.toUpperCase(),
        tipoInfrazione: data.tipoInfrazione,
        articoloCDS: data.articoloCDS,
        importo: data.importo,
        puntiPatente: data.puntiPatente || 0,
        lat: data.lat,
        lng: data.lng,
        indirizzo: data.indirizzo,
        note: data.note,
        foto: data.foto || [],
        documentType: data.documentType,
        motivoMancataContestazione: data.motivoMancataContestazione,
        trasgressoreNome: data.trasgressoreNome,
        trasgressoreCognome: data.trasgressoreCognome,
        patenteNumero: data.patenteNumero,
        marcaVeicolo: data.marcaVeicolo,
        modelloVeicolo: data.modelloVeicolo,
        coloreVeicolo: data.coloreVeicolo,
        stato: 'EMESSO'
      }
    })

    return NextResponse.json(violation, { status: 201 })
  } catch (error) {
    console.error('[AGENT_VIOLATION_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const violations = await prisma.violation.findMany({
      where: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(violations)
  } catch (error) {
    console.error('[AGENT_VIOLATION_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
