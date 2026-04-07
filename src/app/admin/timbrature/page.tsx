import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TimbratureClient from "./TimbratureClient"

export const dynamic = "force-dynamic"

export default async function TimbraturePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  const tenantId = session.user.tenantId
  if (!tenantId) redirect("/admin/pannello")

  const records = await prisma.clockRecord.findMany({
    where: { tenantId },
    include: { user: { select: { name: true, matricola: true } } },
    orderBy: { timestamp: "desc" },
    take: 100
  })

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { lat: true, lng: true, clockInRadius: true }
  })

  return (
    <TimbratureClient 
      initialRecords={JSON.parse(JSON.stringify(records))} 
      tenantSettings={tenant}
    />
  )
}
