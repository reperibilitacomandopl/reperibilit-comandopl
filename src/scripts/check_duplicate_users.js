const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, tenantId: true, role: true }
    });
    console.log("Users List (ID, Name, Tenant, Role):");
    users.forEach(u => {
        console.log(`${u.id} | ${u.name.padEnd(25)} | ${u.tenantId} | ${u.role}`);
    });
}

main().finally(() => prisma.$disconnect());
