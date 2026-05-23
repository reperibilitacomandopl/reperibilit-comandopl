import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Avvio importazione stradario da via.txt...')

  const filePath = path.join(process.cwd(), 'via.txt')
  
  if (!fs.existsSync(filePath)) {
    console.error(`File non trovato: ${filePath}`)
    process.exit(1)
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0)

  // Ignoriamo la prima riga (header)
  const dataLines = lines.slice(1)

  let successCount = 0
  let errorCount = 0

  for (const line of dataLines) {
    try {
      const columns = line.split('\t').map(c => c.trim())
      
      const codice = columns[0] || null
      const denominazione = columns[1]
      const chiave = columns[2] || null
      const comune = columns[3] || null
      const zona = columns[4] || null
      const enteProprietario = columns[5] || null

      if (!denominazione) continue

      await prisma.street.create({
        data: {
          codice,
          denominazione,
          chiave,
          comune,
          zona,
          enteProprietario
        }
      })
      successCount++
    } catch (error) {
      console.error(`Errore nell'importazione della riga: ${line}`, error)
      errorCount++
    }
  }

  console.log(`Importazione completata. Successi: ${successCount}, Errori: ${errorCount}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
