const { PrismaClient } = require('@prisma/client');
const { Prisma } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  console.log('🚀 Applicazione script SQL per immutabilità log...');

  const commands = [
    // 1. Crea la funzione trigger
    `CREATE OR REPLACE FUNCTION protect_audit_logs()
     RETURNS TRIGGER AS $$
     BEGIN
         RAISE EXCEPTION 'I log di audit sono immutabili e non possono essere modificati o cancellati. (Violazione GDPR/AgID)';
     END;
     $$ LANGUAGE plpgsql;`,

    // 2. Applica il trigger per DELETE
    `DROP TRIGGER IF EXISTS prevent_audit_delete ON "AuditLog";`,
    `CREATE TRIGGER prevent_audit_delete
     BEFORE DELETE ON "AuditLog"
     FOR EACH ROW
     EXECUTE FUNCTION protect_audit_logs();`,

    // 3. Applica il trigger per UPDATE
    `DROP TRIGGER IF EXISTS prevent_audit_update ON "AuditLog";`,
    `CREATE TRIGGER prevent_audit_update
     BEFORE UPDATE ON "AuditLog"
     FOR EACH ROW
     EXECUTE FUNCTION protect_audit_logs();`
  ];

  try {
    for (const cmd of commands) {
      console.log(`Executing command...`);
      await prisma.$executeRawUnsafe(cmd);
    }
    console.log('✅ Script applicato con successo!');
  } catch (error) {
    console.error('❌ Errore durante l\'applicazione dello script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
