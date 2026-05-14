import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function run() {
  const agent = await prisma.user.findFirst({
    where: { name: { contains: 'dibenedetto', mode: 'insensitive' } }
  });

  if (!agent) {
    console.log('Agente DIBENEDETTO non trovato');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  console.log(`Simulazione per ${agent.name} in data ${today.toLocaleDateString()}`);

  // 1. Pulizia vecchi dati di oggi
  await prisma.clockRecord.deleteMany({
    where: { userId: agent.id, timestamp: { gte: today, lt: tomorrow } }
  });
  await prisma.agentRequest.deleteMany({
    where: { userId: agent.id, date: { gte: today, lt: tomorrow } }
  });

  console.log('Pulizia dati odierni completata.');

  // 2. Creazione richiesta di straordinario imprevisto (STR_EXTRA)
  const request = await prisma.agentRequest.create({
    data: {
      userId: agent.id,
      tenantId: agent.tenantId,
      code: 'STR_EXTRA',
      status: 'PENDING', // Deve essere PENDING per apparire nella inbox
      date: today,
      hours: 2.5,
      notes: 'Intervento urgente per rilievo sinistro stradale fuori orario.'
    }
  });

  console.log('✅ Richiesta simulata creata con successo!');
  console.log(`ID Richiesta: ${request.id}`);
  console.log('Ora dovrebbe apparire nella inbox "Richieste da Smartphone" del pannello Straordinari.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
