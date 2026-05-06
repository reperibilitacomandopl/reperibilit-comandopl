const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const templates = await prisma.patrolTemplate.findMany({
    include: { members: true, serviceCategory: true, serviceType: true }
  })
  console.log('--- PATROL TEMPLATES ---')
  templates.forEach(t => {
    console.log(`${t.name.padEnd(20)} | Cat: ${t.serviceCategory?.name || 'NULL'} | Type: ${t.serviceType?.name || 'NULL'} | Members: ${t.members.length}`)
    t.members.forEach(m => console.log(`  - ${m.name}`))
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
