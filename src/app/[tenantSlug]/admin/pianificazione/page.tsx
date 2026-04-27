// @ts-nocheck
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AdminDashboard from "@/components/AdminDashboard"
import { resolveTheoreticalShift } from "@/utils/theoretical-shift"

export const dynamic = "force-dynamic"

export default async function PianificazionePage({ params, searchParams }: { params: Promise<{ tenantSlug: string }>, searchParams: Promise<{ month?: string; year?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { tenantSlug } = await params
  const rawTenantId = session.user.tenantId
  const tenantId = rawTenantId || null
  const tf = tenantId ? { tenantId } : { tenantId: null }

  const monthStr = (await searchParams).month
  const yearStr = (await searchParams).year

  const now = new Date()
  const currentYear = yearStr ? parseInt(yearStr, 10) : now.getFullYear()
  const currentMonth = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1

  const [users, shifts, pubRec, settings, rotationGroups, categories, tenant] = await Promise.all([
    prisma.user.findMany({
      where: { role: "AGENTE", ...tf },
      orderBy: { name: "asc" },
      select: { 
        id: true, name: true, matricola: true, isUfficiale: true, isActive: true,
        email: true, phone: true, qualifica: true, gradoLivello: true, 
        squadra: true, massimale: true, defaultServiceCategoryId: true, 
        defaultServiceTypeId: true, rotationGroupId: true,
        dataAssunzione: true, scadenzaPatente: true, scadenzaPortoArmi: true, noteInterne: true,
        dataDiNascita: true, tipoContratto: true, defaultPartnerIds: true, fixedServiceDays: true,
        canConfigureSystem: true, canManageShifts: true, canManageUsers: true, canVerifyClockIns: true,
        twoFactorEnabled: true, hasL104: true, l104Assistiti: true, hasStudyLeave: true, hasParentalLeave: true, hasChildSicknessLeave: true
      }
    }),
    prisma.shift.findMany({
      where: {
        ...tf,
        date: {
          gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
          lt: new Date(Date.UTC(currentYear, currentMonth, 2)),
        },
      },
    }),
    prisma.monthStatus.findUnique({
      where: { 
        month_year_tenantId: { 
          month: currentMonth, 
          year: currentYear, 
          tenantId: tenantId || "" 
        } 
      },
    }),
    prisma.globalSettings.findFirst({ where: tf }),
    prisma.rotationGroup.findMany({ where: tf, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ where: tf, include: { types: true }, orderBy: { orderIndex: "asc" } }),
    prisma.tenant.findUnique({ where: { id: tenantId || "" } })
  ])

  // === INIEZIONE TURNI TEORICI PER IL 1° DEL MESE SUCCESSIVO ===
  const nextMonthFirst = new Date(Date.UTC(currentYear, currentMonth, 1))
  const augmentedShifts = [...shifts]
  
  users.forEach(user => {
    const hasNextDay = shifts.some(s => s.userId === user.id && new Date(s.date).getTime() === nextMonthFirst.getTime())
    if (!hasNextDay) {
      const theoretical = resolveTheoreticalShift({
        user: { ...user, rotationGroup: rotationGroups.find(g => g.id === user.rotationGroupId) },
        date: nextMonthFirst
      })
      if (theoretical) {
        augmentedShifts.push({
          id: `theoretical-${user.id}`,
          userId: user.id,
          date: nextMonthFirst,
          type: theoretical,
          isTheoretical: true
        } as any)
      }
    }
  })

  const isPublished = pubRec ? pubRec.isPublished : false
  const isLocked = pubRec ? pubRec.isLocked : false

  return (
    <div className="p-2 sm:p-4 lg:p-6 relative z-10 h-full">
      <AdminDashboard
        allAgents={users as any}
        shifts={augmentedShifts as any}
        currentYear={currentYear}
        currentMonth={currentMonth}
        isPublished={isPublished}
        isLocked={isLocked}
        settings={settings as any}
        rotationGroups={rotationGroups}
        categories={categories}
        tenantSlug={tenantSlug}
        currentUser={session.user}
        logoUrl={tenant?.logoUrl}
      />
    </div>
  )
}
