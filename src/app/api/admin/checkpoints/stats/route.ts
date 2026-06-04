import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const tenantId = session.user.tenantId
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const baseWhere = { tenantId, deletedAt: null }

    // Conteggi principali
    const [
      controlliTotali,
      controlliOggi,
      controlliMese,
      controlliAnno,
      veicoliTotali,
      veicoliConSanzione,
      veicoliRevisioneScaduta,
      veicoliAssicurazioneScaduta,
    ] = await Promise.all([
      prisma.checkpoint.count({ where: baseWhere }),
      prisma.checkpoint.count({ where: { ...baseWhere, dataControllo: { gte: today } } }),
      prisma.checkpoint.count({ where: { ...baseWhere, dataControllo: { gte: startOfMonth } } }),
      prisma.checkpoint.count({ where: { ...baseWhere, dataControllo: { gte: startOfYear } } }),
      prisma.checkedVehicle.count({ where: { tenantId } }),
      prisma.checkedVehicle.count({
        where: { tenantId, sanzioneElevata: { not: null }, NOT: { sanzioneElevata: '' } }
      }),
      prisma.checkedVehicle.count({
        where: { tenantId, ultimaRevisione: { not: null, lt: now } }
      }),
      prisma.checkedVehicle.count({
        where: { tenantId, assicuratoFino: { not: null, lt: now } }
      }),
    ])

    // Top 10 luoghi
    const controlliPerLuogo = await prisma.checkpoint.groupBy({
      by: ['luogo'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    // Targhe controllate più volte
    const targheMultiple = await prisma.checkedVehicle.groupBy({
      by: ['targa'],
      where: { tenantId },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    // Andamento ultimi 12 mesi
    const andamentoMensile = []
    for (let i = 11; i >= 0; i--) {
      const meseRef = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const meseFine = new Date(meseRef.getFullYear(), meseRef.getMonth() + 1, 0, 23, 59, 59)
      const mese = meseRef.getMonth() + 1
      const anno = meseRef.getFullYear()
      const mesiNomi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

      const [nCtrl, nVeic] = await Promise.all([
        prisma.checkpoint.count({
          where: { ...baseWhere, dataControllo: { gte: meseRef, lte: meseFine } }
        }),
        prisma.checkedVehicle.count({
          where: {
            tenantId,
            checkpoint: { dataControllo: { gte: meseRef, lte: meseFine }, tenantId, deletedAt: null }
          }
        })
      ])

      andamentoMensile.push({
        mese: `${String(mese).padStart(2, '0')}/${anno}`,
        meseLabel: `${mesiNomi[mese - 1]} ${anno}`,
        controlli: nCtrl,
        veicoli: nVeic
      })
    }

    // Media veicoli per controllo
    const mediaVeicoli = controlliTotali > 0 ? Math.round((veicoliTotali / controlliTotali) * 10) / 10 : 0
    const percSanzioni = veicoliTotali > 0 ? Math.round((veicoliConSanzione / veicoliTotali * 100) * 10) / 10 : 0

    return NextResponse.json({
      controlliTotali,
      controlliOggi,
      controlliMese,
      controlliAnno,
      veicoliTotali,
      veicoliConSanzione,
      veicoliRevisioneScaduta,
      veicoliAssicurazioneScaduta,
      controlliPerLuogo: controlliPerLuogo.map((c: any) => ({ luogo: c.luogo, totale: c._count.id })),
      targheMultiple: targheMultiple.map((t: any) => ({ targa: t.targa, volte: t._count.id })),
      andamentoMensile,
      mediaVeicoli,
      percSanzioni
    })
  } catch (error) {
    console.error('[CHECKPOINT_STATS] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
