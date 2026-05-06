import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const tenantId = 'd067ae4e-1c94-4f0d-b540-d1716214b54b'; // comando-test
  
  const shifts = await prisma.shift.findMany({
    where: {
      tenantId: tenantId,
      date: {
        gte: new Date('2026-05-01T00:00:00Z'),
        lt: new Date('2026-06-01T00:00:00Z')
      }
    },
    select: {
      userId: true,
      date: true,
      type: true
    }
  });

  console.log(`Found ${shifts.length} shifts for May 2026 in comando-test.`);
  if (shifts.length > 0) {
    console.log("Sample shifts:", shifts.slice(0, 5));
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
