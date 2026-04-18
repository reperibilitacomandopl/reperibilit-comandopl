const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const month = 5;
  const year = 2026;
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const stats = await prisma.shift.groupBy({
    by: ['repType'],
    where: {
      date: { gte: startDate, lt: endDate },
      repType: { not: null }
    },
    _count: true
  });
  console.log('May 2026 repType counts:', stats);

  const agentsWithAnyRep = await prisma.user.count({
      where: {
          shifts: {
              some: {
                  date: { gte: startDate, lt: endDate },
                  repType: { not: null }
              }
          }
      }
  });
  console.log('Total unique agents with ANY repType in May:', agentsWithAnyRep);
  
  const agentsWithREPInName = await prisma.user.count({
      where: {
          shifts: {
              some: {
                  date: { gte: startDate, lt: endDate },
                  repType: { contains: 'REP' }
              }
          }
      }
  });
  console.log('Total unique agents with uppercase "REP" in May:', agentsWithREPInName);
}

main().catch(console.error).finally(() => prisma.$disconnect());
