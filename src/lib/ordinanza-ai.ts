/**
 * ordinanza-ai.ts
 * Libreria core per l'Agente Ordinanze.
 *
 * Funzionalità:
 *  1. analizzaRichiesta()   — LLM estrae struttura dalla richiesta libera
 *  2. generaBozzaOrdinanza() — LLM genera bozza formale con RAG leggero
 *  3. Tipi condivisi
 */

export const TIPI_ORDINANZA = [
  "DIVIETO_SOSTA",
  "CHIUSURA_STRADA",
  "DIVIETO_E_CHIUSURA",
  "EVENTO",
  "LAVORI",
  "MANIFESTAZIONE",
] as const

export type TipoOrdinanza = (typeof TIPI_ORDINANZA)[number]

export const TIPO_LABEL: Record<TipoOrdinanza, string> = {
  DIVIETO_SOSTA: "Divieto di Sosta",
  CHIUSURA_STRADA: "Chiusura Temporanea Strada",
  DIVIETO_E_CHIUSURA: "Divieto di Sosta + Chiusura Strada",
  EVENTO: "Evento / Manifestazione",
  LAVORI: "Lavori Stradali",
  MANIFESTAZIONE: "Manifestazione Pubblica",
}

export interface AnalisiRichiesta {
  tipoOrdinanza: TipoOrdinanza
  richiedente: string | null
  via: string | null
  civico: string | null
  comune: string | null
  dataInizio: string | null    // ISO date string
  dataFine: string | null      // ISO date string
  oraDalle: string | null      // HH:MM
  oraAlle: string | null       // HH:MM
  motivazione: string | null
  misureRichieste: string[]
  segnaletica: string | null
  deviazioneNecessaria: boolean
  note: string | null
  confidenza: number           // 0-100 confidence
}

export interface Verifica {
  id: string
  categoria: "OK" | "ATTENZIONE" | "MANCANTE"
  descrizione: string
}

export interface AnalisiCompleta {
  analisi: AnalisiRichiesta
  verifiche: Verifica[]
  riassunto: string
}

// ----------------------------------------------------------------
// LLM client — OpenRouter o Gemini + rizzo-pii
// ----------------------------------------------------------------

async function anonymizePii(text: string): Promise<{ text: string, mapping: Record<string, string> }> {
  const piiUrl = process.env.RIZZO_PII_URL
  if (!piiUrl) return { text, mapping: {} }

  try {
    const res = await fetch(`${piiUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, include_mapping: true })
    })
    if (!res.ok) {
      console.warn("Errore rizzo-pii, fallback a testo in chiaro:", await res.text())
      return { text, mapping: {} }
    }
    const data = await res.json()
    return { text: data.anonymized_text, mapping: data.mapping || {} }
  } catch (err) {
    console.warn("Impossibile connettersi a rizzo-pii, fallback in chiaro:", err)
    return { text, mapping: {} }
  }
}

function restorePii(text: string, mapping: Record<string, string>): string {
  if (!mapping || Object.keys(mapping).length === 0) return text
  let restored = text
  for (const [placeholder, realValue] of Object.entries(mapping)) {
    restored = restored.split(placeholder).join(realValue)
  }
  return restored
}

async function callLLM(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!openRouterKey && !geminiKey) {
    throw new Error(
      "API Key mancante: configura OPENROUTER_API_KEY oppure GEMINI_API_KEY nel file .env"
    )
  }

  // 1. Anonimizza i dati sensibili prima di inviarli al cloud
  const { text: safeUserMessage, mapping } = await anonymizePii(userMessage)
  let responseText = ""

  // --- Caso 1: OPENROUTER ---
  if (openRouterKey && openRouterKey.length > 10) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "Portale Polizia Locale - Agente Ordinanze",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: safeUserMessage },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Errore OpenRouter: ${err}`)
    }

    const data = await res.json()
    responseText = data.choices[0].message.content
  } else {
    // --- Caso 2: API GEMINI NATIVA (Generative Language API) ---
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: "user",
        parts: [{ text: safeUserMessage }]
      }],
      generationConfig: {
        temperature: 0.2,
      }
    }),
  })

  if (!res.ok) {
      const err = await res.text()
      throw new Error(`Errore Gemini Nativo (${res.status}): ${err}`)
    }

    const data = await res.json()
    responseText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  }

  // 2. Ripristina i dati in chiaro sui risultati
  return restorePii(responseText, mapping)
}

