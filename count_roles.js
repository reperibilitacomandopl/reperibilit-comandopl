
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const altamura = await prisma.tenant.findUnique({ where: { slug: 'altamura' } })
  if (!altamura) return

  const total = await prisma.user.count({ where: { tenantId: altamura.id } })
  const admins = await prisma.user.count({ where: { tenantId: altamura.id, role: 'ADMIN' } })
  const ufficiali = await prisma.user.count({ where: { tenantId: altamura.id, isUfficiale: true } })

  console.log(`Statistiche Altamura:`)
  console.log(`- Totale utenti: ${total}`)
  console.log(`- Admin: ${admins}`)
  console.log(`- Ufficiali: ${ufficiali}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
