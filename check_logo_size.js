const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'altamura' }
  });
  
  if (tenant) {
    console.log('--- LUNGHEZZA LOGO ALTAMURA ---');
    console.log(tenant.logoUrl ? tenant.logoUrl.length + ' caratteri' : 'Logo è null');
    console.log('-------------------------------');
  } else {
    console.log('Tenant non trovato.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
