const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'beba76b4-f698-4eae-b009-e740d8f7c562'; // Altamura

  const shifts = await prisma.shift.findMany({
    where: { tenantId },
    include: {
      serviceCategory: true
    }
  });

  let updated = 0;
  for (const shift of shifts) {
    if (!shift.serviceDetails || !shift.serviceCategory) continue;

    const catName = shift.serviceCategory.name;
    let newDetails = shift.serviceDetails;
    
    // Check if it starts with "CATEGORY +" or exactly equals "CATEGORY"
    const prefix = catName + ' + ';
    if (newDetails.toUpperCase().startsWith(prefix.toUpperCase())) {
      newDetails = newDetails.substring(prefix.length).trim();
    } else if (newDetails.toUpperCase() === catName.toUpperCase()) {
      newDetails = "";
    }

    if (newDetails !== shift.serviceDetails) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: { serviceDetails: newDetails }
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} shifts by removing redundant category prefixes.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
