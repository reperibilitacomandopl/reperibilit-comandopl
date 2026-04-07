import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PannelloOverview from "@/components/PannelloOverview"

export const dynamic = "force-dynamic"

export default async function PannelloPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")
  const tenantId = session.user.tenantId

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Fetch lightweight data for overview
  const tf = tenantId ? { tenantId } : {}

  const [totalAgents, todayShifts, monthStatus, settings, totalVehicles, pendingSwaps] = await Promise.all([
    prisma.user.count({ where: { role: "AGENTE", ...tf } }),
    prisma.shift.findMany({
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
        serviceType: true
      },
      orderBy: { patrolGroupId: 'asc' }
    }),
    prisma.monthStatus.findFirst({
      where: { month: currentMonth, year: currentYear, ...tf },
    }),
    prisma.globalSettings.findFirst({ where: { ...tf } }),
    prisma.vehicle.count({ where: { ...tf } }),
    prisma.shiftSwapRequest.count({ where: { status: "PENDING", ...tf } })
  ])

  return (
    <div className="p-6 lg:p-8 relative z-10">
      <PannelloOverview
        totalAgents={totalAgents}
        todayShifts={todayShifts as any}
        isPublished={monthStatus?.isPublished ?? false}
        currentMonth={currentMonth}
        currentYear={currentYear}
        settings={settings as any}
        totalVehicles={totalVehicles}
        pendingSwaps={pendingSwaps}
      />
    </div>
  )
}
