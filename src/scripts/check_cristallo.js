const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const d = new Date()
  d.setHours(0,0,0,0)
  const tomorrow = new Date(d)
  tomorrow.setDate(d.getDate() + 1)

  const s = await prisma.shift.findFirst({
    where: {
      user: { name: 'CRISTALLO ANTONELLA' },
      date: { gte: d, lt: tomorrow }
    }
  })
  console.log(JSON.stringify(s, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
