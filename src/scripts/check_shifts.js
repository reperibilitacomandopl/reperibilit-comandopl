const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const d = new Date()
  d.setHours(0,0,0,0)
  const tomorrow = new Date(d)
  tomorrow.setDate(d.getDate() + 1)

  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: d,
        lt: tomorrow
      }
    },
    include: {
      user: true,
      serviceCategory: true,
      serviceType: true
    }
  })

  console.log('--- SHIFTS FOR TODAY ---')
  shifts.forEach(s => {
    console.log(`${s.user.name.padEnd(25)} | Type: ${s.type.padEnd(10)} | Cat: ${(s.serviceCategory?.name || 'NULL').padEnd(15)} | TypeID: ${s.serviceTypeId || 'NULL'}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
