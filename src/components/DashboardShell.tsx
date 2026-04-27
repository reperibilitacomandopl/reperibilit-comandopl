"use client"

import React, { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogOut, ClipboardList, RefreshCw, Smartphone } from "lucide-react"
import NotificationHub from "@/components/NotificationHub"
import DynamicAgentDashboard from "@/components/DynamicAgentDashboard"
import AdminDashboard from "@/components/AdminDashboard"
import MobileNavBar from "./agent/MobileNavBar"
import PlanningMobileView from "@/components/PlanningMobileView"
import AgentRequestForm from "./agent/AgentRequestForm"
import AgentSwapBoard from "./agent/AgentSwapBoard"
import FloatingSosButton from "./agent/FloatingSosButton"

export default function DashboardShell({ 
  session, 
  allAgents, 
  shifts, 
  myShifts,
  agendaEntries,
  currentMonth, 
  currentYear, 
  isPublished, 
  settings, 
  tenantSlug,
  rotationGroups,
  categories,
  dayInfo,
  adminData,
  logoUrl
}: any) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { role, name, matricola, canManageShifts, canManageUsers, canVerifyClockIns, canConfigureSystem } = session.user
  const containerClass = "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

  // Calculate Navigation Params
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col ${role !== 'ADMIN' ? 'pb-24 lg:pb-0' : ''}`}>
      {/* Navbar with Glass Effect */}
      <header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-slate-200 z-[100] h-16 flex items-center">
        <div className={`${containerClass} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 tech-gradient rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-900/20 shrink-0">
              PL
            </div>
            <div className="flex flex-col">
              <h1 className="text-[10px] sm:text-xs font-black text-slate-900 leading-tight uppercase tracking-widest">
                Polizia Locale
              </h1>
              <p className="text-[9px] sm:text-[10px] text-blue-600 font-extrabold leading-tight uppercase tracking-[0.2em]">
                {session.user.tenantName || "Altamura"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block mr-2">
              <p className="text-sm font-black text-slate-800 tracking-tight">{name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Matr. {matricola} • {role}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-6">
              {(role === 'ADMIN' || canManageShifts) && (
                <Link 
                  href={`/${tenantSlug || 'admin'}/admin/pannello`}
                  className="hidden sm:flex items-center gap-2 p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-blue-100"
                >
                  <ClipboardList size={18} />
                  Amministrazione
                </Link>
              )}
              <NotificationHub userRole={role} />
              <button 
                onClick={() => signOut()} 
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                title="Esci"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-20">
        <div className={containerClass}>
          {role === "ADMIN" ? (
            <AdminDashboard 
              allAgents={allAgents} 
              shifts={shifts} 
              currentMonth={currentMonth} 
              currentYear={currentYear}
              isPublished={isPublished}
              settings={settings}
              tenantSlug={tenantSlug}
              rotationGroups={rotationGroups}
              categories={categories}
              currentUser={session.user}
              logoUrl={logoUrl}
            />
          ) : (
            <div className="space-y-6">
              {/* Desktop Always shows the Full Dashboard */}
              <div className={`lg:block ${activeTab === 'dashboard' ? 'block' : 'hidden'}`}>
                <DynamicAgentDashboard 
                  currentUser={session.user} 
                  shifts={shifts}
                  myShifts={myShifts}
                  allAgents={allAgents}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                  isPublished={isPublished}
                  tenantSlug={tenantSlug}
                  agendaEntries={agendaEntries}
                  userRole={role}
                  canManageShifts={canManageShifts}
                  canManageUsers={canManageUsers}
                  canVerifyClockIns={canVerifyClockIns}
                  canConfigureSystem={canConfigureSystem}
                  logoUrl={logoUrl}
                />
              </div>

              {/* Mobile Only Tabs */}
              <div className="lg:hidden">
                {activeTab === 'planning' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <PlanningMobileView 
                      agents={(role === 'ADMIN' || canManageShifts) ? allAgents : allAgents.filter((a: any) => a.id === session.user.id)}
                      shifts={shifts}
                      dayInfo={dayInfo}
                      currentYear={currentYear}
                      currentMonth={currentMonth}
                      prevMonth={prevMonth}
                      prevYear={prevYear}
                      nextMonth={nextMonth}
                      nextYear={nextYear}
                      tenantSlug={tenantSlug}
                      isAdmin={false}
                      userRole={role}
                    />
                  </div>
                )}

                {activeTab === 'requests' && (
                  <div className="bg-white rounded-[2.5rem] p-4 border border-slate-200 shadow-xl overflow-hidden min-h-[550px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="tech-gradient -m-4 p-8 mb-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      <ClipboardList className="text-cyan-400 mb-4" size={40} />
                      <h3 className="text-2xl font-black text-white mb-1">Richieste Istanze</h3>
                      <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">Ferie, Congedi e Permessi</p>
                    </div>
                    <div className="px-1">
                      <AgentRequestForm balances={null} onClose={() => setActiveTab('dashboard')} />
                    </div>
                  </div>
                )}

                {activeTab === 'swaps' && (
                  <div className="bg-white rounded-[2.5rem] p-4 border border-slate-200 shadow-xl overflow-hidden min-h-[550px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-indigo-900 -m-4 p-8 mb-8 relative overflow-hidden text-left">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                      <RefreshCw className="text-indigo-400 mb-4" size={40} />
                      <h3 className="text-2xl font-black text-white mb-1">Scambio Turni</h3>
                      <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">Reperibilità e Servizio</p>
                    </div>
                    <AgentSwapBoard 
                      swapRequests={[]} 
                      currentUserId={session.user.id} 
                      handleRespondSwap={async () => {}} 
                      swapLoading={false} 
                    />
                    <div className="mt-10 p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                       <Smartphone className="mx-auto text-slate-300 mb-4" size={32} />
                       <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                         Seleziona una data dal tuo calendario<br />per proporre un nuovo scambio
                       </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer (Desktop) */}
      <footer className="hidden lg:block py-12 bg-white border-t border-slate-100 mt-20">
        <div className={containerClass}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 tech-gradient rounded-xl"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sentinel Command Suite &copy; 2026</p>
            </div>
            <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Supporto</a>
              <a href="#" className="hover:text-blue-600 transition-colors">{session.user.tenantName || 'Comando'}</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating SOS Button — always accessible for non-admin users */}
      {role !== "ADMIN" && <FloatingSosButton />}

      {/* Mobile Bottom Navigation */}
      {role !== "ADMIN" && (
        <MobileNavBar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onSOS={() => setActiveTab('planning')} 
        />
      )}
    </div>
  )
}
