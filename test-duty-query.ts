import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const now = new Date();
  const localDateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Rome' }).format(now);
  const today = new Date(`${localDateStr}T00:00:00.000Z`);

  console.log("Local Date Str:", localDateStr);
  console.log("Today UTC:", today.toISOString());

  const dutyTeamShifts = await prisma.shift.findMany({
    where: {
      date: today,
      tenantId: 'beba76b4-f698-4eae-b009-e740d8f7c562',
      repType: { not: null }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          isUfficiale: true
        }
      }
    }
  });

  console.log("Duty Team for Today:", dutyTeamShifts.map(s => ({
    userId: s.userId,
    userName: s.user.name,
    repType: s.repType,
    date: s.date.toISOString()
  })));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
