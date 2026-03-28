import { auth, signOut } from "@/auth"
import AdminDashboard from "@/components/AdminDashboard"
import { LogOut } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import DynamicAgentDashboard from "@/components/DynamicAgentDashboard"

import { prisma } from "@/lib/prisma"

export default async function Home({ searchParams }: { searchParams: { view?: string, month?: string, year?: string } }) {
  const session = await auth()
  
  if (!session?.user) redirect('/login')
  if (session.user.forcePasswordChange) redirect('/change-password')

  const { role, name, matricola } = session.user
  const view = (await searchParams).view
  const monthStr = (await searchParams).month
  const yearStr = (await searchParams).year

  // Default to current month/year if not specified
  const now = new Date()
  const currentYear = yearStr ? parseInt(yearStr, 10) : now.getFullYear()
  const currentMonth = monthStr ? parseInt(monthStr, 10) : (now.getMonth() + 1) // 1-12


  const users = await prisma.user.findMany({
    where: { role: "AGENTE" },
    orderBy: { name: 'asc' },
  })

  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
        lt: new Date(Date.UTC(currentYear, currentMonth, 1)),
      }
    }
  })

  // Verify Publish status
  const pubRec = await prisma.monthStatus.findUnique({
    where: { month_year: { month: currentMonth - 1, year: currentYear } }
  })
  const isPublished = pubRec ? pubRec.isPublished : false

  const isAdminView = role === "ADMIN" && view !== 'agent'
  const containerClass = isAdminView ? "w-full max-w-full px-4 sm:px-6 lg:px-8" : "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

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
              <h1 className="text-sm font-bold text-slate-800 leading-tight">Polizia Locale di Altamura</h1>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">Gestione Reperibilità</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {role === "ADMIN" && (
               <div className="bg-slate-100 p-1 rounded-lg flex items-center border border-slate-200">
                  <span className="text-[10px] font-black uppercase px-2 text-slate-400">Preview</span>
                  <Link href="/?view=agent" className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${view === 'agent' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Agente</Link>
                  <Link href="/" className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!view ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>Admin</Link>
               </div>
            )}

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

      {/* Main Content Area */}
      <main className={`flex-1 ${containerClass} py-4 sm:py-6 lg:py-8`}>
        {isAdminView ? (
          <AdminDashboard allAgents={users as any} shifts={shifts} currentYear={currentYear} currentMonth={currentMonth} isPublished={isPublished} />
        ) : (
          <DynamicAgentDashboard currentUser={{ id: session?.user?.id || "", matricola: matricola || "", name: name || "" }} shifts={shifts} allAgents={users as any} currentYear={currentYear} currentMonth={currentMonth} isPublished={isPublished} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Comando di Polizia Locale di Altamura
          </p>
          <p className="text-[10px] text-slate-300 font-medium">
            Sistema Reperibilità v1.0
          </p>
        </div>
      </footer>
    </div>
  )
}
