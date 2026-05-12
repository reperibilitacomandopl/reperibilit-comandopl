
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  
  const shifts = await prisma.shift.findMany({
    where: { date: today, repType: { not: null } },
    include: { user: { select: { name: true, matricola: true } } }
  })

  console.log(`Turni Reperibilità per OGGI (${today.toISOString().split('T')[0]}): ${shifts.length}`)
  shifts.forEach(s => {
    console.log(`- ${s.user?.name} (${s.user?.matricola}) | Tipo: ${s.repType}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
