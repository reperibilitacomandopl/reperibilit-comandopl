"use client"

import React, { useEffect, useState } from "react"
import { Shield, Clock, User, Activity, Search, ChevronLeft, ChevronRight, RefreshCw, FileText } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface AuditLog {
  id: string
  adminName: string
  action: string
  details: string
  targetName: string
  createdAt: string
}

export default function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchLogs = async (p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${p}&limit=20`)
      const data = await res.json()
      if (data.logs) {
        setLogs(data.logs)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (err) {
      console.error("Error fetching logs:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(page)
  }, [page])

  const filteredLogs = logs.filter(log => 
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.adminName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActionColor = (action: string) => {
    if (action.includes("DELETE")) return "text-rose-400 bg-rose-400/10 border-rose-400/20"
    if (action.includes("CREATE")) return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    if (action.includes("CERTIFY")) return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20"
    return "text-blue-400 bg-blue-400/10 border-blue-400/20"
  }

  return (
    <div className="bg-[#0f172a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-8 border-b border-white/5 bg-white/5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Registri di Audit</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Tracciabilità completa delle azioni amministrative</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Cerca nei log..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64"
            />
          </div>
          <button 
            onClick={() => fetchLogs(page)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {loading && logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <RefreshCw size={40} className="text-indigo-500 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Activity size={48} className="mb-4 opacity-20" />
            <p className="font-bold uppercase text-xs tracking-widest">Nessun registro trovato</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="group bg-white/5 border border-white/5 hover:border-white/10 p-5 rounded-3xl transition-all flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase truncate">{log.adminName || 'Admin'}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={10} />
                      {format(new Date(log.createdAt), "dd MMM yyyy HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.targetName && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <FileText size={10} /> {log.targetName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{log.details}</p>
                </div>

                <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity">
                   <Shield className="text-slate-700" size={16} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Pagination */}
      <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Pagina {page} di {totalPages}
        </span>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white disabled:opacity-20 transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
