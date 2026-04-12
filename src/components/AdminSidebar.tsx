"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import NotificationHub from "./NotificationHub"
import {
  LayoutDashboard,
  CalendarDays,
  Shield,
  Users,
  Wand2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  Menu,
  X,
  Car,
  ArrowLeftRight,
  Clock,
  Key,
  GraduationCap,
  BarChart3,
  Server
} from "lucide-react"

type NavSection = {
  title: string
  accent: string
  items: { label: string; href: string; icon: any; description: string }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Centro Operativo",
    accent: "text-blue-400",
    items: [
      { label: "Overview & KPI", href: "/admin/pannello", icon: LayoutDashboard, description: "Pannello di controllo globale" },
      { label: "Pianificazione Mensile", href: "/admin/pianificazione", icon: CalendarDays, description: "Griglia Turni e Reperibilità" },
      { label: "Ordine di Servizio", href: "/admin/ods", icon: FileText, description: "Gestione Assegnazioni Giornaliere" },
      { label: "Stampa O.d.S.", href: "/admin/stampa-ods", icon: Printer, description: "Anteprima e Stampa PDF" },
      { label: "Generatore Ciclico", href: "/admin/auto-compila", icon: Wand2, description: "Auto-Compilazione Turni" },
      { label: "Bacheca Scambi", href: "/admin/bacheca-scambi", icon: ArrowLeftRight, description: "Marketplace cessione turni" },
    ],
  },
  {
    title: "Risorse Umane",
    accent: "text-emerald-400",
    items: [
      { label: "Anagrafica & Squadre", href: "/admin/risorse", icon: Users, description: "Gestione Agenti e Composizione Ufficio" },
      { label: "Gestione Permessi", href: "/admin/risorse?tab=permessi", icon: Key, description: "Delega poteri e funzioni" },
      { label: "Richieste Agenti", href: "/admin/richieste", icon: FileText, description: "Inbox Ferie e Permessi" },
      { label: "Timbrature GPS", href: "/admin/timbrature", icon: Clock, description: "Registro Ingressi e Uscite" },
    ],
  },
  {
    title: "Logistica & Mezzi",
    accent: "text-amber-400",
    items: [
      { label: "Setup Caserma", href: "/admin/sezioni", icon: Shield, description: "Configurazione Sezioni e Servizi" },
      { label: "Anagrafica Scuole", href: "/admin/impostazioni?tab=schools", icon: GraduationCap, description: "Gestione plessi e orari scolastici" },
      { label: "Parco Auto", href: "/admin/parco-auto", icon: Car, description: "Gestione Veicoli e Scadenze" },
    ],
  },
  {
    title: "Amministrazione",
    accent: "text-purple-400",
    items: [
      { label: "Configurazione & Audit", href: "/admin/impostazioni", icon: Settings, description: "Saldi Ore, Impostazioni, Log di Sistema" },
      { label: "Gestione Straordinari", href: "/admin/straordinari", icon: Clock, description: "Budget mensili ed elettorali" },
      { label: "Report Mensile", href: "/admin/report", icon: BarChart3, description: "Riepilogo Ore, Assenze, Straordinari" },
      { label: "Export Ragioneria", href: "/admin/export-paghe", icon: FileText, description: "Report Excel Indennità e Paghe" },
      { label: "API REST & Integrazioni", href: "/admin/api", icon: Server, description: "Documentazione Endpoint" },
    ],
  },
]

interface AdminSidebarProps {
  userName: string
  userMatricola: string
  tenantName?: string | null
  tenantSlug?: string | null
  isSuperAdmin?: boolean
  currentTenantId?: string | null
  signOutAction: () => Promise<void>
  // New permissions
  canManageShifts?: boolean
  canManageUsers?: boolean
  canVerifyClockIns?: boolean
  canConfigureSystem?: boolean
  userRole?: string
}

