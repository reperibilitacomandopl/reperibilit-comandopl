const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'beba76b4-f698-4eae-b009-e740d8f7c562'; // Altamura

  // LUNEDI (1)
  const mondayEarlyExit = [
    'Sc. Manzoni', 'Sc. Minniti', 'Sc. Carbonia', 'Sc. Bari/Calore',
    'Sc. Golgota/Riccione', 'Sc. Golgota', 'Sc. Martiri', 'Sc. Zara/Ronchetti',
    'Sc. Vitt. Emanuele'
  ];
  const mondayAfternoon = [
    'Sc. Vitt. Emanuele', 'Sc. Manzoni', 'Sc. Martiri'
  ];

  // VENERDI (5)
  const fridayEarlyExit = ['Sc. Selva', 'Sc. Pompei'];
  const fridayAfternoon = ['Sc. Selva', 'Sc. Pompei'];

  const schools = await prisma.school.findMany({ where: { tenantId } });

  for (const school of schools) {
    // Lunedi (1)
    const isMonEarly = mondayEarlyExit.includes(school.name);
    const isMonAft = mondayAfternoon.includes(school.name);
    if (isMonEarly || isMonAft) {
      await prisma.schoolSchedule.updateMany({
        where: { schoolId: school.id, dayOfWeek: 1 },
        data: {
          exitTime: isMonEarly ? '13:00-13:30' : '13:45-14:00',
          afternoonExitTime: isMonAft ? '14:15-14:30' : null
        }
      });
    }

    // Venerdi (5)
    const isFriEarly = fridayEarlyExit.includes(school.name);
    const isFriAft = fridayAfternoon.includes(school.name);
    if (isFriEarly || isFriAft) {
      await prisma.schoolSchedule.updateMany({
        where: { schoolId: school.id, dayOfWeek: 5 },
        data: {
          exitTime: isFriEarly ? '13:00-13:30' : '13:45-14:00',
          afternoonExitTime: isFriAft ? '14:15-14:30' : null
        }
      });
      console.log(`Updated Friday schedule for ${school.name}`);
    }
  }

  console.log("Schedules tweaked for Monday and Friday.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
