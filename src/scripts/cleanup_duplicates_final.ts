import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function cleanupDuplicates() {
  console.log("🧹 Avvio pulizia utenti obsoleti...")

  // 1. Trova il tenant di Altamura
  const tenant = await prisma.tenant.findFirst({
    where: { slug: "altamura" } // Sappiamo che lo slug è altamura
  })

  if (!tenant) {
    console.error("❌ Tenant 'altamura' non trovato.")
    return
  }

  const today = new Date("2026-04-13T00:00:00.000Z")

  // 2. Identifica utenti da cancellare:
  // - Appartengono al tenant
  // - Sono AGENTI
  // - Creati PRIMA di oggi (2026-04-13)
  const usersToDelete = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: "AGENTE",
      createdAt: {
        lt: today
      }
    },
    select: { id: true, name: true, matricola: true, createdAt: true }
  })

  console.log(`🔍 Trovati ${usersToDelete.length} utenti obsoleti da rimuovere.`)

  if (usersToDelete.length === 0) {
    console.log("✨ Nessun duplicato trovato. Il database è già pulito.")
    return
  }

  // Visualizza un'anteprima (opzionale for log)
  usersToDelete.slice(0, 5).forEach(u => {
    console.log(`   - In lista per rimozione: ${u.name} (${u.matricola}) - Creato il: ${u.createdAt.toISOString()}`)
  })

  // 3. ESECUZIONE CANCELLAZIONE
  const deleteResult = await prisma.user.deleteMany({
    where: {
      id: {
        in: usersToDelete.map(u => u.id)
      }
    }
  })

  console.log(`✅ Successo! Rimossi ${deleteResult.count} record obsoleti.`)
}

cleanupDuplicates()
  .catch(e => console.error("❌ Errore durante la pulizia:", e))
  .finally(async () => await prisma.$disconnect())
