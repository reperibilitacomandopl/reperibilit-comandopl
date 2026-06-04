import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = await params

    // Verify checkpoint belongs to tenant
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { id, tenantId: session.user.tenantId, deletedAt: null }
    })
    if (!checkpoint) {
      return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
    }

    const vehicles = await prisma.checkedVehicle.findMany({
      where: { checkpointId: id, tenantId: session.user.tenantId },
      orderBy: { oraControllo: 'asc' }
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('[CHECKPOINT_VEHICLES_GET] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id } = await params
    const data = await req.json()

    // Verify checkpoint belongs to tenant
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { id, tenantId: session.user.tenantId, deletedAt: null }
    })
    if (!checkpoint) {
      return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
    }

    if (!data.targa) {
      return NextResponse.json({ error: 'Targa obbligatoria' }, { status: 400 })
    }

    const vehicle = await prisma.checkedVehicle.create({
      data: {
        tenantId: session.user.tenantId,
        checkpointId: id,
        oraControllo: data.oraControllo || null,
        targa: data.targa.toUpperCase(),
        tipoVeicolo: data.tipoVeicolo || null,
        marcaModello: data.marcaModello || null,
        ultimaRevisione: data.ultimaRevisione ? new Date(data.ultimaRevisione) : null,
        assicurazione: data.assicurazione || null,
        assicuratoFino: data.assicuratoFino ? new Date(data.assicuratoFino) : null,
        proprietarioNome: data.proprietarioNome || null,
        proprietarioCognome: data.proprietarioCognome || null,
        proprietarioDataNascita: data.proprietarioDataNascita ? new Date(data.proprietarioDataNascita) : null,
        proprietarioLuogoNascita: data.proprietarioLuogoNascita || null,
        proprietarioResidenza: data.proprietarioResidenza || null,
        proprietarioIndirizzo: data.proprietarioIndirizzo || null,
        conducenteStessoProp: data.conducenteStessoProp || false,
        conducenteNome: data.conducenteNome || null,
        conducenteCognome: data.conducenteCognome || null,
        conducenteDataNascita: data.conducenteDataNascita ? new Date(data.conducenteDataNascita) : null,
        conducenteLuogoNascita: data.conducenteLuogoNascita || null,
        conducenteResidenza: data.conducenteResidenza || null,
        conducenteIndirizzo: data.conducenteIndirizzo || null,
        patenteNumero: data.patenteNumero || null,
        patenteRilasciataDa: data.patenteRilasciataDa || null,
        patenteDataRilascio: data.patenteDataRilascio ? new Date(data.patenteDataRilascio) : null,
        patenteValiditaFino: data.patenteValiditaFino ? new Date(data.patenteValiditaFino) : null,
        passeggeroNome: data.passeggeroNome || null,
        passeggeroCognome: data.passeggeroCognome || null,
        passeggeroDataNascita: data.passeggeroDataNascita ? new Date(data.passeggeroDataNascita) : null,
        passeggeroLuogoNascita: data.passeggeroLuogoNascita || null,
        passeggeroResidenza: data.passeggeroResidenza || null,
        passeggeroIndirizzo: data.passeggeroIndirizzo || null,
        sanzioneElevata: data.sanzioneElevata || null,
        sanzioneAccessoria: data.sanzioneAccessoria || null,
      }
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('[CHECKPOINT_VEHICLES_POST] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
