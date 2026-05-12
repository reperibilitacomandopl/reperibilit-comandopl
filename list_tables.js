const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
  console.log('Tables in public schema:', JSON.stringify(tables, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
