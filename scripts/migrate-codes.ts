import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  console.log("Inizio migrazione codici agenda...")

  // 1. Aggiornamento AgentRequest (Le richieste degli agenti)
  const reqUpdate = await prisma.agentRequest.updateMany({
    where: { code: "CONG_P" },
    data: { code: "0111" } // Mappiamo il vecchio generico al 100% Figlio 1 (il più comune)
  })
  console.log(`Aggiornate ${reqUpdate.count} richieste AgentRequest da CONG_P a 0111`)

  await prisma.agentRequest.updateMany({
    where: { code: "MAL_FI" },
    data: { code: "0018" } // Malattia Figlio 1
  })

  // 2. Aggiornamento Absence (Assenze caricate)
  const absUpdate = await prisma.absence.updateMany({
    where: { code: "CONG_P" },
    data: { code: "0111" }
  })
  console.log(`Aggiornate ${absUpdate.count} assenze da CONG_P a 0111`)

  // 3. Aggiornamento Shift (Turni a codice, es. FERIE, MALATTIA)
  const shiftUpdate = await prisma.shift.updateMany({
    where: { type: "CONG_P" },
    data: { type: "CONG_P1" } // Nei turni usiamo lo shortCode
  })
  console.log(`Aggiornati ${shiftUpdate.count} turni da CONG_P a CONG_P1`)

  console.log("Migrazione completata con successo.")
}

migrate()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
