const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shifts = await prisma.shift.findMany({
    select: { type: true, timeRange: true, date: true },
    take: 500
  });

  const uniqueTypes = new Set();
  shifts.forEach(s => {
    if (s.type) uniqueTypes.add(s.type);
  });
  
  console.log("=== TIPI DI TURNO TROVATI IN DATABASE ===");
  console.log(Array.from(uniqueTypes).join(" | "));

  console.log("\n=== ESEMPIO 10 TURNI ===");
  console.log(shifts.slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
