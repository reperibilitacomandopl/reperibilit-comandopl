const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { matricola: "admin" }
  });
  console.log("Found Users with matricola 'admin':", JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
