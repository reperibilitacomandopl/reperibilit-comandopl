const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { name: true, email: true } } }
  })
  
  console.log("LAST 10 NOTIFICATIONS:")
  console.log(JSON.stringify(notifications, null, 2))
  
  const swapRequests = await prisma.shiftSwapRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  })
  console.log("\nLAST 5 SWAP REQUESTS:")
  console.log(JSON.stringify(swapRequests, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
