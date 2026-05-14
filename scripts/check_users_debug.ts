import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkUsers() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'BENEDETTO', mode: 'insensitive' } }
  })
  const users2 = await prisma.user.findMany({
    where: { name: { contains: 'BELTEMPO', mode: 'insensitive' } }
  })
  
  console.log("DI BENEDETTO (matching 'BENEDETTO'):", JSON.stringify(users, null, 2))
  console.log("BELTEMPO (matching 'BELTEMPO'):", JSON.stringify(users2, null, 2))

  const now = new Date()
  const localDateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Rome' }).format(now)
  const today = new Date(`${localDateStr}T00:00:00.000Z`)
  
  console.log("Target Date for shifts:", today.toISOString())

  const shifts = await prisma.shift.findMany({
    where: { 
      date: {
        gte: new Date(today.getTime() - 24 * 3600000),
        lte: new Date(today.getTime() + 24 * 3600000)
      }
    },
    include: { user: { select: { name: true } } }
  })
  
  console.log("Shifts around today:")
  shifts.forEach(s => {
    console.log(`- ${s.user.name} on ${s.date.toISOString()} (Rep: ${s.repType})`)
  })
}

checkUsers().catch(console.error)
