const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const targetDate = new Date(Date.UTC(2026, 5, 1));
  console.log('Checking shifts in DB for:', targetDate.toISOString());
  
  const shifts = await prisma.shift.findMany({
    where: { 
      date: targetDate
    },
    include: { user: { select: { name: true } } }
  });

  if (shifts.length === 0) {
    console.log('NO SHIFTS FOUND for June 1st in DB.');
  } else {
    console.log(`Found ${shifts.length} shifts:`);
    shifts.forEach(s => {
      console.log(`- ${s.user.name}: ${s.type} (rep: ${s.repType})`);
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
