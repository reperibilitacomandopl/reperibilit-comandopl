"use client"

import { useState, useEffect } from "react"
import {
  Users,
  Shield,
  AlertTriangle,
  CalendarDays,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { isAssenza } from "@/utils/shift-logic"

interface PannelloOverviewProps {
  totalAgents: number
  todayShifts: { userId: string; type: string; repType: string | null; user: { name: string; isUfficiale: boolean } }[]
  isPublished: boolean
  currentMonth: number
  currentYear: number
  settings: { massimaleAgente: number; massimaleUfficiale: number } | null
}

const MESI = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

export default function PannelloOverview({ totalAgents, todayShifts, isPublished, currentMonth, currentYear, settings }: PannelloOverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000) // aggiorna ogni 30 sec
    return () => clearInterval(timer)
  }, [])

  // Calcola statistiche giornaliere
  const assentiOggi = todayShifts.filter(s => isAssenza(s.type)).length
  const operativiOggi = totalAgents - assentiOggi
  const mattina = todayShifts.filter(s => s.type.startsWith("M")).length
  const pomeriggio = todayShifts.filter(s => s.type.startsWith("P")).length
  const repOggi = todayShifts.filter(s => s.repType?.toLowerCase().includes("rep")).length
  const ufficialiOggi = todayShifts.filter(s => s.user.isUfficiale && !isAssenza(s.type)).length

  const cards = [
    {
      label: "Organico Totale",
      value: totalAgents,
      icon: Users,
      color: "from-slate-600 to-slate-700",
      textColor: "text-slate-100",
      sub: `${ufficialiOggi} ufficiali in servizio`,
    },
    {
      label: "Operativi Oggi",
      value: operativiOggi,
      icon: Activity,
      color: "from-emerald-500 to-emerald-700",
      textColor: "text-emerald-50",
      sub: `${mattina} mattina • ${pomeriggio} pomerig.`,
    },
    {
      label: "Assenti Oggi",
      value: assentiOggi,
      icon: AlertTriangle,
      color: assentiOggi > 3 ? "from-rose-500 to-rose-700" : "from-amber-500 to-amber-600",
      textColor: assentiOggi > 3 ? "text-rose-50" : "text-amber-50",
      sub: assentiOggi === 0 ? "Nessuna assenza registrata" : "Ferie, malattie, permessi",
    },
    {
      label: "Reperibili Oggi",
      value: repOggi,
      icon: Shield,
      color: "from-violet-500 to-violet-700",
      textColor: "text-violet-50",
      sub: `Target: ${settings?.massimaleAgente ?? 5} agenti`,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pannello Comando</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {currentTime.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" — "}
            <span className="text-slate-400">{currentTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {isPublished ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {MESI[currentMonth]} {currentYear} — {isPublished ? "Pubblicato" : "Bozza"}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:shadow-xl transition-shadow duration-300`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-125 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-widest ${card.textColor} opacity-80`}>
                    {card.label}
                  </span>
                  <Icon size={20} className={`${card.textColor} opacity-60`} />
                </div>
                <p className={`text-4xl font-black ${card.textColor} tracking-tight`}>{card.value}</p>
                <p className={`text-[11px] mt-2 ${card.textColor} opacity-70 font-medium`}>{card.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" />
          Accesso Rapido
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Pianificazione OdS", desc: "Griglia Turni & Reperibilità", href: "/admin/pianificazione", icon: CalendarDays, accent: "blue" },
            { label: "Sala Operativa", desc: "Assegnazione Giornaliera", href: "/admin/operativa", icon: Shield, accent: "emerald" },
            { label: "Auto-Compilazione", desc: "Genera Turni del Mese", href: "/admin/auto-compila", icon: Clock, accent: "violet" },
          ].map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-${action.accent}-300 hover:shadow-md transition-all duration-200`}
              >
                <div className={`w-11 h-11 bg-${action.accent}-50 rounded-xl flex items-center justify-center group-hover:bg-${action.accent}-100 transition-colors shrink-0`}>
                  <Icon size={20} className={`text-${action.accent}-500`} />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">{action.label}</span>
                  <span className="text-xs text-slate-400 font-medium">{action.desc}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Today Detail */}
      {todayShifts.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            Dettaglio Turni di Oggi
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Agente</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Turno</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Reperibilità</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayShifts.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-800 flex items-center gap-2">
                        {s.user.isUfficiale && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-black">UFF</span>}
                        {s.user.name}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${s.type.startsWith("M") ? "bg-blue-100 text-blue-700" : s.type.startsWith("P") ? "bg-indigo-100 text-indigo-700" : isAssenza(s.type) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {s.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {s.repType ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-black bg-violet-100 text-violet-700">{s.repType}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isAssenza(s.type) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500"><XCircle size={12}/> Assente</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500"><CheckCircle2 size={12}/> Operativo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
