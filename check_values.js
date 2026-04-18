const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shifts = await prisma.shift.findMany({
      where: {
          date: {
              gte: new Date(Date.UTC(2026, 4, 1)),
              lt: new Date(Date.UTC(2026, 5, 1))
          },
          repType: { not: null }
      },
      select: { repType: true },
      take: 10
  });
  console.log('Distinct repType values in May:', [...new Set(shifts.map(s => s.repType))]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
