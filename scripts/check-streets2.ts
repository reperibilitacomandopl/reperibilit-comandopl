import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const streets = await prisma.street.findMany({ take: 20 });
  console.log(streets.map(s => s.denominazione));
}
main().catch(console.error).finally(() => prisma.$disconnect());
