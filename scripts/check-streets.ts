import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const streetsByTenant = await prisma.street.groupBy({
    by: ['tenantId'],
    _count: { id: true }
  });
  console.log('Streets by tenant:', streetsByTenant);
  
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  console.log('Tenants:', tenants);
}
main().catch(console.error).finally(() => prisma.$disconnect());
