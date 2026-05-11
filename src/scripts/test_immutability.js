const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  console.log('🧪 Test di immutabilità: Tentativo di eliminazione di un log di audit...');
  
  try {
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!lastLog) {
      console.log('⚠️ Nessun log trovato per il test.');
      return;
    }

    await prisma.auditLog.delete({
      where: { id: lastLog.id }
    });

    console.log('❌ ERRORE: Il log è stato eliminato!');
  } catch (error) {
    console.log('✅ SUCCESSO: Il database ha bloccato l\'operazione.');
    console.log('--- DETTAGLI ERRORE DB ---');
    console.log(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
