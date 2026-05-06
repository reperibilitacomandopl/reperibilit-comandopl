import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const mario = await prisma.user.findFirst({
    where: { name: { contains: "Dibenedetto", mode: "insensitive" } }
  });
  console.log("Mario full record:", mario);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
