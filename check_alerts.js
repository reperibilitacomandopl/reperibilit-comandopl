
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const alerts = await prisma.notification.findMany({
    where: { type: 'ALERT' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { name: true, matricola: true } } }
  })

  console.log('Ultime 10 Notifiche ALERT (SOS):')
  alerts.forEach(a => {
    console.log(`- Data: ${a.createdAt.toISOString()} | Per: ${a.user?.name} (${a.user?.matricola}) | Messaggio: ${a.message}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
