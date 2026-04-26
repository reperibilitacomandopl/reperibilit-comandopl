import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardShell from "@/components/DashboardShell"
import { isHoliday } from "@/utils/holidays"

export default async function Home({ 
  params,
  searchParams 
}: { 
  params: Promise<{ tenantSlug: string }>, 
  searchParams: Promise<{ view?: string, month?: string, year?: string }> 
}) {
  const session = await auth()
  
  if (!session?.user) redirect('/login')
  if (session.user.forcePasswordChange) redirect('/change-password')

  const { role, tenantSlug: userSlug, tenantId } = session.user
  const urlSlug = (await params).tenantSlug
  const view = (await searchParams).view
  const monthStr = (await searchParams).month
  const yearStr = (await searchParams).year

  // Verifica COERENZA SLUG
  if (urlSlug !== userSlug && !session.user.isSuperAdmin) {
    redirect(`/${userSlug}`)
  }

  // Admin users: redirect to sidebar pannello (unless previewing agent view)
  if (role === "ADMIN" && view !== "agent") {
    redirect(`/${userSlug}/admin/pannello`)
  }

  const now = new Date()
  const currentYear = yearStr ? parseInt(yearStr, 10) : now.getFullYear()
  const currentMonth = monthStr ? parseInt(monthStr, 10) : (now.getMonth() + 1)

  // Data Fetching
  const users = await prisma.user.findMany({
    where: { role: "AGENTE", ...(tenantId ? { tenantId } : {}) },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, matricola: true, isUfficiale: true, telegramChatId: true }
  })

  const shifts = await prisma.shift.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      date: {
        gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
        lt: new Date(Date.UTC(currentYear, currentMonth, 2)),
      }
    },
    include: { 
      user: { select: { name: true } },
      vehicle: { select: { name: true } },
      radio: { select: { name: true } }
    }
  })

  const myShifts = shifts.filter(s => s.userId === session.user.id)

  const agendaEntries = await prisma.agendaEntry.findMany({
    where: { 
      userId: session.user.id,
      date: {
        gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
        lt: new Date(Date.UTC(currentYear, currentMonth, 2)),
      }
    }
  })

  // @ts-ignore
  const pubRec = await prisma.monthStatus.findUnique({
    where: { month_year_tenantId: { month: currentMonth, year: currentYear, tenantId: tenantId || "" } }
  })
  const isPublished = pubRec ? pubRec.isPublished : false

  const settings = await prisma.globalSettings.findUnique({
    where: { tenantId: tenantId || "" }
  })

  // Prepare dayInfo for the shell
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
  const dayInfo = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const date = new Date(currentYear, currentMonth - 1, d)
    return { day: d, name: dayNames[date.getDay()], isWeekend: isHoliday(date), isNextMonth: false }
  })

  return (
    <DashboardShell 
      session={session}
      allAgents={users}
      shifts={shifts}
      myShifts={myShifts}
      agendaEntries={agendaEntries}
      currentMonth={currentMonth}
      currentYear={currentYear}
      isPublished={isPublished}
      settings={settings}
      tenantSlug={urlSlug}
      dayInfo={dayInfo}
    />
  )
}
