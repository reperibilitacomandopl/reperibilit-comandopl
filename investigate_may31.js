const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dateStr = '2026-05-31';
  const targetDate = new Date(dateStr + 'T00:00:00.000Z');
  
  console.log('Checking reperibili on', dateStr);
  
  const shifts = await prisma.shift.findMany({
    where: { 
      date: targetDate, 
      repType: { not: null } 
    },
    include: { 
      user: { 
        select: { 
          id: true,
          name: true, 
          fixedRestDay: true,
          rotationGroup: true
        } 
      } 
    }
  });

  if (shifts.length === 0) {
    console.log('No one found on-call on May 31st.');
    return;
  }

  shifts.forEach(s => {
    console.log(`- ${s.user.name}: ${s.repType} (FixedRest: ${s.user.fixedRestDay})`);
    if (s.user.rotationGroup) {
       console.log(`  Pattern: ${s.user.rotationGroup.name}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
