const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const reqs = await prisma.agentRequest.findMany({take:5});
  const abs = await prisma.absence.findMany({take:5});
  const ag = await prisma.agendaEntry.findMany({take:5});
  
  console.log("AGENT_REQUEST:", reqs);
  console.log("ABSENCE:", abs);
  console.log("AGENDA:", ag);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
