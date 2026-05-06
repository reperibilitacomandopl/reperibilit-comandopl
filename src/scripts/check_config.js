const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const cats = await prisma.serviceCategory.findMany({
    include: { types: true }
  })
  console.log('--- SERVICE CATEGORIES ---')
  cats.forEach(c => {
    console.log(`${c.name.padEnd(20)} | ID: ${c.id}`)
    c.types.forEach(t => {
      console.log(`  - ${t.name.padEnd(18)} | ID: ${t.id}`)
    })
  })

  const users = await prisma.user.findMany({
    where: { name: { in: ['CRISTALLO ANTONELLA', 'DIMARNO LEONARDO', 'FIORE PAMELA', 'MIRGALDI VINCENZO'] } },
    select: { name: true, defaultServiceCategoryId: true, defaultServiceTypeId: true, servizio: true }
  })
  console.log('\n--- TARGET USERS CONFIG ---')
  users.forEach(u => {
    console.log(`${u.name.padEnd(25)} | DefCat: ${u.defaultServiceCategoryId || 'NULL'} | DefType: ${u.defaultServiceTypeId || 'NULL'} | Servizio: ${u.servizio || 'NULL'}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
