"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "lucide-react"

type NavSection = {
  title: string
  accent: string
  items: { label: string; href: string; icon: any; description: string }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operatività",
    accent: "text-blue-400",
    items: [
      { label: "Pannello Comando", href: "/admin/pannello", icon: LayoutDashboard, description: "Overview e KPI" },
      { label: "Pianificazione Mensile", href: "/admin/pianificazione", icon: CalendarDays, description: "Griglia Turni & Reperibilità" },
      { label: "Richieste Agenti", href: "/admin/richieste", icon: FileText, description: "Inbox Ferie e Permessi" },
      { label: "Ordine di Servizio", href: "/admin/ods", icon: FileText, description: "Assegnazione Giornaliera" },
      { label: "Stampa OdS", href: "/admin/stampa-ods", icon: Printer, description: "Anteprima e Stampa PDF" },
    ],
  },
  {
    title: "Setup & Risorse",
    accent: "text-emerald-400",
    items: [
      { label: "Ufficio Comando", href: "/admin/risorse", icon: Users, description: "Agenti, Squadre e Logistica" },
      { label: "Sezioni & Servizi", href: "/admin/sezioni", icon: Users, description: "Servizi OdS di Default" },
      { label: "Generatore Ciclico", href: "/admin/auto-compila", icon: Wand2, description: "Auto-Compilazione Turni" },
    ],
  },
  {
    title: "Sistema",
    accent: "text-amber-400",
    items: [
      { label: "Impostazioni", href: "/admin/impostazioni", icon: Settings, description: "Config, Audit & Export" },
    ],
  },
]

interface AdminSidebarProps {
  userName: string
  userMatricola: string
  signOutAction: () => Promise<void>
}

export default function AdminSidebar({ userName, userMatricola, signOutAction }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
          collapsed ? "w-[72px]" : "w-[260px]"
        } h-screen flex flex-col bg-[#0b1120] border-r border-slate-800/60 transition-all duration-300 ease-in-out shrink-0 relative z-[70] 
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        fixed lg:sticky top-0 left-0`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-[-50px] p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl"
        >
          <X size={20} />
        </button>
      {/* Header / Brand */}
      <div className="px-4 py-5 border-b border-slate-800/60 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/20 shrink-0">
          PL
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-black text-white tracking-wide leading-tight truncate">
              Polizia Locale
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase leading-tight">
              Altamura
            </p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-5 overflow-y-auto custom-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${section.accent}`}>
                {section.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                    )}
                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors ${
                        isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    {!collapsed && (
                      <div className="overflow-hidden">
                        <span className={`text-[13px] font-bold block truncate ${isActive ? "text-blue-300" : ""}`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-600 font-medium block truncate">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-2 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors flex items-center justify-center"
        title={collapsed ? "Espandi menu" : "Comprimi menu"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* User Footer */}
      <div className="border-t border-slate-800/60 px-3 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center text-white text-[11px] font-black shrink-0 shadow-inner">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-slate-300 truncate">
                {userName}
              </p>
              <p className="text-[10px] text-slate-600 font-medium">
                Matr. {userMatricola} • ADMIN
              </p>
            </div>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Esci"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Preview Agente Link */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <Link
            href="/?view=agent"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-all"
          >
            <Shield size={12} />
            Preview Agente
          </Link>
        </div>
      )}
      </aside>
    </>
  )
}
