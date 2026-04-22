const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log("--- DIAGNOSTICA DATABASE ---")
  
  // 1. Check AgendaEntry unique index
  try {
    const entryCount = await prisma.agendaEntry.count()
    console.log(`Totale AgendaEntries: ${entryCount}`)
    
    const sample = await prisma.agendaEntry.findFirst()
    console.log("Esempio Record:", JSON.stringify(sample, null, 2))
    
    // 2. Check Users
    const userCount = await prisma.user.count()
    console.log(`Totale Utenti: ${userCount}`)
    
    const usersWithoutTenant = await prisma.user.count({ where: { tenantId: null } })
    console.log(`Utenti senza tenantId: ${usersWithoutTenant}`)
    
    // 3. Check Overtime Codes
    const codes = await prisma.agendaEntry.groupBy({
      by: ['code'],
      _count: true
    })
    console.log("Codici presenti:", codes)

  } catch (e) {
    console.error("Errore diagnostica:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
