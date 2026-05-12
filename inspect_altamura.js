
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const altamura = await prisma.tenant.findUnique({ where: { slug: 'altamura' } })
  if (!altamura) {
    console.log('Tenant Altamura non trovato')
    return
  }

  const users = await prisma.user.findMany({
    where: { tenantId: altamura.id },
    select: { id: true, name: true, matricola: true, password: true }
  })

  console.log(`Utenti Altamura trovati: ${users.length}`)
  users.forEach(u => {
    const hasHash = u.password && u.password.startsWith('$2')
    console.log(`- ${u.name} (Matricola: ${u.matricola}) | Password impostata: ${!!u.password} | Formato Hash corretto: ${hasHash}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
