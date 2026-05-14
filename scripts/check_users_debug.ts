import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkUsers() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'DI BENEDETTO' } }
  })
  const users2 = await prisma.user.findMany({
    where: { name: { contains: 'BELTEMPO' } }
  })
  
  console.log("DI BENEDETTO:", JSON.stringify(users, null, 2))
  console.log("BELTEMPO:", JSON.stringify(users2, null, 2))

  const today = new Date()
  today.setHours(0,0,0,0)
  
  const shifts = await prisma.shift.findMany({
    where: { date: today }
  })
  console.log("SHIFTS TODAY count:", shifts.length)
}

checkUsers().catch(console.error)
