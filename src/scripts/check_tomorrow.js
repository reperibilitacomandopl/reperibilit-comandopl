const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const d = '2026-05-07'
  const doc = await prisma.certifiedDocument.findFirst({
    where: { type: 'ODS', metadata: { contains: d } }
  })
  console.log(doc ? `CERTIFIED (${d})` : `NOT CERTIFIED (${d})`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
