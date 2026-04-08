import { auth, signOut } from "@/auth"
import { LogOut } from "lucide-react"
import { redirect } from "next/navigation"
import DynamicAgentDashboard from "@/components/DynamicAgentDashboard"
import { prisma } from "@/lib/prisma"

export default async function Home({ 
  params,
  searchParams 
}: { 
  params: { tenantSlug: string }, 
  searchParams: { view?: string, month?: string, year?: string } 
}) {
  const session = await auth()
  
  if (!session?.user) redirect('/login')
  if (session.user.forcePasswordChange) redirect('/change-password')

  const { role, name, matricola, tenantSlug: userSlug } = session.user
  const urlSlug = (await params).tenantSlug
  const view = (await searchParams).view
  const monthStr = (await searchParams).month
  const yearStr = (await searchParams).year

  // Verifica COERENZA SLUG: Se l'utente prova ad accedere a un comando diverso dal suo
  if (urlSlug !== userSlug && !session.user.isSuperAdmin) {
    redirect(`/${userSlug}`)
  }

  // Admin users: redirect to the new sidebar layout (unless previewing agent view)
  if (role === "ADMIN" && view !== "agent") {
    redirect(`/${userSlug}/admin/pannello`)
  }

  // Default to current month/year if not specified
  const now = new Date()
  const currentYear = yearStr ? parseInt(yearStr, 10) : now.getFullYear()
  const currentMonth = monthStr ? parseInt(monthStr, 10) : (now.getMonth() + 1)

  const tenantId = session.user.tenantId

  const users = await prisma.user.findMany({
    where: { role: "AGENTE", ...(tenantId ? { tenantId } : {}) },
    orderBy: { name: 'asc' },
  })

  const shifts = await prisma.shift.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      date: {
        gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
        lt: new Date(Date.UTC(currentYear, currentMonth, 2)),
      }
    }
  })

// @ts-nocheck
  const pubRec = await prisma.monthStatus.findUnique({
    where: { month_year_tenantId: { month: currentMonth, year: currentYear, tenantId: tenantId || "" } }
  })
  const isPublished = pubRec ? pubRec.isPublished : false

  const containerClass = "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className={`${containerClass} h-16 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-900 rounded-md flex items-center justify-center text-white font-bold text-xs">
              PL
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-800 leading-tight">Polizia Locale {session.user.tenantName ? `di ${session.user.tenantName}` : "Nazionale"}</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">Gestione Reperibilità</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="text-xs text-slate-500">Matr. {matricola} • {role}</p>
            </div>
            <form action={async () => {
              "use server"
              await signOut()
            }}>
              <button 
                type="submit" 
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-full transition-colors"
                title="Esci"
              >
                <LogOut size={20} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Agent Dashboard */}
      <main className={`flex-1 ${containerClass} py-4 sm:py-6 lg:py-8`}>
        <DynamicAgentDashboard 
          currentUser={{ id: session?.user?.id || "", matricola: matricola || "", name: name || "" }} 
          shifts={shifts} 
          allAgents={users as any} 
          currentYear={currentYear} 
          currentMonth={currentMonth} 
          isPublished={isPublished} 
          currentView={view} 
          tenantName={session.user.tenantName}
          tenantSlug={urlSlug}
          canManageShifts={session.user.canManageShifts}
          canManageUsers={session.user.canManageUsers}
          canVerifyClockIns={session.user.canVerifyClockIns}
          canConfigureSystem={session.user.canConfigureSystem}
          userRole={session.user.role}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Comando di Polizia Locale {session.user.tenantName ? `di ${session.user.tenantName}` : ""}
          </p>
          <p className="text-[10px] text-slate-300 font-medium">
            Sistema Reperibilità v2.1
          </p>
        </div>
      </footer>
    </div>
  )
}
