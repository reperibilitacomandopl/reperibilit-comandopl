const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.agentRequest.findMany({
    where: { OR: [{ hours: { gt: 0 } }, { code: { contains: 'PERMESSO' } }] },
    take: 5
  });

  const absences = await prisma.absence.findMany({
    where: { code: { contains: 'P' } }, // magari "Permesso" inizia per P
    take: 5
  });
  
  const shifts_with_details = await prisma.shift.findMany({
    where: { serviceDetails: { contains: 'permesso', mode: 'insensitive' } },
    take: 5
  });

  const agenda = await prisma.agendaEntry.findMany({
    where: { hours: { gt: 0 } },
    take: 5
  });

  console.log("=== AGENT REQUESTS (PERMESSI) ===", requests);
  console.log("=== ABSENCES ===", absences);
  console.log("=== SHIFTS CON NOTA PERMESSO ===", shifts_with_details);
  console.log("=== AGENDA (ORE) ===", agenda);
}

main().catch(console.error).finally(() => prisma.$disconnect());
