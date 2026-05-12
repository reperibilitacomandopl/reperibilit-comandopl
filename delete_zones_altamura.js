const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.geofenceZone.deleteMany({
    where: { 
      tenant: { slug: 'altamura' }
    }
  });
  
  console.log('--- ZONE ELIMINATE ---');
  console.log(deleted);
  console.log('----------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
