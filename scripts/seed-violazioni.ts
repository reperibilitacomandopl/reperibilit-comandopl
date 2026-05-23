import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Inizio parsing e sincronizzazione violazioni.txt...')

  const filePath = path.join(__dirname, '../violazioni.txt')
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File non trovato: ${filePath}`)
    process.exit(1)
  }

  // Creazione stream di lettura
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let isFirstLine = true
  let successCount = 0
  let skipCount = 0

  // 1. Azzeramento tabella esistente (perché abbiamo cambiato lo schema)
  console.log('🗑️ Cancellazione vecchie violazioni CdsViolation (reset)...')
  await prisma.cdsViolation.deleteMany({})

  const parseCurrency = (val: string): number => {
    if (!val || val === 'N.P.' || val.trim() === '') return 0;
    const numStr = val.replace(',', '.')
    return parseFloat(numStr) || 0;
  }

  const parsePunti = (val: string): number => {
    if (!val || val.trim() === '') return 0;
    return parseInt(val.trim(), 10) || 0;
  }

  // Articles Cache
  const articlesCache: Record<string, string> = {}

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false
      continue // Salta l'intestazione
    }

    const cols = line.split('\t')
    
    // Le colonne attese sono:
    // 0: Articolo
    // 1: Comma
    // 2: Codice
    // 3: Descrizione
    // 4: Sanzione 60gg.
    // 5: Sanz. sconto 30%
    // 6: Punti patente
    // 7: Codice sanz. acc.
    // 8: Sanzione Accessoria 1
    // ... e altre colonne (note, ecc.)
    // 14: Annotazioni
    // 18: Sosp. patente breve
    
    if (cols.length < 5) continue; // Linea vuota o malformata

    let articoloRaw = cols[0]?.trim() || ''
    const comma = cols[1]?.trim() || ''
    const codice = cols[2]?.trim() || ''
    const descrizione = cols[3]?.trim() || ''
    const sanzione = parseCurrency(cols[4])
    const sanzioneScontataStr = cols[5]?.trim() || ''
    const sanzioneScontata = sanzioneScontataStr === 'N.P.' || sanzioneScontataStr === '' ? null : parseCurrency(cols[5])
    const puntiPatente = parsePunti(cols[6])
    
    const sanzioneAccessoria1 = cols[8]?.trim() || ''
    
    const annotazioni = cols[14]?.trim() || ''
    const sospensioneBreve = cols[18]?.trim() === 'SI'

    // Pulizia articolo (es. rimuovere zeri iniziali "001" -> "1")
    if (/^0+[1-9]/.test(articoloRaw)) {
      articoloRaw = parseInt(articoloRaw, 10).toString()
    }
    if (articoloRaw === '') continue;

    // Crea o recupera articolo
    if (!articlesCache[articoloRaw]) {
      const artDb = await prisma.cdsArticle.upsert({
        where: { articolo: articoloRaw },
        update: {},
        create: {
          articolo: articoloRaw,
          titolo: `Art. ${articoloRaw} CdS`,
        }
      })
      articlesCache[articoloRaw] = artDb.id
    }

    const articoloId = articlesCache[articoloRaw]

    // Note composition
    const noteArr = []
    if (annotazioni) noteArr.push(`Annotazioni: ${annotazioni}`)
    if (sospensioneBreve) noteArr.push(`Sospensione patente breve: SI`)
    const noteF = noteArr.length > 0 ? noteArr.join(' | ') : null

    // Sospensione / Fermo guessing dalla Sanzione accessoria
    const sanzAccUpper = sanzioneAccessoria1.toUpperCase()
    const isSospensione = sanzAccUpper.includes('SOSPENSIONE')
    const isFermo = sanzAccUpper.includes('FERMO') || sanzAccUpper.includes('SEQUESTRO') || sanzAccUpper.includes('RIMOZIONE') || sanzAccUpper.includes('CONFISCA')

    try {
      await prisma.cdsViolation.create({
        data: {
          articoloId: articoloId,
          comma: comma,
          codice: codice,
          descrizione: descrizione,
          sanzione: sanzione,
          sanzioneScontata: sanzioneScontata,
          sanzioneAccessoria: sanzioneAccessoria1 || null,
          puntiPatente: puntiPatente,
          sospensione: isSospensione,
          fermo: isFermo,
          note: noteF
        }
      })
      successCount++
    } catch (err) {
      console.error(`Errore riga (Codice: ${codice}):`, err)
      skipCount++
    }
  }

  console.log(`\n🎉 Importazione completata!`)
  console.log(`✅ ${successCount} violazioni inserite con successo.`)
  if (skipCount > 0) {
    console.log(`⚠️ ${skipCount} righe saltate a causa di errori.`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
