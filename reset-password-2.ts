import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const tenantId = 'd067ae4e-1c94-4f0d-b540-d1716214b54b'; // comando-test
  
  const newHash = "$2b$10$vFkP3WO9xEBtqX4oj/OMaeqWyvFSiHaeHdrH2Fj616A7oVpzzWzp6"; // valid hash for 'password'
  
  const result = await prisma.user.updateMany({
    where: { tenantId },
    data: { password: newHash }
  });

  console.log(`Updated ${result.count} users with new password 'password'.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
