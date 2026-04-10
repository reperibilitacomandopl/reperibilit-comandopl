import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TimbratureClient from "./TimbratureClient"

export const dynamic = "force-dynamic"

export default async function TimbraturePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

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

  const alerts = await prisma.emergencyAlert.findMany({
    where: { 
      tenantId,
      status: "PENDING",
      date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Ultime 24 ore
    },
    include: { admin: { select: { name: true } } },
    orderBy: { date: "desc" }
  })

  return (
    <TimbratureClient 
      initialRecords={JSON.parse(JSON.stringify(records))} 
      tenantSettings={tenant}
      activeAlerts={JSON.parse(JSON.stringify(alerts))}
    />
  )
}
