"use client"

import React from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { LogOut, ClipboardList } from "lucide-react"
import NotificationHub from "@/components/NotificationHub"
import DynamicAgentDashboard from "@/components/DynamicAgentDashboard"
import AdminDashboard from "@/components/AdminDashboard"
import MobileAgentShell from "./agent/MobileAgentShell"
import { useAgentData } from "@/hooks/useAgentData"

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

interface DashboardShellProps {
  session: any
  allAgents: any[]
  shifts: any[]
  myShifts: any[]
  agendaEntries: any[]
  currentMonth: number
  currentYear: number
  isPublished: boolean
  settings: any
  tenantSlug: string
  rotationGroups?: any[]
  categories?: any[]
  dayInfo: any
  adminData?: any
  logoUrl?: string | null
  tenant?: any
  certifiedDates?: string[]
  calendarToken?: string
}

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
  logoUrl,
  tenant,
  certifiedDates,
  calendarToken,
  initialView: _initialView
}: DashboardShellProps & { initialView?: string }) {
  const { role, name, matricola, canManageShifts, canManageUsers, canVerifyClockIns, canConfigureSystem } = session.user

  const agentData = useAgentData({
    currentUser: session.user,
    currentYear,
    currentMonth,
    shifts,
    tenant
  })
  const containerClass = "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"

  return (
    <div className={`min-h-screen bg-[#F8FAFC] flex flex-col ${role !== 'ADMIN' ? 'pb-24 lg:pb-0' : ''}`} suppressHydrationWarning>
      {/* Navbar with Glass Effect */}
      <header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-slate-200 z-[100] h-16 flex items-center">
        <div className={`${containerClass} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center p-1 shadow-md border border-slate-100 shrink-0">
                <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="w-11 h-11 tech-gradient rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-900/20 shrink-0">
                PL
              </div>
            )}
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
                onClick={() => { try { sessionStorage.clear() } catch(_) {}; signOut({ callbackUrl: '/login' }) }}
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
          {(role === "ADMIN" || canManageShifts || canManageUsers || canVerifyClockIns || canConfigureSystem) ? (
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
              {/* Desktop Dashboard always visible on lg, hidden on mobile */}
              <div className="hidden lg:block">
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
                    tenant={tenant}
                    certifiedDates={certifiedDates}
                    agentData={agentData}
                    calendarToken={calendarToken}
                  />
              </div>

              <MobileAgentShell
                session={session}
                allAgents={allAgents}
                shifts={shifts}
                myShifts={myShifts}
                currentMonth={currentMonth}
                currentYear={currentYear}
                dayInfo={dayInfo}
                tenantSlug={tenantSlug || ""}
                tenant={tenant}
                certifiedDates={certifiedDates}
              />
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

    </div>
  )
}