// ----------------------------------------------------------------
// 1. Analisi richiesta
// ----------------------------------------------------------------

const SYSTEM_ANALISI = `Sei un esperto di ordinanze di Polizia Locale italiana specializzato in viabilità.
Ricevi il testo di una richiesta di ordinanza (divieto di sosta, chiusura strada, evento, lavori ecc.)
e devi estrarre le informazioni strutturate in formato JSON.

REGOLE FONDAMENTALI:
- Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo, senza markdown.
- Se un campo non è presente nel testo, usa null.
- Per le date usa formato ISO: YYYY-MM-DD.
- Per gli orari usa formato HH:MM (es. "07:00", "18:30").
- tipoOrdinanza deve essere uno di: DIVIETO_SOSTA, CHIUSURA_STRADA, DIVIETO_E_CHIUSURA, EVENTO, LAVORI, MANIFESTAZIONE.
- confidenza indica la tua certezza sull'estrazione (0-100).
- misureRichieste è un array di stringhe (es. ["divieto di sosta", "deviazione traffico"]).

Schema JSON da restituire:
{
  "tipoOrdinanza": "DIVIETO_SOSTA",
  "richiedente": null,
  "via": null,
  "civico": null,
  "comune": null,
  "dataInizio": null,
  "dataFine": null,
  "oraDalle": null,
  "oraAlle": null,
  "motivazione": null,
  "misureRichieste": [],
  "segnaletica": null,
  "deviazioneNecessaria": false,
  "note": null,
  "confidenza": 80
}

Genera anche la checklist delle verifiche come secondo campo "verifiche":
Array di oggetti con campi:
  - id (stringa breve univoca)
  - categoria: "OK" | "ATTENZIONE" | "MANCANTE"
  - descrizione (stringa descrittiva)

Esempi di verifiche:
- { "id": "richiedente", "categoria": "OK", "descrizione": "Richiedente identificato" }
- { "id": "via", "categoria": "ATTENZIONE", "descrizione": "Verificare estensione esatta del tratto" }
- { "id": "intersezioni", "categoria": "ATTENZIONE", "descrizione": "Verificare presenza di intersezioni nel tratto" }
- { "id": "segnaletica", "categoria": "MANCANTE", "descrizione": "Segnaletica da installare non specificata" }
- { "id": "deviazione", "categoria": "ATTENZIONE", "descrizione": "Valutare se necessaria deviazione del traffico" }

Genera infine un "riassunto" in 1-2 frasi della richiesta.

Rispondi con:
{
  "analisi": { ...schema sopra... },
  "verifiche": [ ...checklist... ],
  "riassunto": "..."
}
`

export async function analizzaRichiesta(
  testoRichiesta: string
): Promise<AnalisiCompleta> {
  const raw = await callLLM(SYSTEM_ANALISI, testoRichiesta)

  // estrai JSON anche se l'LLM aggiunge del testo
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("L'AI non ha restituito un JSON valido nell'analisi")
  }

  const parsed = JSON.parse(jsonMatch[0]) as AnalisiCompleta
  return parsed
}

// ----------------------------------------------------------------
// 2. Generazione bozza ordinanza
// ----------------------------------------------------------------

export interface TemplateRiferimento {
  nome: string
  tipo: string
  contenuto: string
}

