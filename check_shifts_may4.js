
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const date = new Date('2026-05-04T00:00:00Z')
  const shifts = await prisma.shift.findMany({
    where: { date: date, repType: { not: null } },
    include: { user: { select: { name: true, matricola: true } } }
  })

  console.log(`Turni Reperibilità per il 2026-05-04: ${shifts.length}`)
  shifts.forEach(s => {
    console.log(`- ${s.user?.name} (${s.user?.matricola}) | Tipo: ${s.repType}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
