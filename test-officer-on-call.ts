import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: {
      id: { in: ['43f17422-c157-4dbf-ad07-a54672059f85', '58e49109-6984-49c4-9375-28a701cbf5ee', '59abccff-743e-4866-8170-7aa788988347', '6e5c9a97-0e03-44e0-9cdc-b1157c39ca61', '85b53486-79ba-4ec0-93cb-f352fb435105', '872043ba-30d1-4f92-8b5e-e6fd630d686f', 'd0fa6a25-7cdc-4d51-b92a-1e47f598d4a7', 'f8096b20-6ea4-4940-87d9-a543238f45b9'] }
    },
    select: { name: true, isUfficiale: true, gradoLivello: true, role: true }
  });
  console.log("Officers on call:", users);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
