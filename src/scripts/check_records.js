/* eslint-disable */
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const records = await prisma.clockRecord.findMany({
    take: 10,
    orderBy: { timestamp: 'desc' },
    include: { user: { select: { name: true } } }
  })
  console.log("LAST 10 CLOCK RECORDS:")
  console.log(JSON.stringify(records, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
