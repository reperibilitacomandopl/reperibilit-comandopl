const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.announcement.count()
    console.log(`Total announcements: ${count}`)
    const latest = await prisma.announcement.findMany({ take: 5 })
    console.log("Latest announcements:", JSON.stringify(latest, null, 2))
  } catch (err) {
    console.error("Error querying announcements:", err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
