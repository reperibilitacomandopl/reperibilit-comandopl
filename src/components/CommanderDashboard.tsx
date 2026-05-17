"use client"

import { useState, useEffect } from "react"
import { Users, Shield, Target, Clock, AlertTriangle, FileText, TrendingUp, Calendar } from "lucide-react"

interface CommanderStats {
  organico: { total: number; officers: number }
  copertura: { rate: number; shifts: number; possible: number }
  interventi: { total: number; completed: number; avgDaily: string }
  assenze: { today: number; rate: number }
  richieste: { pending: number }
  scadenze: { documenti: number }
  straordinario: { ore: number }
}

const PERIODI = ["SUMMER", "WINTER"] as const
const LABEL_PERIODO: Record<string, string> = { SUMMER: "Estate", WINTER: "Inverno", EASTER: "Pasqua", CHRISTMAS: "Natale" }

const COLOR_MAP: Record<string, { icon: string; value: string; bg: string; border: string; glow: string }> = {
  blue: {
    icon: "text-blue-500 dark:text-blue-400",
    value: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/20",
    glow: "shadow-blue-500/5"
  },
  emerald: {
    icon: "text-emerald-500 dark:text-emerald-400",
    value: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/20",
    glow: "shadow-emerald-500/5"
  },
  amber: {
    icon: "text-amber-500 dark:text-amber-400",
    value: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/20",
    glow: "shadow-amber-500/5"
  },
  rose: {
    icon: "text-rose-500 dark:text-rose-400",
    value: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50/50 dark:bg-rose-950/20",
    border: "border-rose-100 dark:border-rose-900/20",
    glow: "shadow-rose-500/5"
  },
  indigo: {
    icon: "text-indigo-500 dark:text-indigo-400",
    value: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
    border: "border-indigo-100 dark:border-indigo-900/20",
    glow: "shadow-indigo-500/5"
  },
  purple: {
    icon: "text-purple-500 dark:text-purple-400",
    value: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50/50 dark:bg-purple-950/20",
    border: "border-purple-100 dark:border-purple-900/20",
    glow: "shadow-purple-500/5"
  },
  slate: {
    icon: "text-slate-500 dark:text-slate-400",
    value: "text-slate-700 dark:text-slate-200",
    bg: "bg-slate-50/50 dark:bg-slate-800/10",
    border: "border-slate-200 dark:border-slate-800",
    glow: "shadow-slate-500/5"
  },
  cyan: {
    icon: "text-cyan-500 dark:text-cyan-400",
    value: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50/50 dark:bg-cyan-950/20",
    border: "border-cyan-100 dark:border-cyan-900/20",
    glow: "shadow-cyan-500/5"
  }
}

