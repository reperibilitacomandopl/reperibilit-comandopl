import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const marios = await prisma.user.findMany({
    where: { name: { contains: "Dibenedetto", mode: "insensitive" } },
    include: { tenant: true }
  });
  console.log("Marios:", marios.map(m => ({ id: m.id, name: m.name, tenantSlug: m.tenant?.slug, tenantId: m.tenantId })));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
