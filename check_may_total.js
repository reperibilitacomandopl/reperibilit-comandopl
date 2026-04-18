const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const month = 5;
  const year = 2026;
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  console.log(`Checking ALL shifts between ${startDate.toISOString()} and ${endDate.toISOString()}`);
  
  const totalCount = await prisma.shift.count({
    where: {
      date: {
        gte: startDate,
        lt: endDate
      }
    }
  });

  const repCount = await prisma.shift.count({
    where: {
      date: { gte: startDate, lt: endDate },
      repType: { not: null }
    }
  });

  console.log(`Total shifts: ${totalCount}`);
  console.log(`Shifts with repType: ${repCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
