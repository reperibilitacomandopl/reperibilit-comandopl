const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userId = '87eb6244-b181-4a42-a8d1-7f12253fdfb3';
    const dateStr = '2026-05-12';
    const startOfDay = new Date('2026-05-12T00:00:00Z');
    const endOfDay = new Date('2026-05-12T23:59:59Z');

    console.log(`Aggiornamento turno per Dibenedetto il ${dateStr}...`);

    // Calcolo basato su 16:00 - 23:45
    const totalHours = 7.75;
    const standardHours = 6.0;
    const overtimeHours = 1.75;

    const shift = await prisma.shift.updateMany({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay }
      },
      data: {
        durationHours: totalHours,
        overtimeHours: overtimeHours
      }
    });

    console.log(`Turno aggiornato: ${shift.count} record modificati.`);
    
    // Verifichiamo se esiste una richiesta di buono pasto o se va aggiunta
    // In questo sistema i buoni pasto spesso sono calcolati a vista nelle esportazioni,
    // ma assicuriamoci che le ore siano salvate correttamente.

  } catch (err) {
    console.error("Errore:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
