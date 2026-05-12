
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const count = await prisma.chatMessage.count()
  console.log('Total Chat Messages:', count)
  
  const lastMessages = await prisma.chatMessage.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { name: true } } }
  })
  console.log('Last 5 Messages:', JSON.stringify(lastMessages, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
