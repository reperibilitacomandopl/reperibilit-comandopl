"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import {
  FileText, Search, Filter, MoreVertical,
  MapPin, CheckCircle, Clock, XCircle, AlertCircle, TrendingUp, Download, Plus, Eye
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

type Violation = {
  id: string
  targa: string
  tipoInfrazione: string
  articoloCDS: string
  importo: number
  stato: string
  createdAt: string
  indirizzo: string | null
  puntiPatente?: number
  trasgressoreNome?: string | null
  trasgressoreCognome?: string | null
  marcaVeicolo?: string | null
  modelloVeicolo?: string | null
  coloreVeicolo?: string | null
  user: { name: string, matricola: string }
}

export default function AdminVerbaliPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { isDark } = useTheme()
  const [violations, setViolations] = useState<Violation[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resViolations, resStats] = await Promise.all([
        fetch(`/api/admin/violations${statusFilter !== "ALL" ? `?stato=${statusFilter}` : ""}`),
        fetch(`/api/admin/violations/stats`)
      ])
      
      if (resViolations.ok) setViolations(await resViolations.json())
      if (resStats.ok) setStats(await resStats.json())
    } catch (error) {
      console.error("Errore fetch verbali", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/violations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato: newStatus })
      })
      if (res.ok) fetchData()
    } catch (error) {
      console.error("Errore update stato", error)
    }
  }

  const getStatusBadge = (stato: string) => {
    const styles: Record<string, { bg: string, text: string, border: string, icon: React.ReactNode, label: string }> = {
      EMESSO: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", icon: <Clock size={12} />, label: "Emesso" },
      NOTIFICATO: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", icon: <FileText size={12} />, label: "Notificato" },
      PAGATO: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", icon: <CheckCircle size={12} />, label: "Pagato" },
      CONTESTATO: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", icon: <AlertCircle size={12} />, label: "Contestato" },
      ANNULLATO: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", icon: <XCircle size={12} />, label: "Annullato" },
    }
    const s = styles[stato] || styles.ANNULLATO
    return (
      <span className={`px-2.5 py-1 ${s.bg} ${s.text} border ${s.border} rounded-lg text-xs font-bold flex items-center gap-1.5`}>
        {s.icon} {s.label}
      </span>
    )
  }

  const filteredViolations = violations.filter(v => 
    v.targa.includes(searchTerm.toUpperCase()) || 
    v.articoloCDS.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.trasgressoreCognome && v.trasgressoreCognome.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalIncassato = stats?.byStatus.find((s:any) => s.stato === 'PAGATO')?._sum.importo || 0
  const totaleEmesso = stats?.byStatus.reduce((acc:number, curr:any) => acc + curr._sum.importo, 0) || 0
  const percIncassato = totaleEmesso > 0 ? ((totalIncassato / totaleEmesso) * 100).toFixed(1) : "0"
  const totaleVerbali = stats?.byStatus.reduce((acc: number, curr: any) => acc + curr._count.id, 0) || violations.length

  // Card and container styles
  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const containerBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const filterBarBg = isDark ? "bg-slate-950/60" : "bg-slate-50"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const selectBg = isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
  const theadBg = isDark ? "bg-slate-950/50" : "bg-slate-50"
  const rowDivider = isDark ? "divide-white/5" : "divide-slate-100"
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
  const filterDivider = isDark ? "border-white/5" : "border-slate-200"
  const progressBg = isDark ? "bg-slate-800" : "bg-slate-200"

  return (
    <div className={`p-4 sm:p-8 max-w-7xl mx-auto space-y-8 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <FileText size={20} />
            </div>
            Registro Verbali CDS
          </h1>
          <p className="text-sm opacity-60 font-medium mt-1">Gestione contravvenzioni e stato incassi</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open(`/${tenantSlug}/agent/verbale/nuovo`, '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Plus size={16} />
            Nuovo Verbale
          </button>
          <button
            onClick={async () => {
              const res = await fetch('/api/admin/violations/pdf')
              if (res.ok) {
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = 'registro-verbali.pdf'; a.click()
                URL.revokeObjectURL(url)
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Download size={16} />
            Esporta PDF
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-5 sm:p-6 rounded-2xl border ${cardBg} shadow-sm`}>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Totale Emesso (30gg)</p>
          <div className="text-xl sm:text-2xl font-black">€ {totaleEmesso.toFixed(2)}</div>
          <div className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1"><TrendingUp size={12}/> {totaleVerbali} verbali</div>
        </div>
        <div className={`p-5 sm:p-6 rounded-2xl border ${cardBg} shadow-sm`}>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Incassato Reale</p>
          <div className="text-xl sm:text-2xl font-black text-emerald-500">€ {totalIncassato.toFixed(2)}</div>
          <div className={`w-full ${progressBg} rounded-full h-1.5 mt-3 overflow-hidden`}>
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${percIncassato}%`}}></div>
          </div>
          <p className="text-[10px] text-emerald-500 font-bold mt-1.5">{percIncassato}% del totale</p>
        </div>
        <div className={`p-5 sm:p-6 rounded-2xl border ${cardBg} shadow-sm`}>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Verbali Emessi</p>
          <div className="text-xl sm:text-2xl font-black">{totaleVerbali}</div>
          <p className="text-[10px] opacity-40 mt-2 font-medium">Ultimi 30 giorni</p>
        </div>
        <div className={`p-5 sm:p-6 rounded-2xl border ${cardBg} shadow-sm`}>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Top Infrazione</p>
          <div className="text-base sm:text-lg font-bold leading-tight mt-1">{stats?.byType[0]?.tipoInfrazione?.replace(/_/g, " ") || "N/A"}</div>
          <p className="text-[10px] opacity-40 mt-1 font-medium">{stats?.byType[0]?._count?.id || 0} verbali</p>
        </div>
      </div>

      {/* FILTERS & TABLE */}
      <div className={`rounded-3xl border ${containerBg} overflow-hidden shadow-sm`}>
        <div className={`p-4 border-b ${filterDivider} flex flex-col sm:flex-row gap-4 justify-between items-center ${filterBarBg}`}>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
            <input 
              type="text"
              placeholder="Cerca per targa, articolo o cognome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all ${inputBg}`}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="opacity-40" />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`py-2.5 pl-4 pr-8 rounded-xl border text-sm font-bold outline-none appearance-none cursor-pointer ${selectBg}`}
            >
              <option value="ALL">Tutti gli stati</option>
              <option value="EMESSO">Da Notificare (Emesso)</option>
              <option value="NOTIFICATO">Notificati</option>
              <option value="PAGATO">Pagati</option>
              <option value="CONTESTATO">Contestati / Ricorso</option>
              <option value="ANNULLATO">Annullati</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-xs uppercase font-black tracking-wider opacity-60 ${theadBg}`}>
              <tr>
                <th className="px-6 py-4">Targa / Veicolo</th>
                <th className="px-6 py-4">Data e Luogo</th>
                <th className="px-6 py-4">Violazione</th>
                <th className="px-6 py-4 text-right">Importo</th>
                <th className="px-6 py-4">Stato</th>
                <th className="px-6 py-4">Agente</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${rowDivider}`}>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center opacity-50">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    Caricamento verbali...
                  </div>
                </td></tr>
              ) : filteredViolations.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center opacity-50">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Nessun verbale trovato</p>
                  <p className="text-xs mt-1 opacity-60">Prova a modificare i filtri di ricerca</p>
                </td></tr>
              ) : filteredViolations.map((v) => (
                <tr key={v.id} className={`group transition-colors ${rowHover}`}>
                  <td className="px-6 py-4">
                    <div className="font-black text-base tracking-widest">{v.targa}</div>
                    {v.marcaVeicolo && <div className="text-[10px] opacity-50 mt-0.5">{v.marcaVeicolo} {v.modelloVeicolo} {v.coloreVeicolo}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{format(new Date(v.createdAt), "dd MMM yyyy, HH:mm", { locale: it })}</div>
                    {v.indirizzo && <div className="text-xs opacity-60 flex items-center gap-1 mt-1"><MapPin size={10}/> {v.indirizzo}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{v.articoloCDS}</div>
                    <div className="text-xs opacity-60">{v.tipoInfrazione.replace(/_/g, " ")}</div>
                    {(v.puntiPatente != null && v.puntiPatente > 0) && <div className="text-[10px] text-rose-500 font-bold mt-0.5">-{v.puntiPatente} punti</div>}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-base">
                    € {v.importo.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(v.stato)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold">{v.user.name}</div>
                    <div className="text-[10px] opacity-50 uppercase tracking-widest">{v.user.matricola}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {v.stato === 'EMESSO' && (
                        <button onClick={() => updateStatus(v.id, 'NOTIFICATO')} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all">
                          Notifica
                        </button>
                      )}
                      {v.stato === 'NOTIFICATO' && (
                        <button onClick={() => updateStatus(v.id, 'PAGATO')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all">
                          Segna Pagato
                        </button>
                      )}
                      <button 
                        onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                        className={`p-1.5 rounded-lg transition-all ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-white/5">
          {loading ? (
            <div className="p-8 text-center opacity-50">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              Caricamento...
            </div>
          ) : filteredViolations.length === 0 ? (
            <div className="p-8 text-center opacity-50">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">Nessun verbale trovato</p>
            </div>
          ) : filteredViolations.map((v) => (
            <div key={v.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-black tracking-widest">{v.targa}</p>
                  <p className="text-xs opacity-60">{v.articoloCDS} — {v.tipoInfrazione.replace(/_/g, " ")}</p>
                </div>
                {getStatusBadge(v.stato)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 opacity-60">
                  <Clock size={12} /> {format(new Date(v.createdAt), "dd MMM yyyy", { locale: it })}
                </div>
                <div className="font-black text-right text-base">€ {v.importo.toFixed(2)}</div>
                {v.indirizzo && <div className="flex items-center gap-1.5 opacity-60 col-span-2"><MapPin size={12} /> {v.indirizzo}</div>}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] opacity-40 font-bold uppercase">{v.user.name} ({v.user.matricola})</p>
                <div className="flex gap-2">
                  {v.stato === 'EMESSO' && (
                    <button onClick={() => updateStatus(v.id, 'NOTIFICATO')} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-bold">Notifica</button>
                  )}
                  {v.stato === 'NOTIFICATO' && (
                    <button onClick={() => updateStatus(v.id, 'PAGATO')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-bold">Pagato</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
