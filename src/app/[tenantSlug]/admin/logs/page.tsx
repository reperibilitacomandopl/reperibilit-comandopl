"use client"

import { useState, useEffect } from "react"
import { History, Search, Filter, ChevronLeft, ChevronRight, Info, User as UserIcon, Calendar, Clock, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import toast from "react-hot-toast"

type LogEntry = {
  id: string
  adminId: string
  adminName: string | null
  action: string
  targetId: string | null
  targetName: string | null
  details: string
  createdAt: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const limit = 20

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/audit-logs?limit=${limit}&skip=${page * limit}`)
      const data = await res.json()
      if (data.logs) {
        setLogs(data.logs)
        setTotal(data.total)
      } else {
        toast.error("Errore nel caricamento dei log")
      }
    } catch (err) {
      toast.error("Errore di connessione")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page])

  const getActionBadge = (action: string) => {
    const a = action.toUpperCase()
    if (a.includes("CREATE") || a.includes("ADD") || a.includes("GENERATE")) 
      return "bg-emerald-50 text-emerald-700 border-emerald-100"
    if (a.includes("DELETE") || a.includes("REMOVE") || a.includes("CANCEL")) 
      return "bg-rose-50 text-rose-700 border-rose-100"
    if (a.includes("UPDATE") || a.includes("EDIT") || a.includes("PUBLISH")) 
      return "bg-blue-50 text-blue-700 border-blue-100"
    return "bg-slate-50 text-slate-700 border-slate-100"
  }

  const filteredLogs = logs.filter(l => 
    l.adminName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.targetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#191C1D] p-6 lg:p-10 font-inter">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in slide-in-from-top-4 duration-500">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div 
                className="p-4 rounded-2xl shadow-lg text-white"
                style={{ background: 'var(--sentinel-gradient)' }}
              >
                <History size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-[#191C1D] tracking-tight uppercase font-public-sans italic mb-1">Registro <span className="opacity-50">Attività</span></h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Operational Evidence & Audit Log</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cerca per azione o utente..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold focus:ring-4 focus:ring-[#001736]/5 focus:border-[#001736] outline-none w-80 transition-all shadow-sm"
              />
            </div>
            <button className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#001736] transition-all shadow-sm">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Filters/Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-3 text-slate-400">
              <Info size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none group-hover:text-[#001736] transition-colors">Totale Operazioni</span>
            </div>
            <p className="text-4xl font-black text-[#191C1D]">{total.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-3 mb-3 text-slate-400">
              <Calendar size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none group-hover:text-[#001736] transition-colors">Ultima Evidenza</span>
            </div>
            <p className="text-xl font-black text-[#191C1D]">
              {logs.length > 0 ? format(new Date(logs[0].createdAt), "dd MMMM yyyy", { locale: it }) : "N/A"}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-all border-l-8 border-l-[#001736] group">
            <div className="flex items-center gap-3 mb-3 text-slate-400">
              <UserIcon size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none group-hover:text-[#001736] transition-colors">Integrità Sistema</span>
            </div>
            <p className="text-xl font-black text-[#001736] uppercase tracking-tighter italic">Sentinel Verified</p>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Timestamp</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Responsabile</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Evento</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Destinatario</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dettagli Operativi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center">
                       <div className="flex flex-col items-center gap-4">
                         <div className="w-12 h-12 border-4 border-slate-200 border-t-[#001736] rounded-full animate-spin" />
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizzazione Evidenze...</p>
                       </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-32 text-center text-slate-300 font-black uppercase text-xs tracking-[0.3em]"> 
                      Nessuna evidenza rilevata nei parametri 
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id} className={`hover:bg-slate-50 transition-all group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <Clock size={16} className="text-slate-300 group-hover:text-[#001736] transition-colors" />
                          <div>
                            <p className="text-sm font-black text-[#191C1D]">
                              {format(new Date(log.createdAt), "dd/MM/yyyy")}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 italic">
                              {format(new Date(log.createdAt), "HH:mm:ss")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black text-white uppercase shadow-md group-hover:scale-110 transition-transform"
                            style={{ background: 'var(--sentinel-primary)' }}
                          >
                            {log.adminName?.substring(0, 2) || "AD"}
                          </div>
                          <span className="text-sm font-black text-[#191C1D] tracking-tight">{log.adminName || "Sistema Centrale"}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 text-[10px] font-black rounded-lg border uppercase shadow-sm ${getActionBadge(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {log.targetName ? (
                          <div className="flex items-center gap-3 text-slate-500">
                            <ArrowRight size={16} className="text-slate-200" />
                            <span className="text-xs font-black tracking-tight">{log.targetName}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-black tracking-widest uppercase">Sentinel-OS</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-md font-bold group-hover:text-[#191C1D] transition-colors leading-relaxed">
                          {log.details}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-100 px-8 py-6 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Pagina <span className="text-[#191C1D]">{page + 1}</span> di {totalPages}
              </span>
              <div className="flex items-center gap-3">
                <button 
                  disabled={page === 0 || loading}
                  onClick={() => setPage(prev => prev - 1)}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#001736] hover:shadow-md disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => setPage(prev => prev + 1)}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#001736] hover:shadow-md disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
