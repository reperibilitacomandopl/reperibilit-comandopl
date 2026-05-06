import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const tenants = await prisma.tenant.findMany();
  console.log("Tenants:", tenants);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
