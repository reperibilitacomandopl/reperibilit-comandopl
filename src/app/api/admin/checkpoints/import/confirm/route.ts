import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { logAudit } from '@/lib/audit'

/**
 * Conferma i dati revisionati dall'utente dopo l'OCR.
 * Salva il Checkpoint e i CheckedVehicle nel database.
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const data = await req.json()
    const { controllo, veicoli } = data

    if (!controllo?.data_controllo) {
      return NextResponse.json({ error: 'Data controllo mancante' }, { status: 400 })
    }

    // Parse date
    let dataControllo: Date
    try {
      const parts = controllo.data_controllo.split('/')
      if (parts.length === 3) {
        dataControllo = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      } else {
        dataControllo = new Date(controllo.data_controllo)
      }
      if (isNaN(dataControllo.getTime())) throw new Error('Invalid date')
    } catch {
      return NextResponse.json({ error: 'Data controllo non valida' }, { status: 400 })
    }

    // Geocoding best-effort
    let lat: number | null = null
    let lng: number | null = null
    const luogo = controllo.luogo || 'Non specificato'
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(luogo)}&format=json&limit=1`
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'SentinelPro-PoliziaLocale' },
        signal: AbortSignal.timeout(5000)
      })
      if (geoRes.ok) {
        const geoData = await geoRes.json()
        if (geoData.length > 0) {
          lat = parseFloat(geoData[0].lat)
          lng = parseFloat(geoData[0].lon)
        }
      }
    } catch { /* geocoding is best-effort */ }

    // Create checkpoint
    const checkpoint = await prisma.checkpoint.create({
      data: {
        tenantId: session.user.tenantId,
        operatorId: session.user.id,
        dataControllo,
        oraInizio: controllo.ora_inizio || '00:00',
        oraFine: controllo.ora_fine || '23:59',
        luogo,
        lat,
        lng,
        operatori: controllo.operatori || null,
        veicoloServizio: controllo.veicolo_servizio || null,
        note: null,
        importSource: 'OCR_PDF'
      }
    })

    // Create vehicles
    let veicoliImportati = 0
    const warnings: string[] = []

    if (veicoli && Array.isArray(veicoli)) {
      for (const v of veicoli) {
        const targa = (v.targa || '').toUpperCase().replace(/\s/g, '')
        if (!targa) {
          warnings.push('Veicolo saltato: targa mancante')
          continue
        }

        try {
          await prisma.checkedVehicle.create({
            data: {
              tenantId: session.user.tenantId,
              checkpointId: checkpoint.id,
              oraControllo: v.ora_controllo || null,
              targa,
              tipoVeicolo: v.veicolo || v.tipo_veicolo || null,
              marcaModello: v.marca_modello || null,
              ultimaRevisione: parseDate(v.ultima_revisione),
              assicurazione: v.assicurazione || null,
              assicuratoFino: parseDate(v.assicurato_fino),
              proprietarioNome: v.proprietario_nome || null,
              proprietarioCognome: v.proprietario_cognome || null,
              proprietarioDataNascita: parseDate(v.proprietario_data_nascita),
              proprietarioLuogoNascita: v.proprietario_luogo_nascita || null,
              proprietarioResidenza: v.proprietario_residenza || null,
              proprietarioIndirizzo: v.proprietario_indirizzo || null,
              conducenteStessoProp: !!v.conducente_stesso_prop,
              conducenteNome: v.conducente_nome || null,
              conducenteCognome: v.conducente_cognome || null,
              conducenteDataNascita: parseDate(v.conducente_data_nascita),
              conducenteLuogoNascita: v.conducente_luogo_nascita || null,
              conducenteResidenza: v.conducente_residenza || null,
              conducenteIndirizzo: v.conducente_indirizzo || null,
              patenteNumero: v.patente_numero || null,
              patenteRilasciataDa: v.patente_rilasciata_da || null,
              patenteDataRilascio: parseDate(v.patente_data_rilascio),
              patenteValiditaFino: parseDate(v.patente_validita_fino),
              passeggeroNome: v.passeggero_nome || null,
              passeggeroCognome: v.passeggero_cognome || null,
              passeggeroDataNascita: parseDate(v.passeggero_data_nascita),
              passeggeroLuogoNascita: v.passeggero_luogo_nascita || null,
              passeggeroResidenza: v.passeggero_residenza || null,
              passeggeroIndirizzo: v.passeggero_indirizzo || null,
              sanzioneElevata: v.sanzione_elevata || null,
              sanzioneAccessoria: v.sanzione_accessoria || null,
              violationId: v.violation_id || null,
            }
          })
          veicoliImportati++
        } catch (err) {
          warnings.push(`Errore veicolo ${targa}: ${err}`)
        }
      }
    }

    await logAudit({
      tenantId: session.user.tenantId,
      adminId: session.user.id,
      adminName: session.user.name || undefined,
      action: 'CHECKPOINT_IMPORT',
      targetId: checkpoint.id,
      details: `Importato posto di controllo via OCR: ${luogo}, ${veicoliImportati} veicoli`
    })

    return NextResponse.json({
      success: true,
      checkpointId: checkpoint.id,
      veicoliImportati,
      warnings
    })

  } catch (error) {
    console.error('[OCR_CONFIRM] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr || !dateStr.trim()) return null
  const text = dateStr.trim()

  // Try DD/MM/YYYY
  const parts = text.split(/[/.\-]/)
  if (parts.length === 3) {
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    let year = parseInt(parts[2])
    if (year < 100) year += 2000
    const d = new Date(year, month, day)
    if (!isNaN(d.getTime())) return d
  }

  // Try ISO
  const d = new Date(text)
  return isNaN(d.getTime()) ? null : d
}
