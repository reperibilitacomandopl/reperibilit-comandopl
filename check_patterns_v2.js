const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.rotationGroup.findMany();
  console.log(JSON.stringify(groups, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
