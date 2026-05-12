const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.user.updateMany({
    where: { 
      matricola: '357',
      tenant: { slug: 'altamura' }
    },
    data: { password: '$2b$10$fS06/2qqwObrr/IkWnz9PuELBC5FOJkhHYdF6pPGeCfjdZIhzBKTy' }
  });
  
  console.log('--- PASSWORD AGGIORNATA CON HASH ---');
  console.log(updated);
  console.log('------------------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
