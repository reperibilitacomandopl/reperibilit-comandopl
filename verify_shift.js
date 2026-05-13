const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: { name: { contains: 'Dibenedetto', mode: 'insensitive' } }
    });
    
    if (users.length === 0) {
      console.log("Utente non trovato");
      return;
    }
    
    const user = users[0];
    console.log(`UTENTE: ${user.name} (ID: ${user.id})`);
    
    const startOfDay = new Date('2026-05-12T00:00:00Z');
    const endOfDay = new Date('2026-05-12T23:59:59Z');
    
    // 1. TIMBRATURE REALI (ClockRecord)
    const clocks = await prisma.clockRecord.findMany({
      where: {
        userId: user.id,
        timestamp: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { timestamp: 'asc' }
    });
    
    console.log("\n--- TIMBRATURE REALI (ClockRecord) ---");
    if (clocks.length === 0) {
      console.log("Nessuna timbratura trovata per oggi.");
    } else {
      clocks.forEach(c => {
        console.log(`  [${c.type}] ${new Date(c.timestamp).toLocaleString('it-IT')}`);
      });
      
      // Calcolo durata se abbiamo IN e OUT
      const inRecord = clocks.find(c => c.type === 'IN');
      const outRecord = clocks.find(c => c.type === 'OUT');
      
      if (inRecord && outRecord) {
        const durationMs = new Date(outRecord.timestamp).getTime() - new Date(inRecord.timestamp).getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        console.log(`  DURATA CALCOLATA: ${durationHours.toFixed(2)} ore`);
      }
    }
    
    // 2. TURNI REGISTRATI (Shift)
    const shifts = await prisma.shift.findMany({
      where: {
        userId: user.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });
    
    console.log("\n--- TURNI REGISTRATI (Shift) ---");
    if (shifts.length === 0) {
      console.log("Nessun turno registrato/finalizzato per oggi.");
    } else {
      shifts.forEach(s => {
        console.log(`  Data: ${new Date(s.date).toLocaleDateString('it-IT')}`);
        console.log(`  Durata Standard: ${s.durationHours} ore`);
        console.log(`  Straordinario: ${s.overtimeHours} ore`);
      });
    }

    // 3. IMPOSTAZIONI BUONI PASTO
    const settings = await prisma.globalSettings.findFirst({
      where: { tenantId: user.tenantId }
    });
    
    console.log("\n--- REGOLE BUONI PASTO ---");
    if (settings) {
      console.log(`  Minimo turno continuato per BP: ${settings.bpTurnoContinuato} ore`);
      console.log(`  Massimale ore standard: ${settings.massimaleAgente} ore`);
    }

  } catch (err) {
    console.error("Errore:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
