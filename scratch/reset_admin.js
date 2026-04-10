const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = "Altamura2026!";
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const userId = "b7984b59-5773-4bc9-9082-73f49027e14c";

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { 
      tenantId: "1d9c7f69-7b2a-40ee-a8ef-1029e29a16bd",
      password: hashedPassword,
      forcePasswordChange: false,
      role: "ADMIN",
      isSuperAdmin: true,
      canManageShifts: true,
      canManageUsers: true,
      canConfigureSystem: true,
      canVerifyClockIns: true
    }
  });

  console.log("CRITICAL: Admin account fully restored and configured for 'altamura'.");
  console.log("Password set to: " + newPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
