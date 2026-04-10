const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    console.log('--- TENANTS REGISTRATI ---');
    for (const t of tenants) {
      console.log(`Nome: ${t.name}`);
      console.log(`Slug: ${t.slug}`);
      console.log(`ID: ${t.id}`);
      console.log(`Utenti: ${t._count.users}`);
      
      const admins = await prisma.user.findMany({
        where: { tenantId: t.id, role: 'ADMIN' },
        select: { name: true, matricola: true }
      });
      console.log(`Admins: ${admins.map(a => `${a.name} (${a.matricola})`).join(', ')}`);
      console.log('-------------------------');
    }
  } catch (err) {
    console.error('Errore:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenants();
