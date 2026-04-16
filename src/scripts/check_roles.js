const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
    });
    console.log('Roles distribution:', roles);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
