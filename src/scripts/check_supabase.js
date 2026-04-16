const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("=== DIAGNOSTICA DATABASE SUPABASE ===")
  try {
    const tables = ['User', 'Tenant', 'Shift', 'Announcement', 'Notification']
    for (const table of tables) {
      try {
        const count = await prisma[table.toLowerCase()].count()
        console.log(`Tabella [${table}]: ${count} record`)
      } catch (e) {
        console.log(`Tabella [${table}]: NON TROVATA O ERRORE`)
      }
    }
    
    const users = await prisma.user.findMany({ take: 5 })
    if (users.length > 0) {
      console.log("\nPrimi 5 utenti trovati (matricole):", users.map(u => u.matricola).join(", "))
    } else {
      console.log("\nNessun utente trovato nel database.")
    }
  } catch (err) {
    console.error("Errore fatale connessione:", err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
