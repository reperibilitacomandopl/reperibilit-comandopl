import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
try {
  const tenants = await p.tenant.findMany({ select: { slug: true, isActive: true, name: true } })
  console.log("tenants:", JSON.stringify(tenants))
  const users = await p.user.count()
  console.log("users:", users)
} catch (e) {
  console.error("ERR:", e.message)
} finally {
  await p.$disconnect()
}
