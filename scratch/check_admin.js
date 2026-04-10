const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { email: 'admin' },
          { name: 'admin' }
        ]
      },
      include: {
        tenant: true
      }
    });

    console.log('--- UTENTI CON PRIVILEGI ADMIN O NOME "ADMIN" ---');
    users.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`Nome: ${u.name}`);
      console.log(`Email: ${u.email}`);
      console.log(`Ruolo: ${u.role}`);
      console.log(`Tenant Slug: ${u.tenant?.slug || 'SISTEMA/SUPERADMIN'}`);
      console.log(`Matricola: ${u.matricola}`);
      console.log('-----------------------------------');
    });

    if (users.length === 0) {
      console.log('Nessun utente ADMIN trovato.');
    }
  } catch (err) {
    console.error('Errore:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
