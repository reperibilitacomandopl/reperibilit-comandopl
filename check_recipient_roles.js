
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const ids = [
    '399', '1374', '426', '423', '1506', '350', '1494', '220', '3540', '4085'
  ]

  const users = await prisma.user.findMany({
    where: { matricola: { in: ids } },
    select: { name: true, matricola: true, role: true, isUfficiale: true }
  })

  console.log('Ruoli Destinatari SOS:')
  users.forEach(u => {
    console.log(`- ${u.name} (${u.matricola}) | Role: ${u.role} | Ufficiale: ${u.isUfficiale}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
