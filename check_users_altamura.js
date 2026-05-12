const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const altamura = await prisma.tenant.findUnique({ where: { slug: 'altamura' } });
  if (!altamura) {
    console.log('Tenant Altamura non trovato');
    return;
  }
  
  const users = await prisma.user.findMany({
    where: { tenantId: altamura.id },
    select: { name: true, matricola: true, role: true, email: true }
  });
  
  console.log('--- UTENTI ALTAMURA ---');
  console.table(users);
  console.log('-----------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
