const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const month = 5;
  const year = 2026;
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  console.log(`Checking shifts between ${startDate.toISOString()} and ${endDate.toISOString()}`);
  
  const count = await prisma.shift.count({
    where: {
      date: {
        gte: startDate,
        lt: endDate
      },
      repType: {
        contains: 'REP'
      }
    }
  });

  console.log(`Total REP shifts found for May 2026: ${count}`);
  
  const samples = await prisma.shift.findMany({
      where: {
          date: { gte: startDate, lt: endDate },
          repType: { contains: 'REP' }
      },
      take: 5,
      include: { user: { select: { name: true } } }
  });
  
  console.log('Sample agents:', samples.map(s => s.user.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
