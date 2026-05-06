import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function run() {
  const tenantId = 'd067ae4e-1c94-4f0d-b540-d1716214b54b'; // comando-test
  
  const newPassword = "password";
  const newHash = await bcrypt.hash(newPassword, 10);
  
  const result = await prisma.user.updateMany({
    where: { tenantId },
    data: { password: newHash }
  });

  console.log(`Updated ${result.count} users with new password '${newPassword}'.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
