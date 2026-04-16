
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.serviceCategory.findMany({ select: { id: true, name: true } });
  console.log(JSON.stringify(cats, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
