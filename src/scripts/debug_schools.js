const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function checkShifts() {
  const dateStr = "2026-04-27"
  const [y, m, d] = dateStr.split("-").map(Number)
  const targetDate = new Date(Date.UTC(y, m - 1, d))
  const startDate = new Date(targetDate)
  const endDate = new Date(targetDate)
  endDate.setUTCHours(23, 59, 59, 999)

  console.log(`Checking shifts for ${dateStr}...`)
  
  const shifts = await prisma.shift.findMany({
    where: {
      date: { gte: startDate, lte: endDate }
    },
    include: { user: true }
  })

  console.log(`Found ${shifts.length} shifts.`)
  shifts.forEach(s => {
    console.log(`- User: ${s.user.name}, Type: ${s.type}, Details: ${s.serviceDetails}`)
  })
  
  const schools = await prisma.school.findMany({
    include: { schedules: true }
  })
  console.log(`Found ${schools.length} schools.`)
  schools.forEach(sch => {
      console.log(`- School: ${sch.name}, Schedules: ${sch.schedules.length}`)
  })
}

checkShifts()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
