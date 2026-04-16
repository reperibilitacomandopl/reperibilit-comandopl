const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const uffs = await prisma.user.count({ where: { isUfficiale: true, isActive: true } });
  console.log('Numero di ufficiali:', uffs);
}
main().finally(() => prisma.$disconnect());
