const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const now = new Date();
  console.log('--- DIAGNOSTIC SOFT-DELETED CLOCKS ---');
  console.log('Server Time:', now.toString());

  const agent = await prisma.user.findFirst({
    where: { name: { contains: 'dibenedetto', mode: 'insensitive' } }
  });

  if (!agent) {
    console.log('Agent not found!');
    return;
  }

  const mayStart = new Date('2026-05-01T00:00:00Z');
  const mayEnd = new Date('2026-05-31T23:59:59Z');

  // Check all clock records in May
  const clocks = await prisma.clockRecord.findMany({
    where: {
      userId: agent.id,
      timestamp: { gte: mayStart, lt: mayEnd }
    },
    orderBy: { timestamp: 'asc' }
  });

  console.log(`\nFound ${clocks.length} clock records in May 2026:`);
  clocks.forEach(c => {
    console.log(`  Clock ID: ${c.id}`);
    console.log(`    Type: ${c.type}`);
    console.log(`    Timestamp: ${c.timestamp.toISOString()}`);
    console.log(`    deletedAt: ${c.deletedAt ? c.deletedAt.toISOString() : 'NULL (ACTIVE)'}`);
  });

  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check notifications sent today
  const notifications = await prisma.notification.findMany({
    where: {
      userId: agent.id,
      createdAt: { gte: today, lt: tomorrow }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\nFound ${notifications.length} notifications sent today:`);
  notifications.forEach(n => {
    console.log(`  Notif ID: ${n.id}`);
    console.log(`    Title: ${n.title}`);
    console.log(`    Message: ${n.message}`);
    console.log(`    Type: ${n.type}`);
    console.log(`    createdAt: ${n.createdAt.toISOString()}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
