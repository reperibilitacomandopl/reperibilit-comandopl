import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PannelloOverview from "@/components/PannelloOverview"

export const dynamic = "force-dynamic"

export default async function PannelloPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
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

  // Calcolo totale scadenze a 30 giorni
  const alertDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const [patenti, armi, kevlar, veicoliScad] = await Promise.all([
    prisma.user.count({ where: { isActive: true, scadenzaPatente: { lte: alertDate, gte: now }, ...tf } }),
    prisma.user.count({ where: { isActive: true, scadenzaPortoArmi: { lte: alertDate, gte: now }, ...tf } }),
    prisma.armor.count({ where: { stato: "ATTIVO", scadenzaKevlar: { lte: alertDate, gte: now }, ...tf } }),
    prisma.vehicle.count({ where: { stato: "ATTIVO", OR: [ { scadenzaAssicurazione: { lte: alertDate, gte: now } }, { scadenzaBollo: { lte: alertDate, gte: now } }, { scadenzaRevisione: { lte: alertDate, gte: now } } ], ...tf } })
  ])
  const totalScadenze = patenti + armi + kevlar + veicoliScad

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
        tenantSlug={session.user.tenantSlug || ""}
        tenantName={session.user.tenantName || ""}
        totalScadenze={totalScadenze}
      />
    </div>
  )
}
