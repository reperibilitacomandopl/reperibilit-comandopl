import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const tenantId = 'beba76b4-f698-4eae-b009-e740d8f7c562';
  
  const today = new Date('2026-05-05T00:00:00.000Z');

  const dutyTeamShifts = await prisma.shift.findMany({
    where: {
      date: today,
      tenantId: tenantId,
      repType: { not: null }
    },
    include: {
      user: {
        select: { id: true, name: true, isUfficiale: true, gradoLivello: true }
      }
    }
  });

  console.log("Duty Team for May 5th:", dutyTeamShifts.map(s => ({
    name: s.user.name,
    isUfficiale: s.user.isUfficiale,
    grado: s.user.gradoLivello
  })));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
