const fs = require('fs');

async function run() {
  require('dotenv').config();
  const apiKey = process.env.GEMINI_API_KEY;
  const pdfBytes = fs.readFileSync('c:\\Users\\dibenedettom\\Desktop\\portale-caserma\\posti_di_controllo\\schede_importate\\importati\\1.pdf');
  const base64 = pdfBytes.toString('base64');
  
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
      "conducente_stesso_prop": true,
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
- NON aggiungere commenti o spiegazioni, solo il JSON`;

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

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: OCR_PROMPT },
          { inline_data: { mime_type: 'application/pdf', data: base64 } }
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
  });
  
  const text = await res.text();
  console.log(text);
}
run();
