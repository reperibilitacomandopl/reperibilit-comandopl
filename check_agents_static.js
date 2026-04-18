const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.user.findMany({
    where: { role: 'AGENTE', isActive: true },
    select: { id: true, name: true, fixedRestDay: true, rotationGroupId: true }
  });
  console.log(JSON.stringify(agents, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
