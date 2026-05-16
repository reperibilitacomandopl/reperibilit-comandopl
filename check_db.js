const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const shifts = await prisma.shift.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: { user: { select: { name: true, lastLat: true, lastLng: true, lastSeenAt: true } } }
  });
  
  const myShifts = shifts.filter(s => s.user.name.includes('Dibenedetto'));
  
  console.log('--- TURNI DI DIBENEDETTO OGGI ---');
  myShifts.forEach(s => {
    console.log(`TimeRange: ${s.timeRange}, Type: ${s.type}`);
    console.log(`User GPS Last Seen: ${s.user.lastSeenAt}`);
    console.log(`User GPS Lat/Lng: ${s.user.lastLat}, ${s.user.lastLng}`);
  });
}

main().catch(console.error).finally(() => process.exit(0));
