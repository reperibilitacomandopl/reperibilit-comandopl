const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schedules = await prisma.schoolSchedule.findMany({
    include: { school: true }
  });
  console.dir(schedules.filter(s => s.afternoonExitTime), {depth: null});
}

main().finally(() => prisma.$disconnect());
