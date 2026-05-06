const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'beba76b4-f698-4eae-b009-e740d8f7c562'; // Altamura tenant
  
  const schools = [
    { name: 'Sc. Martiri', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Zara/Ronchetti', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Carbonia', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Minniti', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Golgota/Riccione', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Golgota', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Vitt. Emanuele', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Manzoni', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Bari/Calore', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Pompei', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Selva', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' },
    { name: 'Sc. Piccinni/Parisi', entranceTime: '08:00-08:45', exitTime: '13:45-14:00' }
  ];

  for (const s of schools) {
    let school = await prisma.school.findFirst({
      where: {
        tenantId,
        name: s.name
      }
    });

    if (!school) {
      school = await prisma.school.create({
        data: {
          name: s.name,
          tenantId
        }
      });
      console.log(`Created school: ${s.name}`);
    } else {
      console.log(`School ${s.name} already exists`);
    }

    // Assign schedules for Monday to Friday (1-5)
    for (let day = 1; day <= 5; day++) {
      const existingSchedule = await prisma.schoolSchedule.findUnique({
        where: {
          schoolId_dayOfWeek: {
            schoolId: school.id,
            dayOfWeek: day
          }
        }
      });

      if (!existingSchedule) {
        await prisma.schoolSchedule.create({
          data: {
            schoolId: school.id,
            dayOfWeek: day,
            entranceTime: s.entranceTime,
            exitTime: s.exitTime
          }
        });
        console.log(`Created schedule for ${s.name} on day ${day}`);
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
