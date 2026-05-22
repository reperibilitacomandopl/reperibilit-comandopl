"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { 
  FileText, Search, Filter, ArrowUpDown, MoreVertical, 
  MapPin, CheckCircle, Clock, XCircle, AlertCircle, TrendingUp, Download
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
  user: { name: string, matricola: string }
}

export default function AdminVerbaliPage({ params }: { params: { tenantSlug: string } }) {
  const { isDark } = useTheme()
  const [violations, setViolations] = useState<Violation[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

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
    switch(stato) {
      case 'EMESSO': return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5"><Clock size={12}/> Emesso</span>
      case 'NOTIFICATO': return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5"><FileText size={12}/> Notificato</span>
      case 'PAGATO': return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5"><CheckCircle size={12}/> Pagato</span>
      case 'CONTESTATO': return <span className="px-2.5 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5"><AlertCircle size={12}/> Contestato</span>
      case 'ANNULLATO': return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5"><XCircle size={12}/> Annullato</span>
      default: return <span className="px-2.5 py-1 bg-slate-500/10 text-slate-400 rounded-lg text-xs font-bold">{stato}</span>
    }
  }

  const filteredViolations = violations.filter(v => 
    v.targa.includes(searchTerm.toUpperCase()) || 
    v.articoloCDS.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalIncassato = stats?.byStatus.find((s:any) => s.stato === 'PAGATO')?._sum.importo || 0
  const totaleEmesso = stats?.byStatus.reduce((acc:number, curr:any) => acc + curr._sum.importo, 0) || 0

  return (
    <div className={`p-8 max-w-7xl mx-auto space-y-8 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <FileText className="text-blue-500" />
            Registro Verbali CDS
          </h1>
          <p className="text-sm opacity-60 font-medium">Gestione contravvenzioni e stato incassi</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20">
          <Download size={16} />
          Esporta Registro
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"} shadow-sm`}>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Totale Emesso (30gg)</p>
          <div className="text-2xl font-black">€ {totaleEmesso.toFixed(2)}</div>
          <div className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1"><TrendingUp size={12}/> +12% mese prec.</div>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"} shadow-sm`}>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Incassato Reale</p>
          <div className="text-2xl font-black text-emerald-500">€ {totalIncassato.toFixed(2)}</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${totaleEmesso > 0 ? (totalIncassato/totaleEmesso)*100 : 0}%`}}></div>
          </div>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"} shadow-sm`}>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Verbali Emessi</p>
          <div className="text-2xl font-black">{violations.length}</div>
        </div>
        <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"} shadow-sm`}>
          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Top Infrazione</p>
          <div className="text-lg font-bold leading-tight mt-1">{stats?.byType[0]?.tipoInfrazione?.replace("_", " ") || "N/A"}</div>
          <p className="text-xs opacity-50 mt-1">{stats?.byType[0]?._count?.id || 0} verbali</p>
        </div>
      </div>

      {/* FILTERS & TABLE */}
      <div className={`rounded-3xl border ${isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"} overflow-hidden shadow-sm`}>
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/20">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
            <input 
              type="text"
              placeholder="Cerca per targa o articolo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="opacity-40" />
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`py-2.5 pl-4 pr-8 rounded-xl border text-sm font-bold outline-none appearance-none cursor-pointer ${
                isDark ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <option value="ALL">Tutti gli stati</option>
              <option value="EMESSO">Da Notificare (Emesso)</option>
              <option value="NOTIFICATO">Notificati</option>
              <option value="PAGATO">Pagati</option>
              <option value="CONTESTATO">Contestati / Ricorso</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={`text-xs uppercase font-black tracking-wider opacity-60 bg-black/10`}>
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
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center opacity-50">Caricamento verbali...</td></tr>
              ) : filteredViolations.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center opacity-50">Nessun verbale trovato.</td></tr>
              ) : filteredViolations.map((v) => (
                <tr key={v.id} className={`group transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                  <td className="px-6 py-4">
                    <div className="font-black text-base tracking-widest">{v.targa}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{format(new Date(v.createdAt), "dd MMM yyyy, HH:mm", { locale: it })}</div>
                    {v.indirizzo && <div className="text-xs opacity-60 flex items-center gap-1 mt-1"><MapPin size={10}/> {v.indirizzo}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{v.articoloCDS}</div>
                    <div className="text-xs opacity-60">{v.tipoInfrazione.replace("_", " ")}</div>
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
                        <button onClick={() => updateStatus(v.id, 'NOTIFICATO')} className="px-3 py-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-colors">
                          Notifica
                        </button>
                      )}
                      {v.stato === 'NOTIFICATO' && (
                        <button onClick={() => updateStatus(v.id, 'PAGATO')} className="px-3 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-colors">
                          Segna Pagato
                        </button>
                      )}
                      <button className="p-1.5 opacity-50 hover:opacity-100 rounded-lg bg-black/20">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
