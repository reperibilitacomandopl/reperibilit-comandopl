const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Altamura2024!', 10);
  
  const updated = await prisma.user.updateMany({
    where: { 
      matricola: '357',
      tenant: { slug: 'altamura' }
    },
    data: { password: passwordHash }
  });
  
  console.log('--- PASSWORD RESETTATA ---');
  console.log(updated);
  console.log('Nuova Password: Altamura2024!');
  console.log('--------------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
