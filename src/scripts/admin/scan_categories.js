const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function introspectCategories() {
  const categories = await prisma.serviceCategory.findMany({
    select: { id: true, name: true }
  });
  console.log(categories);
}

introspectCategories().catch(console.error).finally(()=>prisma.$disconnect());
