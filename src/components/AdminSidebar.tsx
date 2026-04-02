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
  Radio,
} from "lucide-react"

const NAV_ITEMS = [
  {
    label: "Pannello Comando",
    href: "/admin/pannello",
    icon: LayoutDashboard,
    description: "Overview e KPI",
  },
  {
    label: "Pianificazione OdS",
    href: "/admin/pianificazione",
    icon: CalendarDays,
    description: "Griglia Turni & Reperibilità",
  },
  {
    label: "Sala Operativa",
    href: "/admin/operativa",
    icon: Radio,
    description: "Drag & Drop Giornaliero",
  },
  {
    label: "Ufficio Comando",
    href: "/admin/risorse",
    icon: Users,
    description: "Agenti, Squadre e Logistica",
  },
  {
    label: "Auto-Compilazione",
    href: "/admin/auto-compila",
    icon: Wand2,
    description: "Generatore Ciclico Turni",
  },
  {
    label: "Impostazioni",
    href: "/admin/impostazioni",
    icon: Settings,
    description: "Export, Audit & Config",
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

  return (
    <aside
      className={`${
        collapsed ? "w-[72px]" : "w-[260px]"
      } h-screen flex flex-col bg-[#0b1120] border-r border-slate-800/60 transition-all duration-300 ease-in-out shrink-0 relative z-30`}
    >
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
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/")
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
              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}

              <Icon
                size={20}
                className={`shrink-0 transition-colors ${
                  isActive
                    ? "text-blue-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }`}
              />

              {!collapsed && (
                <div className="overflow-hidden">
                  <span
                    className={`text-[13px] font-bold block truncate ${
                      isActive ? "text-blue-300" : ""
                    }`}
                  >
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
  )
}
