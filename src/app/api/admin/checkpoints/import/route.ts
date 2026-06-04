import { NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * API per l'importazione di schede compilate a mano via OCR.
 * Usa Google Gemini Vision API per leggere le schede scannerizzate.
 * Non richiede micro-servizio Python separato.
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const OCR_PROMPT = `Sei un assistente per l'estrazione dati. Questa è una scheda di controllo della Polizia Locale (italiana) scritta a mano.
Estrai tutti i dati LEGGIBILI e restituisci ESATTAMENTE un file JSON (senza markdown, senza backtick), usando QUESTA esatta struttura:
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
      "veicolo": "stringa (es. AUTOVETTURA)",
      "targa": "stringa",
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

REGOLE IMPORTANTI:
- Ogni blocco veicolo nella scheda corrisponde a un oggetto nell'array "veicoli"
- Se un campo è illeggibile o vuoto, usa stringa vuota ""
- Se "conducente" dice "LO STESSO" o simile, imposta conducente_stesso_prop a true e copia i dati del proprietario
- Le date devono essere in formato DD/MM/YYYY
- Le targhe devono essere in MAIUSCOLO senza spazi
- La scheda può avere fino a 4 veicoli per pagina
- Ignora i campi completamente vuoti
- NON aggiungere commenti o spiegazioni, solo il JSON`

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
    const privacyFields = privacyFieldsStr ? privacyFieldsStr.split(',') : ['intestazione', 'veicolo', 'proprietario', 'conducente', 'patente', 'sanzione', 'passeggero']

    if (!file) {
      return NextResponse.json({ error: 'Nessun file caricato' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'image/bmp']
    if (!validTypes.some(t => file.type.startsWith(t.split('/')[0]))) {
      return NextResponse.json({ error: 'Formato file non supportato. Usa PDF o immagini (PNG, JPG, TIFF)' }, { status: 400 })
    }

    // Limit file size (20MB)
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

    const ocrSchema = {
      type: "OBJECT",
      properties: {
        controllo: {
          type: "OBJECT",
          properties: {
            data_controllo: { type: "STRING" },
            ora_inizio: { type: "STRING" },
            ora_fine: { type: "STRING" },
            luogo: { type: "STRING" },
            operatori: { type: "STRING" }
          }
        },
        veicoli: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              ora_controllo: { type: "STRING" },
              veicolo: { type: "STRING" },
              targa: { type: "STRING" },
              marca_modello: { type: "STRING" },
              ultima_revisione: { type: "STRING" },
              assicurazione: { type: "STRING" },
              assicurato_fino: { type: "STRING" },
              proprietario_cognome: { type: "STRING" },
              proprietario_nome: { type: "STRING" },
              proprietario_data_nascita: { type: "STRING" },
              proprietario_luogo_nascita: { type: "STRING" },
              proprietario_residenza: { type: "STRING" },
              proprietario_indirizzo: { type: "STRING" },
              conducente_stesso_prop: { type: "BOOLEAN" },
              conducente_cognome: { type: "STRING" },
              conducente_nome: { type: "STRING" },
              conducente_data_nascita: { type: "STRING" },
              conducente_luogo_nascita: { type: "STRING" },
              conducente_residenza: { type: "STRING" },
              conducente_indirizzo: { type: "STRING" },
              patente_numero: { type: "STRING" },
              patente_rilasciata_da: { type: "STRING" },
              patente_data_rilascio: { type: "STRING" },
              patente_validita_fino: { type: "STRING" },
              sanzione_elevata: { type: "STRING" },
              sanzione_accessoria: { type: "STRING" },
              passeggero_cognome: { type: "STRING" },
              passeggero_nome: { type: "STRING" },
              passeggero_data_nascita: { type: "STRING" },
              passeggero_luogo_nascita: { type: "STRING" },
              passeggero_residenza: { type: "STRING" },
              passeggero_indirizzo: { type: "STRING" }
            }
          }
        }
      }
    };

    // Filtra dinamicamente i campi in base alla selezione dell'utente
    const vProps = ocrSchema.properties.veicoli.items.properties as Record<string, any>;
    
    if (!privacyFields.includes('intestazione')) {
      delete (ocrSchema.properties as any).controllo;
    }
    if (!privacyFields.includes('veicolo')) {
      delete vProps.ora_controllo;
      delete vProps.veicolo;
      delete vProps.targa;
      delete vProps.marca_modello;
      delete vProps.ultima_revisione;
      delete vProps.assicurazione;
      delete vProps.assicurato_fino;
    }
    if (!privacyFields.includes('proprietario')) {
      delete vProps.proprietario_cognome;
      delete vProps.proprietario_nome;
      delete vProps.proprietario_data_nascita;
      delete vProps.proprietario_luogo_nascita;
      delete vProps.proprietario_residenza;
      delete vProps.proprietario_indirizzo;
    }
    if (!privacyFields.includes('conducente')) {
      delete vProps.conducente_stesso_prop;
      delete vProps.conducente_cognome;
      delete vProps.conducente_nome;
      delete vProps.conducente_data_nascita;
      delete vProps.conducente_luogo_nascita;
      delete vProps.conducente_residenza;
      delete vProps.conducente_indirizzo;
    }
    if (!privacyFields.includes('patente')) {
      delete vProps.patente_numero;
      delete vProps.patente_rilasciata_da;
      delete vProps.patente_data_rilascio;
      delete vProps.patente_validita_fino;
    }
    if (!privacyFields.includes('sanzione')) {
      delete vProps.sanzione_elevata;
      delete vProps.sanzione_accessoria;
    }
    if (!privacyFields.includes('passeggero')) {
      delete vProps.passeggero_cognome;
      delete vProps.passeggero_nome;
      delete vProps.passeggero_data_nascita;
      delete vProps.passeggero_luogo_nascita;
      delete vProps.passeggero_residenza;
      delete vProps.passeggero_indirizzo;
    }

    // Costruisci il prompt aggiungendo istruzioni dinamiche
    let finalPrompt = OCR_PROMPT;
    if (privacyFields.length < 7) {
      finalPrompt += `\n- ATTENZIONE: Alcuni campi privacy sono stati disabilitati. IGNORA CATEGORICAMENTE e non restituire alcun dato per i blocchi che non sono presenti nella struttura JSON richiesta.`;
    }

    // Call Gemini Vision API
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: finalPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: ocrSchema
        },
        safetySettings: [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
        ]
      })
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[OCR_IMPORT] Gemini API error:', errText)
      return NextResponse.json({ error: `Errore API Gemini: ${geminiRes.status}` }, { status: 502 })
    }

    const geminiData = await geminiRes.json()

    // Extract text from Gemini response
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response (may be wrapped in markdown code block)
    let parsedData: any
    try {
      // Remove markdown backticks if present
      let jsonStr = rawText.trim()
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
      jsonStr = jsonStr.trim()

      parsedData = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('[OCR_IMPORT] JSON parse error:', parseError, 'Raw text:', rawText.substring(0, 500))
      return NextResponse.json({
        error: 'Impossibile interpretare i dati dalla scheda. Riprova con un\'immagine più nitida.',
        rawText: rawText.substring(0, 2000)
      }, { status: 422 })
    }

    return NextResponse.json({
      success: true,
      filename: file.name,
      controllo: parsedData.controllo || {},
      veicoli: parsedData.veicoli || [],
      rawText: rawText.substring(0, 500) // debug info
    })

  } catch (error) {
    console.error('[OCR_IMPORT] Error:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
