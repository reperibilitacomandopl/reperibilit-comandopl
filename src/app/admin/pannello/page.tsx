import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PannelloOverview from "@/components/PannelloOverview"

export const dynamic = "force-dynamic"

export default async function PannelloPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Fetch lightweight data for overview
  const [totalAgents, todayShifts, monthStatus, settings] = await Promise.all([
    prisma.user.count({ where: { role: "AGENTE" } }),
    prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(currentYear, now.getMonth(), now.getDate())),
          lt: new Date(Date.UTC(currentYear, now.getMonth(), now.getDate() + 1)),
        },
      },
      include: { user: { select: { name: true, isUfficiale: true } } },
    }),
    prisma.monthStatus.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } },
    }),
    prisma.globalSettings.findFirst(),
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
      />
    </div>
  )
}
