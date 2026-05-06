import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const mario = await prisma.user.findFirst({
    where: { name: { contains: "Dibenedetto", mode: "insensitive" } },
    select: { id: true, name: true, isUfficiale: true, role: true }
  });
  console.log("Mario:", mario);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
