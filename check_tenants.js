const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { name: true, slug: true }
  });
  console.log('--- LISTA TENANTS ---');
  console.table(tenants);
  console.log('---------------------');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
