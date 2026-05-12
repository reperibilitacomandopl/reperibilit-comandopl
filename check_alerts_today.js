
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  
  const alerts = await prisma.notification.findMany({
    where: { type: 'ALERT', createdAt: { gte: startOfDay } },
    include: { user: { select: { name: true, matricola: true } } }
  })

  console.log(`Notifiche ALERT di oggi (${startOfDay.toISOString().split('T')[0]}): ${alerts.length}`)
  alerts.forEach(a => {
    console.log(`- Per: ${a.user?.name} (${a.user?.matricola}) | Titolo: ${a.title}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
