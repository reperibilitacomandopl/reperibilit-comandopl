import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkLogs() {
  const count = await prisma.auditLog.count();
  const latest = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Total Audit Logs: ${count}`);
  console.log('Latest Logs:', JSON.stringify(latest, null, 2));
}

checkLogs()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
