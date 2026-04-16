const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const shifts = await prisma.shift.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, userId: true, date: true, tenantId: true, type: true, repType: true }
    });
    console.log("Latest shifts in DB:", JSON.stringify(shifts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
