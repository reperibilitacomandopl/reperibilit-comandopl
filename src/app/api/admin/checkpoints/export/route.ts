import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const checkpointId = searchParams.get('id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const XLSX = await import('xlsx')

    if (checkpointId) {
      // Export singolo controllo
      const checkpoint = await prisma.checkpoint.findFirst({
        where: { id: checkpointId, tenantId: session.user.tenantId, deletedAt: null },
        include: { vehicles: true }
      })
      if (!checkpoint) {
        return NextResponse.json({ error: 'Controllo non trovato' }, { status: 404 })
      }

      const wb = XLSX.utils.book_new()
      const wsData = [
        ['POSTO DI CONTROLLO'],
        ['Data', checkpoint.dataControllo.toISOString().split('T')[0]],
        ['Luogo', checkpoint.luogo],
        ['Operatori', checkpoint.operatori || ''],
        ['Orario', `${checkpoint.oraInizio} - ${checkpoint.oraFine}`],
        ['Veicolo servizio', checkpoint.veicoloServizio || ''],
        [],
        ['Targa', 'Tipo', 'Marca/Modello', 'Ora', 'Proprietario', 'Conducente', 'Sanzione', 'Assicurazione', 'Rev. Scaduta'],
      ]

      for (const v of checkpoint.vehicles) {
        wsData.push([
          v.targa,
          v.tipoVeicolo || '',
          v.marcaModello || '',
          v.oraControllo || '',
          `${v.proprietarioNome || ''} ${v.proprietarioCognome || ''}`.trim(),
          v.conducenteStessoProp ? 'Lo stesso' : `${v.conducenteNome || ''} ${v.conducenteCognome || ''}`.trim(),
          v.sanzioneElevata || '',
          v.assicurazione || '',
          v.ultimaRevisione ? v.ultimaRevisione.toISOString().split('T')[0] : ''
        ])
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData)
      XLSX.utils.book_append_sheet(wb, ws, `Controllo`)

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="controllo_${checkpoint.dataControllo.toISOString().split('T')[0]}.xlsx"`
        }
      })
    }

    // Export range di date
    const whereClause: any = { tenantId: session.user.tenantId, deletedAt: null }
    if (from || to) {
      whereClause.dataControllo = {}
      if (from) whereClause.dataControllo.gte = new Date(from)
      if (to) whereClause.dataControllo.lte = new Date(to + 'T23:59:59.999Z')
    }

    const checkpoints = await prisma.checkpoint.findMany({
      where: whereClause,
      include: { vehicles: true },
      orderBy: { dataControllo: 'desc' }
    })

    const wb = XLSX.utils.book_new()

    // Foglio riepilogo controlli
    const summaryData = [
      ['RIEPILOGO POSTI DI CONTROLLO'],
      ['Data', 'Luogo', 'Orario', 'Operatori', 'N. Veicoli', 'Sanzioni']
    ]
    for (const cp of checkpoints) {
      const sanzioni = cp.vehicles.filter((v: any) => v.sanzioneElevata && v.sanzioneElevata.trim()).length
      summaryData.push([
        cp.dataControllo.toISOString().split('T')[0],
        cp.luogo,
        `${cp.oraInizio} - ${cp.oraFine}`,
        cp.operatori || '',
        String(cp.vehicles.length),
        String(sanzioni)
      ])
    }
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Riepilogo')

    // Foglio dettaglio veicoli
    const detailData = [
      ['Data Controllo', 'Luogo', 'Ora', 'Targa', 'Tipo', 'Marca/Modello', 'Proprietario', 'Conducente', 'Sanzione', 'Assicurazione', 'Assicurato fino']
    ]
    for (const cp of checkpoints) {
      for (const v of cp.vehicles) {
        detailData.push([
          cp.dataControllo.toISOString().split('T')[0],
          cp.luogo,
          v.oraControllo || '',
          v.targa,
          v.tipoVeicolo || '',
          v.marcaModello || '',
          `${v.proprietarioNome || ''} ${v.proprietarioCognome || ''}`.trim(),
          v.conducenteStessoProp ? 'Lo stesso' : `${v.conducenteNome || ''} ${v.conducenteCognome || ''}`.trim(),
          v.sanzioneElevata || '',
          v.assicurazione || '',
          v.assicuratoFino ? v.assicuratoFino.toISOString().split('T')[0] : ''
        ])
      }
    }
    const detailWs = XLSX.utils.aoa_to_sheet(detailData)
    XLSX.utils.book_append_sheet(wb, detailWs, 'Veicoli')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = from && to ? `controlli_${from}_${to}.xlsx` : 'controlli_export.xlsx'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('[CHECKPOINT_EXPORT] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