export default function CommanderDashboard() {
  const [stats, setStats] = useState<CommanderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [vacations, setVacations] = useState<any>({})
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/commander-stats").then(r => r.json()),
      fetch(`/api/admin/vacations?year=${year}`).then(r => r.json())
    ]).then(([s, v]) => {
      if (s && !s.error) {
        setStats(s)
      } else {
        console.error("Error loading commander stats:", s?.error)
      }
      setVacations(v?.grouped || {})
      setLoading(false)
    }).catch(err => {
      console.error("Network error loading commander dashboard:", err)
      setLoading(false)
    })
  }, [year])

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-bold animate-pulse">
        Caricamento dashboard comandante...
      </div>
    )
  }

  const agentiInFerieg = (period: string) =>
    (vacations[period] || []).filter((p: any) => p.status === "ASSIGNED" || p.status === "CONFIRMED").length

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
          Dashboard Comandante
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Visione d'insieme del comando in tempo reale
        </p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} color="blue" label="Organico" value={stats?.organico?.total || 0} sub={`${stats?.organico?.officers || 0} ufficiali`} />
        <KpiCard icon={Target} color="emerald" label="Copertura" value={`${stats?.copertura?.rate || 0}%`} sub={`${stats?.copertura?.shifts || 0} turni mese`} />
        <KpiCard icon={AlertTriangle} color="amber" label="Assenteismo" value={`${stats?.assenze?.rate || 0}%`} sub={`${stats?.assenze?.today || 0} assenti oggi`} />
        <KpiCard icon={TrendingUp} color="rose" label="Straordinario" value={`${stats?.straordinario?.ore || 0}h`} sub="ore totali mese" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileText} color="indigo" label="Interventi 30gg" value={stats?.interventi?.total || 0} sub={`${stats?.interventi?.avgDaily || 0}/die - ${stats?.interventi?.completed || 0} chiusi`} />
        <KpiCard icon={Clock} color="purple" label="Richieste in attesa" value={stats?.richieste?.pending || 0} sub="da approvare" />
        <KpiCard icon={Shield} color="slate" label="Scadenze 30gg" value={stats?.scadenze?.documenti || 0} sub="documenti in scadenza" />
        <KpiCard icon={Calendar} color="cyan" label="Anno" value={year} sub="pianificazione ferie" />
      </div>

      {/* Pianificazione Ferie */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
            Pianificazione Ferie {year}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setYear(y => y - 1)}
              className="text-xs font-black px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setYear(y => y + 1)}
              className="text-xs font-black px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
            >
              →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERIODI.map(period => (
            <div key={period} className="bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
                <h4 className="font-black text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{LABEL_PERIODO[period]}</h4>
                <span className={`text-[10px] font-black px-2 py-1 rounded-xl ${agentiInFerieg(period) > 0 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                  {agentiInFerieg(period)} agenti pianificati
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar-dark pr-1">
                {(vacations[period] || []).slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 shadow-sm text-xs transition-colors hover:border-slate-200 dark:hover:border-slate-750">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.user?.name}</span>
                      {p.user?.squadra && <span className="text-slate-400 dark:text-slate-500 ml-1.5 font-medium">({p.user.squadra})</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                        {" → "}
                        {new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg tracking-widest ${p.status === "PREFERENCE" ? "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400" : p.status === "ASSIGNED" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                        {p.status === "PREFERENCE" ? "PREF" : p.status === "ASSIGNED" ? "ASSEGN" : "CONF"}
                      </span>
                    </div>
                  </div>
                ))}
                {(vacations[period] || []).length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">Nessuna pianificazione per questo periodo</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert rapidi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats && stats.assenze.today > 5 && (
          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-rose-800 dark:text-rose-350 uppercase tracking-wider">Alto tasso di assenze</p>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold leading-relaxed">{stats.assenze.today} assenti oggi — verificare copertura</p>
            </div>
          </div>
        )}
        {stats && stats.scadenze.documenti > 0 && (
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-5 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-800 dark:text-amber-350 uppercase tracking-wider">Scadenze Documentali</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-semibold leading-relaxed">{stats.scadenze.documenti} documenti in scadenza entro 30 giorni</p>
            </div>
          </div>
        )}
        {stats && stats.richieste.pending > 0 && (
          <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-5 flex items-start gap-4">
            <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-blue-800 dark:text-blue-350 uppercase tracking-wider">Richieste in Attesa</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-semibold leading-relaxed">{stats.richieste.pending} richieste da approvare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, color, label, value, sub }: {
  icon: any; color: string; label: string; value: string | number; sub: string
}) {
  const mapped = COLOR_MAP[color] || COLOR_MAP.slate

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-500/5 to-transparent pointer-events-none rounded-bl-full transition-transform duration-500 group-hover:scale-110"></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        <div className={`p-2.5 rounded-xl ${mapped.bg} border ${mapped.border} transition-transform duration-500 group-hover:scale-110 shadow-sm`}>
          <Icon className={`w-4 h-4 ${mapped.icon}`} />
        </div>
      </div>
      <div className="relative z-10">
        <p className={`text-3xl font-black ${mapped.value} tracking-tight`}>{value}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-555 font-bold uppercase tracking-wider mt-1">{sub}</p>
      </div>
    </div>
  )
}
