const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const now = new Date();
  console.log('--- REMOTE SERVER CURRENT STATE ---');
  console.log('Server Time:', now.toString());
  console.log('Server UTC Time:', now.toUTCString());

  // Find agent Dibenedetto
  const agent = await prisma.user.findFirst({
    where: { name: { contains: 'dibenedetto', mode: 'insensitive' } },
    include: {
      pushSubscriptions: true
    }
  });

  if (!agent) {
    console.log('Agent Dibenedetto not found!');
    return;
  }

  console.log('Agent Details:');
  console.log('  ID:', agent.id);
  console.log('  Name:', agent.name);
  console.log('  Email:', agent.email);
  console.log('  Telegram Chat ID:', agent.telegramChatId);
  console.log('  Telegram Opt-In:', agent.telegramOptIn);
  console.log('  GPS lastLat:', agent.lastLat);
  console.log('  GPS lastLng:', agent.lastLng);
  console.log('  GPS lastSeenAt:', agent.lastSeenAt);
  console.log('  Has Push Subscription:', agent.pushSubscriptions.length > 0);
  if (agent.pushSubscriptions.length > 0) {
    console.log('  Push Subscriptions Count:', agent.pushSubscriptions.length);
    agent.pushSubscriptions.forEach((sub, idx) => {
      console.log(`    Sub ${idx + 1}:`, sub.endpoint.substring(0, 50) + '...');
    });
  }

  // Today shift in UTC
  const todayStr = now.toISOString().split('T')[0];
  console.log('\nQuerying shifts for today:', todayStr);
  
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const shifts = await prisma.shift.findMany({
    where: {
      userId: agent.id,
      date: { gte: today, lt: tomorrow }
    }
  });

  console.log('Shifts found for today:', shifts.length);
  shifts.forEach(s => {
    console.log(`  Shift ID: ${s.id}, Date: ${s.date.toISOString()}, Type: ${s.type}, timeRange: ${s.timeRange}`);
  });

  // Check clock records today
  const clocks = await prisma.clockRecord.findMany({
    where: {
      userId: agent.id,
      timestamp: { gte: today, lt: tomorrow }
    },
    orderBy: { timestamp: 'asc' }
  });

  console.log('\nClock records found for today:', clocks.length);
  clocks.forEach(c => {
    console.log(`  Clock ID: ${c.id}, Type: ${c.type}, Timestamp: ${c.timestamp.toISOString()}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
