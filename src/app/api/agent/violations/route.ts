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
  trasgressoreDataNascita: z.string().optional().nullable(),
  trasgressoreLuogoNascita: z.string().optional().nullable(),
  trasgressoreIndirizzo: z.string().optional().nullable(),
  trasgressoreComuneResidenza: z.string().optional().nullable(),
  // Dati obbligato in solido
  obbligatoNome: z.string().optional().nullable(),
  obbligatoCognome: z.string().optional().nullable(),
  obbligatoPartitaIva: z.string().optional().nullable(),
  obbligatoIndirizzo: z.string().optional().nullable(),
  obbligatoComuneResidenza: z.string().optional().nullable(),
  // Dati patente
  patenteNumero: z.string().optional().nullable(),
  patenteEnteRilascio: z.string().optional().nullable(),
  patenteDataRilascio: z.string().optional().nullable(),
  patenteDataScadenza: z.string().optional().nullable(),
  patenteCategoria: z.string().optional().nullable(),
  // Dati veicolo
  tipoVeicolo: z.string().optional().nullable(),
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
        trasgressoreDataNascita: data.trasgressoreDataNascita ? new Date(data.trasgressoreDataNascita) : null,
        trasgressoreLuogoNascita: data.trasgressoreLuogoNascita,
        trasgressoreIndirizzo: data.trasgressoreIndirizzo,
        trasgressoreComuneResidenza: data.trasgressoreComuneResidenza,
        obbligatoNome: data.obbligatoNome,
        obbligatoCognome: data.obbligatoCognome,
        obbligatoPartitaIva: data.obbligatoPartitaIva,
        obbligatoIndirizzo: data.obbligatoIndirizzo,
        obbligatoComuneResidenza: data.obbligatoComuneResidenza,
        patenteNumero: data.patenteNumero,
        patenteEnteRilascio: data.patenteEnteRilascio,
        patenteDataRilascio: data.patenteDataRilascio ? new Date(data.patenteDataRilascio) : null,
        patenteDataScadenza: data.patenteDataScadenza ? new Date(data.patenteDataScadenza) : null,
        patenteCategoria: data.patenteCategoria,
        tipoVeicolo: data.tipoVeicolo,
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
