import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function run() {
  console.log("Avvio normalizzazione record storici Shift...")

  const mappings = [
    { from: "(F)", to: "FERIE" },
    { from: "(L 104)", to: "104_1" },
    { from: "(SOPP)", to: "FEST_S" },
    { from: "RCORSO", to: "REC_CORS" },
    { from: "(INFR)", to: "MALATT" },
    { from: "(A32)", to: "VISITA" } // Mappatura ipotizzata per Art. 32
  ]

  for (const m of mappings) {
    const res = await prisma.shift.updateMany({
      where: { type: m.from },
      data: { type: m.to }
    })
    console.log(`Aggiornati ${res.count} record: ${m.from} -> ${m.to}`)
  }

  console.log("Operazione completata.")
}

run()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
