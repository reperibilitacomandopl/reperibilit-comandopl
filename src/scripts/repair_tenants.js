const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  console.log("INIZIO RIPARAZIONE TENANT...")

  // 1. Ripara ShiftSwapRequest
  const orphanSwaps = await prisma.shiftSwapRequest.findMany({
    where: { tenantId: null },
    include: { requester: true }
  })
  
  console.log(`Trovate ${orphanSwaps.length} richieste di scambio senza tenant.`)
  for (const swap of orphanSwaps) {
    if (swap.requester.tenantId) {
      await prisma.shiftSwapRequest.update({
        where: { id: swap.id },
        data: { tenantId: swap.requester.tenantId }
      })
      console.log(`- Richiesta ${swap.id} aggiornata al tenant ${swap.requester.tenantId}`)
    }
  }

  // 2. Ripara Notifications
  const orphanNotifications = await prisma.notification.findMany({
    where: { tenantId: null },
    include: { user: true }
  })
  
  console.log(`Trovate ${orphanNotifications.length} notifiche senza tenant.`)
  for (const n of orphanNotifications) {
    if (n.user.tenantId) {
      await prisma.notification.update({
        where: { id: n.id },
        data: { tenantId: n.user.tenantId }
      })
      console.log(`- Notifica ${n.id} aggiornata al tenant ${n.user.tenantId}`)
    }
  }

  console.log("RIPARAZIONE COMPLETATA.")
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
