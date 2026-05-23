import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Avvio importazione mezzi e veicoli...')

  const tenant = await prisma.tenant.findUnique({ where: { slug: 'altamura' } })
  if (!tenant) {
    console.error("Tenant 'altamura' non trovato. Impossibile importare.")
    process.exit(1)
  }

  // Importazione Tabella Mezzi
  const mezziPath = path.join(process.cwd(), 'tabella_mezzi.txt')
  if (fs.existsSync(mezziPath)) {
    console.log(`Eliminazione vecchi tipi mezzo globali...`)
    await prisma.vehicleType.deleteMany({})

    const mezziContent = fs.readFileSync(mezziPath, 'utf-8')
    const mezziLines = mezziContent.split('\n').filter(line => line.trim().length > 0)
    const mezziData = mezziLines.slice(1) // Salta intestazione

    let mezziSuccess = 0
    for (const line of mezziData) {
      try {
        const columns = line.split('\t').map(c => c.trim())
        if (columns.length < 2) continue

        const codice = columns[0]
        const descrizione = columns[1]
        const targaObbligatoria = columns[2] === 'SI'
        const coob = columns[3] === 'SI'
        const decurtazionePunti = columns[4] === 'SI'

        await prisma.vehicleType.create({
          data: {
            tenantId: null,
            codice,
            descrizione,
            targaObbligatoria,
            coob,
            decurtazionePunti
          }
        })
        mezziSuccess++
      } catch (err) {
        console.error(`Errore riga mezzo: ${line}`, err)
      }
    }
    console.log(`Importati ${mezziSuccess} tipi mezzo.`)
  }

  // Importazione Tabella Veicoli (Marche)
  const veicoliPath = path.join(process.cwd(), 'veicoli.txt')
  if (fs.existsSync(veicoliPath)) {
    console.log(`Eliminazione vecchie marche veicoli globali...`)
    await prisma.vehicleBrand.deleteMany({})

    const veicoliContent = fs.readFileSync(veicoliPath, 'utf-8')
    const veicoliLines = veicoliContent.split('\n').filter(line => line.trim().length > 0)
    const veicoliData = veicoliLines.slice(1) // Salta intestazione

    let veicoliSuccess = 0
    for (const line of veicoliData) {
      try {
        const columns = line.split('\t').map(c => c.trim())
        if (columns.length < 2) continue

        const codice = columns[0]
        const descrizione = columns[1]
        const nazione = columns[2] || null

        await prisma.vehicleBrand.create({
          data: {
            tenantId: null,
            codice,
            descrizione,
            nazione
          }
        })
        veicoliSuccess++
      } catch (err) {
        console.error(`Errore riga veicolo: ${line}`, err)
      }
    }
    console.log(`Importate ${veicoliSuccess} marche veicoli.`)
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
