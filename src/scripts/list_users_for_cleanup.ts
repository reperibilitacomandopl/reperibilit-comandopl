import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, matricola: true, role: true, tenantId: true, createdAt: true },
    orderBy: { createdAt: "desc" }
  })
  console.log("USER_LIST_START")
  console.log(JSON.stringify(users, null, 2))
  console.log("USER_LIST_END")
}

main().catch(console.error).finally(() => prisma.$disconnect())
