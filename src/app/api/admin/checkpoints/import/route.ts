import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * API per l'importazione di schede compilate a mano via OCR.
 * Usa Google Gemini Vision API per leggere schede scannerizzate con calligrafia.
 * Modello configurabile via GEMINI_OCR_MODEL (default: gemini-2.5-flash).
 * Per calligrafia difficile, impostare GEMINI_OCR_MODEL=gemini-2.5-pro (2 RPM nel tier gratuito).
 */

const DEFAULT_MODEL = 'gemini-2.5-flash'
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

const OCR_PROMPT = `Sei un assistente specializzato nella digitalizzazione di moduli della Polizia Locale italiana compilati A MANO.

IMPORTANTE — RICONOSCIMENTO CALLIGRAFIA:
- Il testo è SCRITTO A MANO in italiano, con calligrafia corsiva o stampatello
- Le lettere maiuscole possono somigliare ad altre lettere (es. A/H, C/G, I/L, M/N, O/0, S/5, Z/2, B/8)
- I numeri possono essere ambigui: 1/7, 3/8, 5/6, 0/6, 4/9
- Le targhe italiane sono nel formato AA000AA (lettere-numeri-lettere, no spazi)
- Codici fiscali: 16 caratteri alfanumerici
- Date: formato DD/MM/YYYY
- Cerca di dedurre il significato dal contesto quando un carattere è ambiguo
- Se un CAMPO È ILLEGGIBILE, lascialo vuoto (stringa "") — non inventare dati
- I cognomi italiani spesso finiscono in -I, -O, -A, -E (es. ROSSI, BIANCO, FERRARA)
- I nomi propri italiani comuni: MARCO, GIUSEPPE, ANTONIO, MARIA, ANNA, FRANCESCO, LUCA, ALESSANDRO, GIOVANNI, ROBERTO, ANDREA, PAOLO, SALVATORE, LUIGI, ANGELO, MATTEO, FABIO, DAVIDE, STEFANO, SIMONE, GIORGIO, NICOLA, ENRICO, FEDERICO, PIETRO, MICHELE, ALBERTO, CLAUDIO, DANIELE, MASSIMO, CARLO, SERGIO, FRANCO, MARIO, LORENZO, RICCARDO, DOMENICO, VINCENZO

Estrai TUTTI i dati e restituisci ESCLUSIVAMENTE un JSON valido con questa struttura:

{
  "controllo": {
    "data_controllo": "DD/MM/YYYY",
    "ora_inizio": "HH:MM",
    "ora_fine": "HH:MM",
    "luogo": "stringa",
    "operatori": "stringa"
  },
  "veicoli": [
    {
      "ora_controllo": "HH:MM",
      "veicolo": "stringa (es. AUTOVETTURA, MOTOCICLO, AUTOCARRO)",
      "targa": "stringa MAIUSCOLO senza spazi",
      "marca_modello": "stringa",
      "ultima_revisione": "DD/MM/YYYY o vuoto",
      "assicurazione": "stringa compagnia",
      "assicurato_fino": "DD/MM/YYYY o vuoto",
      "proprietario_cognome": "stringa",
      "proprietario_nome": "stringa",
      "proprietario_data_nascita": "DD/MM/YYYY",
      "proprietario_luogo_nascita": "stringa",
      "proprietario_residenza": "stringa comune",
      "proprietario_indirizzo": "stringa via",
      "conducente_stesso_prop": true/false,
      "conducente_cognome": "stringa",
      "conducente_nome": "stringa",
      "conducente_data_nascita": "DD/MM/YYYY",
      "conducente_luogo_nascita": "stringa",
      "conducente_residenza": "stringa",
      "conducente_indirizzo": "stringa",
      "patente_numero": "stringa",
      "patente_rilasciata_da": "stringa",
      "patente_data_rilascio": "DD/MM/YYYY",
      "patente_validita_fino": "DD/MM/YYYY",
      "sanzione_elevata": "stringa articolo",
      "sanzione_accessoria": "stringa",
      "passeggero_cognome": "stringa",
      "passeggero_nome": "stringa",
      "passeggero_data_nascita": "DD/MM/YYYY",
      "passeggero_luogo_nascita": "stringa",
      "passeggero_residenza": "stringa",
      "passeggero_indirizzo": "stringa"
    }
  ]
}

REGOLE FONDAMENTALI:
- Ogni riquadro/veicolo nella scheda = un oggetto nell'array "veicoli"
- Se un campo è illeggibile, usa "" — MAI inventare dati
- Se il conducente ha flaggato "LO STESSO" o scritto "idem"/"stesso", imposta conducente_stesso_prop: true e copia i dati del proprietario nei campi conducente
- IMPORTANTE: Restituisci SOLO il JSON puro. NIENTE markdown, NIENTE backtick, NIENTE testo prima o dopo. Solo l'oggetto JSON.`

