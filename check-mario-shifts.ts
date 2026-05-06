import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const shifts = await prisma.shift.findMany({
    where: {
      user: { name: { contains: "Dibenedetto", mode: "insensitive" } },
      date: { gte: new Date("2026-05-01T00:00:00.000Z") }
    },
    orderBy: { date: 'asc' }
  });
  console.log("Shifts for Mario:", shifts.map(s => ({
    date: s.date.toISOString(),
    type: s.type,
    repType: s.repType
  })));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
