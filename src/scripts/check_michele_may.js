const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = '5e95ec24-14f9-4667-8549-441b883527ff'; // Michele
    const shifts = await prisma.shift.findMany({
        where: {
            userId: userId,
            date: {
                gte: new Date(Date.UTC(2026, 4, 1)),
                lt: new Date(Date.UTC(2026, 5, 1))
            }
        },
        orderBy: { date: 'asc' }
    });
    console.log(`Shifts for Michele in May 2026 (${shifts.length}):`, JSON.stringify(shifts, null, 2));
}

main().finally(() => prisma.$disconnect());
