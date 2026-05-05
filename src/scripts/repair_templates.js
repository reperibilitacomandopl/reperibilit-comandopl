const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const cats = await prisma.serviceCategory.findMany({
    include: { types: true }
  })
  const viabilitaCat = cats.find(c => c.name.toUpperCase() === 'VIABILITÀ')
  if (!viabilitaCat) {
    console.error('Category VIABILITÀ not found!')
    return
  }

  const templates = await prisma.patrolTemplate.findMany({
    where: { name: { startsWith: 'Pronto Intervento' } }
  })

  console.log('--- REPAIRING PATROL TEMPLATES ---')
  for (const t of templates) {
    if (!t.serviceCategoryId) {
      console.log(`Updating Template ${t.name}: Assigning to VIABILITÀ (${viabilitaCat.id})`)
      await prisma.patrolTemplate.update({
        where: { id: t.id },
        data: { serviceCategoryId: viabilitaCat.id }
      })
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
