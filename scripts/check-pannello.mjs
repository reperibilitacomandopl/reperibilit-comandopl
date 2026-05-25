import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const slug = "altamura"
try {
  const tenant = await p.tenant.findUnique({ where: { slug } })
  if (!tenant) throw new Error("tenant missing")
  const tenantId = tenant.id
  const tf = { tenantId }
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const totalAgents = await p.user.count({ where: { role: "AGENTE", ...tf } })
  const todayShifts = await p.shift.findMany({
    where: {
      ...tf,
      date: {
        gte: new Date(Date.UTC(currentYear, now.getMonth(), now.getDate())),
        lt: new Date(Date.UTC(currentYear, now.getMonth(), now.getDate() + 1)),
      },
    },
    include: {
      user: { select: { name: true, isUfficiale: true, qualifica: true } },
      vehicle: true,
      serviceCategory: true,
      serviceType: true,
    },
    orderBy: { patrolGroupId: "asc" },
  })
  console.log("ok agents", totalAgents, "shifts", todayShifts.length)
} catch (e) {
  console.error("FAIL:", e)
} finally {
  await p.$disconnect()
}
