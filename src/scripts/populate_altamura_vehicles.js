const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'beba76b4-f698-4eae-b009-e740d8f7c562'; // Altamura tenant
  
  const vehicles = [
    { name: 'Beta 101 (Renault)', stato: 'ATTIVO' },
    { name: 'Beta 121 (Alfa Romeo)', stato: 'ATTIVO' },
    { name: 'Beta 122 (Alfa Romeo)', stato: 'ATTIVO' },
    { name: 'Beta 123 (Alfa Romeo)', stato: 'ATTIVO' },
    { name: 'Beta 125 (Jeep)', stato: 'ATTIVO' },
    { name: 'Beta 127 (Subaru)', stato: 'ATTIVO' },
    { name: 'Beta 128 (Subaru)', stato: 'ATTIVO' },
    { name: 'Beta 130 (Subaru)', stato: 'ATTIVO' },
    { name: 'Beta 131 (Lancia Y)', stato: 'ATTIVO' }
  ];

  for (const v of vehicles) {
    // Check if it exists
    const existing = await prisma.vehicle.findFirst({
      where: {
        tenantId,
        name: v.name
      }
    });

    if (!existing) {
      await prisma.vehicle.create({
        data: {
          ...v,
          tenantId
        }
      });
      console.log(`Created vehicle: ${v.name}`);
    } else {
      console.log(`Vehicle ${v.name} already exists`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
