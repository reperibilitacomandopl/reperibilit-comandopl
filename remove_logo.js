const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.tenant.update({
    where: { slug: 'altamura' },
    data: { logoUrl: null }
  });
  
  console.log('--- LOGO RIMOSSO ---');
  console.log('Comando:', updated.name);
  console.log('Nuovo logoUrl:', updated.logoUrl);
  console.log('--------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
