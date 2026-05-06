const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shifts = await prisma.shift.findMany({
    where: { 
      date: new Date('2026-05-08T00:00:00Z')
    },
    include: { user: true }
  });
  console.dir(shifts.map(s => ({name: s.user.name, type: s.type, overtimeHours: s.overtimeHours, date: s.date})), {depth: null});
}

main().finally(() => prisma.$disconnect());
