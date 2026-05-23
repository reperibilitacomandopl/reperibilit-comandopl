import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { email: true, tenantId: true } });
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  const countTypes = await prisma.vehicleType.count();
  const countBrands = await prisma.vehicleBrand.count();
  const countStreets = await prisma.street.count();
  console.log({ countTypes, countBrands, countStreets });
  console.log('Users:', users);
  console.log('Tenants:', tenants);
}
main().catch(console.error).finally(() => prisma.$disconnect());
