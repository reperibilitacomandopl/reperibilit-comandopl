const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenantId = "beba76b4-f698-4eae-b009-e740d8f7c562";
    const userId = "5e95ec24-14f9-4667-8549-441b883527ff"; // Michele
    const date = new Date(Date.UTC(2026, 4, 2)); // 02/05/2026
    
    console.log("Simulating REP Import for Michele on 02/05/2026...");
    
    await prisma.$transaction(async (tx) => {
        // Find existing
        const existing = await tx.shift.findFirst({
            where: { userId, date, tenantId }
        });
        
        if (existing) {
            console.log("Found existing shift:", existing.id, "Current repType:", existing.repType);
            const updated = await tx.shift.update({
                where: { id: existing.id },
                data: { repType: 'rep_i' }
            });
            console.log("Updated repType to:", updated.repType);
        } else {
            console.log("No shift found, creating one...");
            const created = await tx.shift.create({
                data: { userId, date, tenantId, type: 'RP', repType: 'rep_i' }
            });
            console.log("Created shift with repType:", created.repType);
        }
    });

    // Verification
    const final = await prisma.shift.findFirst({
        where: { userId, date, tenantId }
    });
    console.log("Final State in DB:", JSON.stringify(final, null, 2));
}

main().finally(() => prisma.$disconnect());
