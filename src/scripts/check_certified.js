const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const docs = await prisma.certifiedDocument.findMany({
    where: { type: 'ODS' }
  })
  console.log('--- CERTIFIED ODS DOCUMENTS ---')
  docs.forEach(d => {
    console.log(`ID: ${d.id} | Date: ${d.metadata} | Created: ${d.createdAt}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