// Fields che possono essere filtrati per privacy
const ALL_PRIVACY_FIELDS = ['intestazione', 'veicolo', 'proprietario', 'conducente', 'patente', 'sanzione', 'passeggero']

// Campi appartenenti a ciascuna categoria privacy
const PRIVACY_FIELD_GROUPS: Record<string, string[]> = {
  veicolo: ['ora_controllo', 'veicolo', 'targa', 'marca_modello', 'ultima_revisione', 'assicurazione', 'assicurato_fino'],
  proprietario: ['proprietario_cognome', 'proprietario_nome', 'proprietario_data_nascita', 'proprietario_luogo_nascita', 'proprietario_residenza', 'proprietario_indirizzo'],
  conducente: ['conducente_stesso_prop', 'conducente_cognome', 'conducente_nome', 'conducente_data_nascita', 'conducente_luogo_nascita', 'conducente_residenza', 'conducente_indirizzo'],
  patente: ['patente_numero', 'patente_rilasciata_da', 'patente_data_rilascio', 'patente_validita_fino'],
  sanzione: ['sanzione_elevata', 'sanzione_accessoria'],
  passeggero: ['passeggero_cognome', 'passeggero_nome', 'passeggero_data_nascita', 'passeggero_luogo_nascita', 'passeggero_residenza', 'passeggero_indirizzo'],
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY non configurata nel server' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const privacyFieldsStr = formData.get('privacyFields') as string || ''
    const privacyFields = privacyFieldsStr ? privacyFieldsStr.split(',') : ALL_PRIVACY_FIELDS

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/bmp']
    if (!validTypes.some(t => file.type.startsWith(t.split('/')[0]))) {
      return NextResponse.json({ error: 'Formato file non supportato. Usa PDF o immagini (PNG, JPG, TIFF)' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File troppo grande (max 20MB)' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Determine MIME type
    let mimeType = file.type || 'image/jpeg'
    if (file.name.endsWith('.pdf')) mimeType = 'application/pdf'
    else if (file.name.endsWith('.png')) mimeType = 'image/png'
    else if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) mimeType = 'image/jpeg'
    else if (file.name.endsWith('.tiff') || file.name.endsWith('.tif')) mimeType = 'image/tiff'

    // Build prompt with privacy filter hints
    let finalPrompt = OCR_PROMPT
    if (privacyFields.length < ALL_PRIVACY_FIELDS.length) {
      const excluded = ALL_PRIVACY_FIELDS.filter(f => !privacyFields.includes(f))
      finalPrompt += '\n\nFILTRO PRIVACY ATTIVO — NON ESTRARRE questi dati:\n'
      for (const cat of excluded) {
        if (cat === 'intestazione') {
          finalPrompt += '- NON estrarre i campi "controllo" (data, ora, luogo, operatori) — lascia tutto vuoto\n'
        }
        const fields = PRIVACY_FIELD_GROUPS[cat]
        if (fields) {
          finalPrompt += `- NON estrarre: ${fields.join(', ')} — lascia questi campi vuoti\n`
        }
      }
    }

    // Modelli in ordine: principale (configurabile) → fallback Flash
    const preferredModel = process.env.GEMINI_OCR_MODEL || DEFAULT_MODEL
    const MODEL_TIER: string[] = [preferredModel]
    if (preferredModel !== 'gemini-2.5-flash') {
      MODEL_TIER.push('gemini-2.5-flash')
    }

    let geminiRes: Response | null = null
    let lastError: string = ''
    let usedModel: string = ''

    for (let tier = 0; tier < MODEL_TIER.length; tier++) {
      const model = MODEL_TIER[tier]
      let delay = 2000

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
          await new Promise(r => setTimeout(r, delay))
          delay *= 2
        }

        const res = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: finalPrompt },
                { inline_data: { mime_type: mimeType, data: base64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192
            },
            safetySettings: [
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
            ]
          })
        })

        // 429 = rate limit → retry dopo backoff
        if (res.status === 429) {
          console.warn(`[OCR_IMPORT] 429 rate limit su ${model}, attempt ${attempt}/3`)
          lastError = `Rate limit su ${model}`
          continue
        }

        // Altri errori non retryable → prossimo modello
        if (!res.ok) {
          const errText = await res.text()
          console.error(`[OCR_IMPORT] ${model} error:`, errText.substring(0, 300))
          lastError = `Errore API ${model}: ${res.status}`
          break
        }

        geminiRes = res
        usedModel = model
        break
      }

      if (geminiRes) break
    }

    if (!geminiRes) {
      return NextResponse.json({
        error: `Servizio OCR momentaneamente saturo. Riprova tra qualche secondo. (${lastError})`
      }, { status: 503 })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    if (!rawText.trim()) {
      console.error('[OCR_IMPORT] Empty response from Gemini')
      return NextResponse.json({
        error: 'Nessun testo estratto. La scheda potrebbe essere illeggibile o vuota.',
      }, { status: 422 })
    }

    let parsedData: any
    try {
      let jsonStr = rawText.trim()
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/i, '')
      jsonStr = jsonStr.replace(/\n?\s*```$/i, '')

      if (!jsonStr.startsWith('{')) {
        const firstBrace = jsonStr.indexOf('{')
        const lastBrace = jsonStr.lastIndexOf('}')
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1)
        }
      }

      parsedData = JSON.parse(jsonStr.trim())
      parsedData.controllo = parsedData.controllo || {}
      parsedData.veicoli = Array.isArray(parsedData.veicoli) ? parsedData.veicoli : []
    } catch (parseError) {
      console.error('[OCR_IMPORT] JSON parse error:', parseError)
      console.error('[OCR_IMPORT] Raw text:', rawText.substring(0, 1000))
      return NextResponse.json({
        error: 'Impossibile interpretare i dati dalla scheda. Verifica che la scansione sia nitida e ben illuminata.',
        rawText: rawText.substring(0, 3000),
      }, { status: 422 })
    }

    // Post-processing: strip privacy-excluded fields from parsed response
    if (privacyFields.length < ALL_PRIVACY_FIELDS.length) {
      if (!privacyFields.includes('intestazione')) {
        parsedData.controllo = {}
      }
      for (const cat of ALL_PRIVACY_FIELDS) {
        if (!privacyFields.includes(cat) && PRIVACY_FIELD_GROUPS[cat]) {
          for (const v of (parsedData.veicoli || [])) {
            for (const field of PRIVACY_FIELD_GROUPS[cat]) {
              delete v[field]
            }
          }
        }
      }
    }

    const isEmpty = !(parsedData.veicoli || []).length
      && !parsedData.controllo?.data_controllo
      && !parsedData.controllo?.luogo
      && !parsedData.controllo?.operatori

    return NextResponse.json({
      success: true,
      filename: file.name,
      controllo: parsedData.controllo || {},
      veicoli: parsedData.veicoli || [],
      model: usedModel,
      empty: isEmpty || undefined,
      warning: isEmpty ? 'Nessun dato rilevato. La calligrafia potrebbe essere illeggibile. Controlla la qualità della scansione.' : undefined,
      rawText: rawText.substring(0, 500)
    })

  } catch (error) {
    console.error('[OCR_IMPORT] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
