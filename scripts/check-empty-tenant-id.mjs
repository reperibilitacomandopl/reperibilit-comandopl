import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
const tests = [
  () => p.tenant.findUnique({ where: { id: "" } }),
  () => p.globalSettings.findUnique({ where: { tenantId: "" } }),
  () => p.monthStatus.findUnique({
    where: { month_year_tenantId: { month: 5, year: 2026, tenantId: "" } },
  }),
]
for (const t of tests) {
  try {
    const r = await t()
    console.log("ok", r === null ? "null" : typeof r)
  } catch (e) {
    console.log("ERR:", e.message?.slice(0, 120))
  }
}
await p.$disconnect()
