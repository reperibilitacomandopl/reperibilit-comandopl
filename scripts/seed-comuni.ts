import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Avvio importazione comuni e nazioni...')

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'altamura' } })
  if (!tenant) {
    console.error("Tenant 'altamura' non trovato. Impossibile importare.")
    process.exit(1)
  }

  const comuniPath = path.join(process.cwd(), 'comuni e nazioni.txt')
  if (!fs.existsSync(comuniPath)) {
    console.error("File 'comuni e nazioni.txt' non trovato!")
    process.exit(1)
  }

  console.log(`Eliminazione vecchi comuni globali...`)
  await prisma.municipality.deleteMany({})

  const content = fs.readFileSync(comuniPath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim().length > 0)
  const dataLines = lines.slice(1) // Salta intestazione

  let success = 0
  const batchSize = 500
  let batch = []

  for (let i = 0; i < dataLines.length; i++) {
    const columns = dataLines[i].split('\t').map(c => c.trim())
    if (columns.length < 2) continue

    const denominazione = columns[0]
    const provincia = columns[1]
    const codiceBelfiore = columns[3] || ''

    if (denominazione) {
      batch.push({
        tenantId: null, // Globale
        denominazione,
        provincia,
        codiceBelfiore
      })
    }

    if (batch.length >= batchSize || i === dataLines.length - 1) {
      if (batch.length > 0) {
        await prisma.municipality.createMany({
          data: batch
        })
        success += batch.length
        console.log(`Importati ${success} comuni/nazioni...`)
        batch = []
      }
    }
  }

  console.log(`Importazione completata: ${success} comuni/nazioni importati con successo.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
