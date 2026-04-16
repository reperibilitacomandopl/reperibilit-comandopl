const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const repCount = await prisma.shift.count({
    where: {
      repType: { not: null }
    }
  });
  console.log(`Total shifts with any repType: ${repCount}`);

  const repICount = await prisma.shift.count({
    where: {
      repType: 'rep_i'
    }
  });
  console.log(`Total shifts with repType 'rep_i': ${repICount}`);

  const micheleShifts = await prisma.shift.findMany({
    where: {
      userId: '5e95ec24-14f9-4667-8549-441b883527ff',
      date: {
        gte: new Date('2026-05-01'),
        lte: new Date('2026-05-31')
      }
    }
  });
  
  console.log(`Michele May 2026 shifts count: ${micheleShifts.length}`);
  const micheleRep = micheleShifts.filter(s => s.repType !== null);
  console.log(`Michele May 2026 REP count: ${micheleRep.length}`);
  if (micheleRep.length > 0) {
    console.log('Sample Michele REP:', JSON.stringify(micheleRep[0], null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
