const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function test() {
  const tenantId = "cm92w8y7n00003r703j6e0k3y" // I'll try to find a valid tenantId
  const date = "2026-04-27"
  const datePart = date.substring(0, 10)
  const [y, m, d] = datePart.split("-").map(Number)
  const targetDate = new Date(Date.UTC(y, m - 1, d))
  const dayOfWeek = targetDate.getUTCDay()

  console.log("Start test for date:", date, "Day of week:", dayOfWeek)

  try {
    const schools = await prisma.school.findMany({
      include: { schedules: { where: { dayOfWeek } } }
    })
    console.log("Schools found:", schools.length)

    const shifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(targetDate),
          lte: new Date(new Date(targetDate).setUTCHours(23, 59, 59, 999))
        }
      }
    })
    console.log("Shifts found:", shifts.length)
    
    // Test logic
    const morningShifts = shifts.filter(s => s.type.toUpperCase().startsWith("M"))
    console.log("Morning shifts:", morningShifts.length)

  } catch (e) {
    console.error("CRASH:", e)
  }
}

test().finally(() => prisma.$disconnect())
