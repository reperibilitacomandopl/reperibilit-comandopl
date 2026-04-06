import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AdminDashboard from "@/components/AdminDashboard"

export const dynamic = "force-dynamic"

export default async function PianificazionePage({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login")

  const monthStr = (await searchParams).month
  const yearStr = (await searchParams).year

  const now = new Date()
  const currentYear = yearStr ? parseInt(yearStr, 10) : now.getFullYear()
  const currentMonth = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1

  const [users, shifts, pubRec, settings, rotationGroups, categories] = await Promise.all([
    prisma.user.findMany({
      where: { role: "AGENTE" },
      orderBy: { name: "asc" },
      select: { 
        id: true, name: true, matricola: true, isUfficiale: true, 
        email: true, phone: true, qualifica: true, gradoLivello: true, 
        squadra: true, massimale: true, defaultServiceCategoryId: true, 
        defaultServiceTypeId: true, rotationGroupId: true,
        dataAssunzione: true, scadenzaPatente: true, scadenzaPortoArmi: true, noteInterne: true
      }
    }),
    prisma.shift.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
          lt: new Date(Date.UTC(currentYear, currentMonth, 2)),
        },
      },
    }),
    prisma.monthStatus.findUnique({
      where: { month_year: { month: currentMonth, year: currentYear } },
    }),
    prisma.globalSettings.findFirst(),
    prisma.rotationGroup.findMany({ orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ include: { types: true }, orderBy: { orderIndex: "asc" } }),
  ])

  const isPublished = pubRec ? pubRec.isPublished : false

  return (
    <div className="p-2 sm:p-4 lg:p-6 relative z-10 h-full">
      <AdminDashboard
        allAgents={users as any}
        shifts={shifts}
        currentYear={currentYear}
        currentMonth={currentMonth}
        isPublished={isPublished}
        settings={settings as any}
        rotationGroups={rotationGroups}
        categories={categories}
      />
    </div>
  )
}
