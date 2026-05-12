
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const notifications = await prisma.notification.findMany({
    where: { userId: '3eb23dee-05a0-49f8-b446-d6d9770d5f6e', type: 'ALERT' }
  })
  console.log(JSON.stringify(notifications, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
