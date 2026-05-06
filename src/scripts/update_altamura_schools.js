const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'beba76b4-f698-4eae-b009-e740d8f7c562'; // Altamura

  // Le scuole che escono prima il lunedì (13:00-13:30)
  const mondayEarlyExitSchools = [
    'Sc. Manzoni',
    'Sc. Minniti',
    'Sc. Carbonia',
    'Sc. Bari/Calore',
    'Sc. Golgota/Riccione',
    'Sc. Golgota', // also assuming this if they split
    'Sc. Martiri',
    'Sc. Zara/Ronchetti'
  ];

  // Le scuole che hanno l'uscita pomeridiana il lunedì (14:15-14:30)
  const mondayAfternoonSchools = [
    'Sc. Vitt. Emanuele',
    'Sc. Manzoni',
    'Sc. Martiri'
  ];

  const schools = await prisma.school.findMany({
    where: { tenantId }
  });

  for (const school of schools) {
    // 1. Update general entrance/exit times for all days to standard
    await prisma.schoolSchedule.updateMany({
      where: { schoolId: school.id },
      data: {
        entranceTime: '08:00-08:45',
        exitTime: '13:45-14:00',
        afternoonExitTime: null // reset afternoon
      }
    });

    // 2. Override for Monday (dayOfWeek = 1)
    const isEarlyExit = mondayEarlyExitSchools.includes(school.name);
    const hasAfternoon = mondayAfternoonSchools.includes(school.name);

    if (isEarlyExit || hasAfternoon) {
      await prisma.schoolSchedule.updateMany({
        where: { 
          schoolId: school.id,
          dayOfWeek: 1
        },
        data: {
          exitTime: isEarlyExit ? '13:00-13:30' : '13:45-14:00',
          afternoonExitTime: hasAfternoon ? '14:15-14:30' : null
        }
      });
      console.log(`Updated Monday schedule for ${school.name}`);
    }
  }

  console.log("School schedules updated successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
