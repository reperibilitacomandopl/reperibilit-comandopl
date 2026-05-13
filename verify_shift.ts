import { prisma } from './src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'Dibenedetto', mode: 'insensitive' } }
  });
  
  if (users.length === 0) {
    console.log("Utente non trovato");
    return;
  }
  
  const userId = users[0].id;
  console.log(`ID Utente: ${userId}`);
  
  // Oggi: 2026-05-12
  const startOfDay = new Date('2026-05-12T00:00:00Z');
  const endOfDay = new Date('2026-05-12T23:59:59Z');
  
  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      startTime: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      user: true
    }
  });
  
  console.log("Shifts trovati:", JSON.stringify(shifts, null, 2));
}

main();
