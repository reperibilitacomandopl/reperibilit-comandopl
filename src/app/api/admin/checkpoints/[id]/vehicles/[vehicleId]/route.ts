import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; vehicleId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id, vehicleId } = await params
    const data = await req.json()

    // Verify tenant ownership
    const vehicle = await prisma.checkedVehicle.findFirst({
      where: { id: vehicleId, checkpointId: id, tenantId: session.user.tenantId }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Veicolo non trovato' }, { status: 404 })
    }

    const updateData: any = {}
    // String fields
    const stringFields = [
      'oraControllo', 'targa', 'tipoVeicolo', 'marcaModello', 'assicurazione',
      'proprietarioNome', 'proprietarioCognome', 'proprietarioLuogoNascita',
      'proprietarioResidenza', 'proprietarioIndirizzo',
      'conducenteNome', 'conducenteCognome', 'conducenteLuogoNascita',
      'conducenteResidenza', 'conducenteIndirizzo',
      'patenteNumero', 'patenteRilasciataDa',
      'passeggeroNome', 'passeggeroCognome', 'passeggeroLuogoNascita',
      'passeggeroResidenza', 'passeggeroIndirizzo',
      'sanzioneElevata', 'sanzioneAccessoria'
    ]
    for (const f of stringFields) {
      if (data[f] !== undefined) {
        updateData[f] = f === 'targa' ? (data[f] || '').toUpperCase() : (data[f] || null)
      }
    }

    // Date fields
    const dateFields = [
      'ultimaRevisione', 'assicuratoFino', 'proprietarioDataNascita',
      'conducenteDataNascita', 'patenteDataRilascio', 'patenteValiditaFino',
      'passeggeroDataNascita'
    ]
    for (const f of dateFields) {
      if (data[f] !== undefined) {
        updateData[f] = data[f] ? new Date(data[f]) : null
      }
    }

    // Boolean
    if (data.conducenteStessoProp !== undefined) {
      updateData.conducenteStessoProp = !!data.conducenteStessoProp
    }

    const updated = await prisma.checkedVehicle.update({
      where: { id: vehicleId },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[CHECKPOINT_VEHICLE_PUT] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; vehicleId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { id, vehicleId } = await params

    const vehicle = await prisma.checkedVehicle.findFirst({
      where: { id: vehicleId, checkpointId: id, tenantId: session.user.tenantId }
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Veicolo non trovato' }, { status: 404 })
    }

    await prisma.checkedVehicle.delete({ where: { id: vehicleId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[CHECKPOINT_VEHICLE_DELETE] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
