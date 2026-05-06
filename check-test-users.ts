import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const tenantId = 'd067ae4e-1c94-4f0d-b540-d1716214b54b'; // comando-test
  
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { name: true, matricola: true, role: true, isUfficiale: true }
  });

  console.log("Users in comando-test:", users);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
