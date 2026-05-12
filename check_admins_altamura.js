const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const altamura = await prisma.tenant.findUnique({ where: { slug: 'altamura' } });
  if (!altamura) {
    console.log('Tenant Altamura non trovato');
    return;
  }
  
  const admins = await prisma.user.findMany({
    where: { 
      tenantId: altamura.id,
      OR: [
        { role: 'ADMIN' },
        { isSuperAdmin: true }
      ]
    },
    select: { name: true, matricola: true, role: true, isSuperAdmin: true }
  });
  
  console.log('--- AMMINISTRATORI ALTAMURA ---');
  console.table(admins);
  console.log('-------------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
