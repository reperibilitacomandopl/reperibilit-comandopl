const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { matricola: '420' },
    select: { 
      id: true, 
      name: true, 
      matricola: true, 
      tenant: { 
        select: { 
          slug: true, 
          isActive: true 
        } 
      } 
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
