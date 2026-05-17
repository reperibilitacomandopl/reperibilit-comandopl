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
      setStats(s)
      setVacations(v.grouped || {})
      setLoading(false)
    })
  }, [year])

  if (loading) return <div className="p-8 text-center text-slate-400">Caricamento dashboard comandante...</div>

  const agentiInFerieg = (period: string) =>
    (vacations[period] || []).filter((p: any) => p.status === "ASSIGNED" || p.status === "CONFIRMED").length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Comandante</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Visione d'insieme del comando</p>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} color="blue" label="Organico" value={stats?.organico.total || 0} sub={`${stats?.organico.officers || 0} ufficiali`} />
        <KpiCard icon={Target} color="emerald" label="Copertura" value={`${stats?.copertura.rate || 0}%`} sub={`${stats?.copertura.shifts || 0} turni mese`} />
        <KpiCard icon={AlertTriangle} color="amber" label="Assenteismo" value={`${stats?.assenze.rate || 0}%`} sub={`${stats?.assenze.today || 0} assenti oggi`} />
        <KpiCard icon={TrendingUp} color="rose" label="Straordinario" value={`${stats?.straordinario.ore || 0}h`} sub="ore totali mese" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileText} color="indigo" label="Interventi 30gg" value={stats?.interventi.total || 0} sub={`${stats?.interventi.avgDaily || 0}/die - ${stats?.interventi.completed || 0} chiusi`} />
        <KpiCard icon={Clock} color="purple" label="Richieste in attesa" value={stats?.richieste.pending || 0} sub="da approvare" />
        <KpiCard icon={Shield} color="slate" label="Scadenze 30gg" value={stats?.scadenze.documenti || 0} sub="documenti in scadenza" />
        <KpiCard icon={Calendar} color="cyan" label="Anno" value={year} sub="pianificazione ferie" />
      </div>

      {/* Pianificazione Ferie */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-800">Pianificazione Ferie {year}</h3>
          <div className="flex gap-2">
            <button onClick={() => setYear(y => y - 1)} className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg">←</button>
            <button onClick={() => setYear(y => y + 1)} className="text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg">→</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PERIODI.map(period => (
            <div key={period} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-slate-700 text-sm uppercase">{LABEL_PERIODO[period]}</h4>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${agentiInFerieg(period) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {agentiInFerieg(period)} agenti pianificati
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(vacations[period] || []).slice(0, 10).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">{p.user.name}</span>
                      {p.user.squadra && <span className="text-slate-400 ml-1">({p.user.squadra})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        {new Date(p.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                        {" → "}
                        {new Date(p.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${p.status === "PREFERENCE" ? "bg-blue-100 text-blue-700" : p.status === "ASSIGNED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {p.status === "PREFERENCE" ? "PREF." : p.status === "ASSIGNED" ? "ASSEGN." : "CONF."}
                      </span>
                    </div>
                  </div>
                ))}
                {(vacations[period] || []).length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">Nessuna pianificazione per questo periodo</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert rapidi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats && stats.assenze.today > 5 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="text-xs font-black text-rose-800 uppercase">Alto tasso di assenze</p>
              <p className="text-[10px] text-rose-600">{stats.assenze.today} assenti oggi — verificare copertura</p>
            </div>
          </div>
        )}
        {stats && stats.scadenze.documenti > 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-black text-amber-800 uppercase">Scadenze Documentali</p>
              <p className="text-[10px] text-amber-600">{stats.scadenze.documenti} documenti in scadenza entro 30 giorni</p>
            </div>
          </div>
        )}
        {stats && stats.richieste.pending > 3 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-black text-blue-800 uppercase">Richieste in Attesa</p>
              <p className="text-[10px] text-blue-600">{stats.richieste.pending} richieste da approvare</p>
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
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <Icon className={`w-4 h-4 text-${color}-500`} />
      </div>
      <p className={`text-3xl font-black text-${color}-600 tracking-tight`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium mt-1">{sub}</p>
    </div>
  )
}
