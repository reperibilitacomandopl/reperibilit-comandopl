"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, ChevronLeft, ChevronRight, Download, FileText, BarChart3, Users, Clock, AlertTriangle, TrendingUp, Briefcase } from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

// ============================================================================
// MONTHLY REPORT — Report Mensile Riepilogativo
// ============================================================================

interface AgentStat {
  id: string; name: string; matricola: string; qualifica: string | null
  isUfficiale: boolean; squadra: string | null
  turniMattina: number; turniPomeriggio: number; giorniLavorati: number
  riposiProgrammati: number; ferie: number; malattia: number
  permessi104: number; altreAssenze: number; giorniAssenza: number
  oreLavorate: number; oreStraordinario: number
}

interface Totals {
  totalAgents: number; totalGiorniLavorati: number; totalOreLavorate: number
  totalOreStraordinario: number; totalFerie: number; totalMalattia: number
  totalPermessi104: number; tassoAssenteismo: number
}

const MESI = ["", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

export default function MonthlyReport() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AgentStat[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [sortBy, setSortBy] = useState<string>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stats/monthly?year=${year}&month=${month}`)
      const data = await res.json()
      if (data.agentStats) setStats(data.agentStats)
      if (data.totals) setTotals(data.totals)
    } catch {
      toast.error("Errore caricamento report")
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  const changeMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m)
    setYear(y)
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
  }

  const sortedStats = [...stats].sort((a, b) => {
    const va = (a as any)[sortBy]
    const vb = (b as any)[sortBy]
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === "asc" ? va - vb : vb - va
  })

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    const data = stats.map(s => ({
      Nome: s.name,
      Matricola: s.matricola,
      Qualifica: s.qualifica || "",
      Squadra: s.squadra || "",
      "Turni Mattina": s.turniMattina,
      "Turni Pomeriggio": s.turniPomeriggio,
      "Giorni Lavorati": s.giorniLavorati,
      "Ore Lavorate": s.oreLavorate,
      "Ore Straordinario": s.oreStraordinario,
      "Riposi": s.riposiProgrammati,
      "Ferie": s.ferie,
      "Malattia": s.malattia,
      "104": s.permessi104,
      "Altre Assenze": s.altreAssenze,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, `Report ${MESI[month]} ${year}`)
    XLSX.writeFile(wb, `report_mensile_${year}_${String(month).padStart(2, "0")}.xlsx`)
    toast.success("Report Excel scaricato!")
  }

  // Chart data: top 10 by ore lavorate
  const chartData = [...stats]
    .sort((a, b) => b.oreLavorate - a.oreLavorate)
    .slice(0, 10)
    .map(s => ({ name: s.name.split(" ").pop() || s.name, ore: s.oreLavorate, strao: s.oreStraordinario }))

  const kpis = totals ? [
    { label: "Organico", value: totals.totalAgents, icon: Users, color: "blue", sub: "agenti attivi" },
    { label: "Ore Lavorate", value: totals.totalOreLavorate, icon: Clock, color: "emerald", sub: "totale mese" },
    { label: "Straordinario", value: totals.totalOreStraordinario, icon: TrendingUp, color: "amber", sub: "ore totali" },
    { label: "Tasso Assenza", value: `${totals.tassoAssenteismo}%`, icon: AlertTriangle, color: totals.tassoAssenteismo > 10 ? "rose" : "slate", sub: "del periodo" },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Report Mensile</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Riepilogo ore, assenze e straordinari</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-4 font-bold text-sm text-slate-800 min-w-[160px] text-center">{MESI[month]} {year}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <button onClick={exportExcel} disabled={stats.length === 0} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{k.label}</span>
                  <k.icon className={`w-4 h-4 text-${k.color}-500`} />
                </div>
                <p className={`text-3xl font-black text-${k.color}-600 tracking-tight`}>{k.value}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Quick Stats Bar */}
          {totals && (
            <div className="flex flex-wrap gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Ferie: {totals.totalFerie} gg
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-3 h-3 bg-rose-500 rounded-sm"></span> Malattia: {totals.totalMalattia} gg
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-3 h-3 bg-purple-500 rounded-sm"></span> 104: {totals.totalPermessi104} gg
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="w-3 h-3 bg-amber-500 rounded-sm"></span> Straordinario: {totals.totalOreStraordinario}h
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" /> Top 10 — Ore Lavorate
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 600 }}
                  />
                  <Bar dataKey="ore" name="Ore Lavorate" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#3b82f6" : i < 3 ? "#60a5fa" : "#94a3b8"} />
                    ))}
                  </Bar>
                  <Bar dataKey="strao" name="Straordinario" radius={[6, 6, 0, 0]} fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Dettaglio per Agente
              </h3>
              <span className="text-xs text-slate-400 font-medium">{stats.length} agenti</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      { key: "name", label: "Agente" },
                      { key: "turniMattina", label: "Matt." },
                      { key: "turniPomeriggio", label: "Pom." },
                      { key: "giorniLavorati", label: "Lav." },
                      { key: "oreLavorate", label: "Ore" },
                      { key: "oreStraordinario", label: "Strao." },
                      { key: "riposiProgrammati", label: "Riposi" },
                      { key: "ferie", label: "Ferie" },
                      { key: "malattia", label: "Mal." },
                      { key: "permessi104", label: "104" },
                      { key: "altreAssenze", label: "Altro" },
                    ].map(col => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="p-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors whitespace-nowrap"
                      >
                        {col.label} {sortBy === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((s, i) => (
                    <tr key={s.id} className={`border-t border-slate-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                      <td className="p-3 font-bold text-slate-800 text-xs uppercase whitespace-nowrap">
                        {s.isUfficiale && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded font-black mr-1.5">UFF</span>}
                        {s.name}
                        {s.squadra && <span className="text-[9px] text-slate-400 ml-1.5">({s.squadra})</span>}
                      </td>
                      <td className="p-3 text-xs text-blue-700 font-bold text-center">{s.turniMattina || "—"}</td>
                      <td className="p-3 text-xs text-purple-700 font-bold text-center">{s.turniPomeriggio || "—"}</td>
                      <td className="p-3 text-xs text-slate-800 font-black text-center">{s.giorniLavorati}</td>
                      <td className="p-3 text-xs text-emerald-700 font-black text-center">{s.oreLavorate}</td>
                      <td className="p-3 text-xs font-black text-center">
                        {s.oreStraordinario > 0 ? <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{s.oreStraordinario}h</span> : "—"}
                      </td>
                      <td className="p-3 text-xs text-slate-500 text-center">{s.riposiProgrammati || "—"}</td>
                      <td className="p-3 text-xs text-center">{s.ferie > 0 ? <span className="text-blue-600 font-bold">{s.ferie}</span> : "—"}</td>
                      <td className="p-3 text-xs text-center">{s.malattia > 0 ? <span className="text-rose-600 font-bold">{s.malattia}</span> : "—"}</td>
                      <td className="p-3 text-xs text-center">{s.permessi104 > 0 ? <span className="text-purple-600 font-bold">{s.permessi104}</span> : "—"}</td>
                      <td className="p-3 text-xs text-center">{s.altreAssenze > 0 ? <span className="text-slate-600 font-bold">{s.altreAssenze}</span> : "—"}</td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  {totals && (
                    <tr className="bg-slate-900 text-white font-black">
                      <td className="p-3 text-xs uppercase tracking-wider">Totale ({totals.totalAgents} agenti)</td>
                      <td className="p-3 text-xs text-center">{stats.reduce((a, s) => a + s.turniMattina, 0)}</td>
                      <td className="p-3 text-xs text-center">{stats.reduce((a, s) => a + s.turniPomeriggio, 0)}</td>
                      <td className="p-3 text-xs text-center">{totals.totalGiorniLavorati}</td>
                      <td className="p-3 text-xs text-center">{totals.totalOreLavorate}</td>
                      <td className="p-3 text-xs text-center">{totals.totalOreStraordinario}h</td>
                      <td className="p-3 text-xs text-center">{stats.reduce((a, s) => a + s.riposiProgrammati, 0)}</td>
                      <td className="p-3 text-xs text-center">{totals.totalFerie}</td>
                      <td className="p-3 text-xs text-center">{totals.totalMalattia}</td>
                      <td className="p-3 text-xs text-center">{totals.totalPermessi104}</td>
                      <td className="p-3 text-xs text-center">{stats.reduce((a, s) => a + s.altreAssenze, 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