export default function AdminSidebar({ 
  userName, 
  userMatricola, 
  tenantName, 
  tenantSlug,
  isSuperAdmin, 
  currentTenantId, 
  signOutAction,
  canManageShifts,
  canManageUsers,
  canVerifyClockIns,
  canConfigureSystem,
  userRole
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isEnding, setIsEnding] = useState(false)

  const isImpersonating = isSuperAdmin && !!currentTenantId

  const handleEndImpersonation = async () => {
    setIsEnding(true)
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: null })
      })
      if (!res.ok) throw new Error("Errore")
      window.location.href = "/superadmin"
    } catch {
      alert("Errore durante il ripristino sessione")
    } finally {
      setIsEnding(false)
    }
  }

  return (
    <>
      {/* Mobile Burger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-slate-900 border border-slate-800 text-blue-400 rounded-2xl shadow-2xl"
        title="Apri menu"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`${
          collapsed ? "w-[80px]" : "w-[300px]"
        } h-screen flex flex-col bg-[#050914] border-r border-white/5 transition-all duration-500 ease-in-out shrink-0 relative z-[70] 
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:sticky top-0 left-0`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-[-50px] p-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl shadow-2xl"
        >
          <X size={24} />
        </button>

      {/* Brand Header Premium */}
      <div className="px-8 py-10 border-b border-white/5 flex items-center gap-4 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none"></div>
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/20 shrink-0 ring-1 ring-white/20 relative z-10 transition-transform hover:scale-110">
          PL
        </div>
        {!collapsed && (
          <div className="overflow-hidden font-sans relative z-10">
            <h1 className="text-lg font-black text-white tracking-tighter leading-tight truncate uppercase">
              {isImpersonating ? "Support" : "Sentinel"} <span className="text-blue-500">Premium</span>
            </h1>
            <p className={`text-[8px] font-black tracking-[0.3em] uppercase leading-tight mt-1 ${isImpersonating ? "text-indigo-400 animate-pulse" : "text-white/20"}`}>
              {isImpersonating ? "Sessione Attiva" : "Command Console"}
            </p>
          </div>
        )}
      </div>

      {/* Super-Admin Back Button Premium */}
      {isImpersonating && !collapsed && (
        <div className="p-6">
          <button 
            disabled={isEnding}
            onClick={handleEndImpersonation}
            className="group w-full flex items-center justify-center gap-3 py-4 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-indigo-500/20 shadow-lg shadow-indigo-950/20"
          >
            <Shield size={14} className="group-hover:animate-bounce" />
            {isEnding ? "Ripristino..." : "Reset Sessione"}
          </button>
        </div>
      )}

      {/* Navigation Items Premium */}
      <nav className="flex-1 py-10 px-4 space-y-10 overflow-y-auto custom-scrollbar-dark pb-32">
        {NAV_SECTIONS.map((section) => {
          const filteredItems = section.items.filter(item => {
            if (userRole === "ADMIN") return true;
            if (section.title === "Centro Operativo") return canManageShifts;
            if (section.title === "Risorse Umane") {
              if (item.label === "Timbrature GPS") return canVerifyClockIns;
              return canManageUsers;
            }
            if (section.title === "Logistica & Mezzi") return canConfigureSystem;
            if (section.title === "Amministrazione") return canConfigureSystem;
            if (item.label === "Overview & KPI") return true;
            return false;
          });

          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title} className="animate-in fade-in duration-700">
              {!collapsed && (
                <h3 className={`text-[9px] font-black uppercase tracking-[0.4em] px-4 mb-6 opacity-30 ${section.accent}`}>
                  {section.title}
                </h3>
              )}
              <div className="space-y-1.5">
                {filteredItems.map((item) => {
                  const itemHref = `/${tenantSlug}/admin${item.href.replace("/admin", "")}`
                  const isActive = pathname === itemHref || pathname?.startsWith(itemHref + "/")
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={itemHref}
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center gap-5 px-5 py-4 rounded-2xl transition-all duration-500 relative overflow-hidden ${
                        isActive
                          ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40"
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute right-[-2.5rem] top-[-2.5rem] w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                      )}
                      
                      <Icon
                        size={20}
                        className={`shrink-0 transition-transform duration-500 group-hover:scale-110 ${
                          isActive ? "text-white" : "text-white/20 group-hover:text-blue-400"
                        }`}
                      />
                      
                      {!collapsed && (
                        <div className="overflow-hidden flex-1 relative z-10">
                          <span className={`text-[12px] font-black block truncate tracking-tight uppercase ${isActive ? "text-white" : "group-hover:text-white"}`}>
                            {item.label}
                          </span>
                          <span className={`text-[9px] font-bold block truncate tracking-wide mt-0.5 ${isActive ? "text-white/60" : "text-white/10 group-hover:text-white/30"}`}>
                            {item.description}
                          </span>
                        </div>
                      )}
                      
                      {isActive && !collapsed && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Fixed Footer Premium */}
      <div className="absolute bottom-0 left-0 w-full bg-[#050914] border-t border-white/5 p-6 space-y-4">
        
        {/* User Card */}
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 group hover:bg-white/10 transition-colors">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl flex items-center justify-center text-white text-[12px] font-black shrink-0 shadow-lg shadow-blue-500/20">
            {userName.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">
                {userName}
              </p>
              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-0.5">
                Admin Console
              </p>
            </div>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-rose-600 text-white/40 hover:text-white rounded-xl transition-all"
              title="Disconnetti Sessione"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>

        {!collapsed && (
          <div className="grid grid-cols-2 gap-3">
             <Link
                href={`/${tenantSlug}?view=agent`}
                className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[9px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-all"
              >
                <Shield size={12} /> Preview
              </Link>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[9px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-all"
              >
                <ChevronLeft size={14} /> Close
              </button>
          </div>
        )}

        {collapsed && (
           <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full py-4 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/20 hover:text-white transition-all"
            >
              <ChevronRight size={16} />
           </button>
        )}
      </div>
      </aside>
    </>
  )
}