function buildSystemBozza(
  nomeComune: string,
  templates: TemplateRiferimento[]
): string {
  const esempi =
    templates.length > 0
      ? templates
          .map(
            (t, i) =>
              `--- ESEMPIO ${i + 1}: ${t.nome} (${t.tipo}) ---\n${t.contenuto.substring(0, 2000)}\n---`
          )
          .join("\n\n")
      : "Nessun esempio disponibile — usa il formato standard italiano per ordinanze di Polizia Locale."

  return `Sei un esperto redattore di ordinanze di Polizia Locale del Comune di ${nomeComune}.
Il tuo compito è redigere una BOZZA FORMALE di ordinanza in italiano giuridico-amministrativo.

STILE: Segui fedelmente lo stile delle ordinanze del Comando riportate sotto come esempi.
Se non ci sono esempi, usa il formato standard italiano con: premesse, visti, considerato, ordina.

REGOLE:
- Usa "IL RESPONSABILE DEL COMANDO" o "IL DIRIGENTE" come intestazione del soggetto emanante.
- Cita sempre gli articoli del D.Lgs. 285/1992 (Codice della Strada) pertinenti.
- Usa il formato: PREMESSO CHE — VISTO — CONSIDERATO — ORDINA.
- Includi articoli numerati nella sezione ORDINA.
- Usa [NUMERO_PROGRESSIVO] come placeholder per il numero di protocollo.
- Usa [DATA_FIRMA] come placeholder per la data di firma.
- Alla fine aggiungi la sezione "IL RESPONSABILE DEL PROCEDIMENTO" con la riga firma vuota.
- Non inventare indirizzi, date o nomi non presenti nell'analisi. Usa [...] per campi da completare.
- Lunghezza: 400-800 parole.

ORDINANZE DI RIFERIMENTO DEL COMANDO:
${esempi}
`
}

export async function generaBozzaOrdinanza(
  analisi: AnalisiRichiesta,
  nomeComune: string,
  templates: TemplateRiferimento[]
): Promise<string> {
  const systemPrompt = buildSystemBozza(nomeComune, templates)

  const userMessage = `Genera la bozza di ordinanza per la seguente richiesta analizzata:

TIPO: ${analisi.tipoOrdinanza} (${TIPO_LABEL[analisi.tipoOrdinanza] ?? analisi.tipoOrdinanza})
RICHIEDENTE: ${analisi.richiedente ?? "[da specificare]"}
VIA: ${analisi.via ?? "[da specificare]"}${analisi.civico ? `, ${analisi.civico}` : ""}
COMUNE: ${analisi.comune ?? nomeComune}
DATA INIZIO: ${analisi.dataInizio ?? "[da specificare]"}
DATA FINE: ${analisi.dataFine ?? analisi.dataInizio ?? "[da specificare]"}
ORARIO: ${analisi.oraDalle ?? "..."} – ${analisi.oraAlle ?? "..."}
MOTIVAZIONE: ${analisi.motivazione ?? "[da specificare]"}
MISURE RICHIESTE: ${analisi.misureRichieste.join(", ") || "non specificate"}
SEGNALETICA: ${analisi.segnaletica ?? "da definire"}
DEVIAZIONE NECESSARIA: ${analisi.deviazioneNecessaria ? "Sì" : "No/Da verificare"}
NOTE AGGIUNTIVE: ${analisi.note ?? "nessuna"}

Redigi la bozza formale dell'ordinanza.`

  const bozza = await callLLM(systemPrompt, userMessage)
  return bozza
}

// ----------------------------------------------------------------
// 3. Generazione numero protocollo
// ----------------------------------------------------------------

export function formatNumeroProtocollo(
  anno: number,
  progressivo: number
): string {
  return `ORD-${anno}/${String(progressivo).padStart(4, "0")}`
}

// ----------------------------------------------------------------
// 4. Helpers per la UI
// ----------------------------------------------------------------

export function getCategoriaColor(categoria: Verifica["categoria"]): string {
  switch (categoria) {
    case "OK":
      return "emerald"
    case "ATTENZIONE":
      return "amber"
    case "MANCANTE":
      return "rose"
    default:
      return "slate"
  }
}

export function getTipoOrdinanzaFromString(s: string): TipoOrdinanza {
  if (TIPI_ORDINANZA.includes(s as TipoOrdinanza)) {
    return s as TipoOrdinanza
  }
  return "DIVIETO_SOSTA"
}
