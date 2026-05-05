const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const cats = await prisma.serviceCategory.findMany({
    include: { types: true }
  })
  const catMap = {} // Name -> ID
  cats.forEach(c => { catMap[c.name.toUpperCase()] = c.id })

  const users = await prisma.user.findMany({
    where: { servizio: { not: null } }
  })

  console.log('--- REPAIRING USER DEFAULTS ---')
  for (const u of users) {
    const servantName = u.servizio.toUpperCase()
    // Find category that contains or matches this service name
    let targetCatId = null
    
    // Exact match first
    if (catMap[servantName]) {
      targetCatId = catMap[servantName]
    } else {
      // Partial match
      for (const catName in catMap) {
        if (servantName.includes(catName) || catName.includes(servantName)) {
          targetCatId = catMap[catName]
          break
        }
      }
    }

    if (targetCatId && u.defaultServiceCategoryId !== targetCatId) {
      console.log(`Updating ${u.name}: ${u.defaultServiceCategoryId} -> ${targetCatId} (${u.servizio})`)
      await prisma.user.update({
        where: { id: u.id },
        data: { defaultServiceCategoryId: targetCatId }
      })
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
