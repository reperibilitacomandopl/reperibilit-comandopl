const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const date = new Date(Date.UTC(2026, 5, 1)); // 1 Giugno 2026
  console.log('Checking shifts for', date.toISOString());
  
  const shifts = await prisma.shift.findMany({
      where: {
          date: date
      },
      select: {
          userId: true,
          type: true,
          user: { select: { name: true } }
      }
  });

  console.log('Total shifts on June 1st:', shifts.length);
  shifts.forEach(s => {
      console.log(`- ${s.user.name}: ${s.type}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
