const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { 
      matricola: '357',
      tenant: { slug: 'altamura' }
    },
    data: { role: 'ADMIN' }
  });
  
  console.log('--- RISULTATO PROMOZIONE ---');
  console.log(updated);
  console.log('----------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
