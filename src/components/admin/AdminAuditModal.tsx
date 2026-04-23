"use client"

import React, { useState } from "react"
import { X, ClipboardList, RefreshCw, Calendar as CalendarIcon, Download } from "lucide-react"

interface AdminAuditModalProps {
  isOpen: boolean
  onClose: () => void
  auditLogs: any[]
  isLoadingAudit: boolean
  onRefresh: () => void
}

export function AdminAuditModal({ isOpen, onClose, auditLogs, isLoadingAudit, onRefresh }: AdminAuditModalProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const res = await fetch("/api/admin/audit-logs/export")
      if (!res.ok) throw new Error("Export failed")
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-slate-100 rounded-[1.5rem] shadow-sm">
               <ClipboardList width={28} height={28} className="text-slate-700" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Registro Attività</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Sentinel Autonomous Audit System — Ultime 100 Azioni</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50">
               {isExporting ? <RefreshCw width={16} height={16} className="animate-spin" /> : <Download width={16} height={16} />}
               <span className="hidden sm:inline">Esporta CSV</span>
             </button>
             <button onClick={onRefresh} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all">
                <RefreshCw width={20} height={20} className={isLoadingAudit ? "animate-spin" : ""} />
             </button>
             <button 
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
              >
                <X width={24} height={24} />
              </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
          {isLoadingAudit ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                <RefreshCw width={48} height={48} className="text-slate-200 animate-spin" />
                <RefreshCw width={24} height={24} className="text-indigo-500 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDirection: 'reverse' }} />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-6">Sincronizzazione registri...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nessun log disponibile nel database</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline vertical line */}
              <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-200"></div>
              
              <div className="space-y-8 relative">
                {auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-14 group">
                    {/* Timeline dot */}
                    <div className={`absolute left-4.5 top-0 w-3.5 h-3.5 rounded-full border-4 border-white shadow-sm -translate-x-1/2 z-10 transition-transform group-hover:scale-150 ${
                      log.action.includes("DELETE") ? "bg-rose-500 ring-4 ring-rose-100" :
                      log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-500 ring-4 ring-emerald-100" :
                      log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-blue-500 ring-4 ring-blue-100" :
                      "bg-slate-400 ring-4 ring-slate-100"
                    }`}></div>
                    
                    <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                            log.action.includes("DELETE") ? "bg-rose-50 text-rose-700 border-rose-100" :
                            log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-blue-50 text-blue-700 border-blue-100" :
                            "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {log.action}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eseguito da</span>
                            <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{log.adminName || 'Admin Sistema'}</span>
                          </div>
                        </div>
                        <time className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                          <CalendarIcon width={12} height={12} />
                          {new Date(log.createdAt).toLocaleString("it-IT", { 
                            day: '2-digit', month: '2-digit', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </time>
                      </div>
                      
                      <p className="text-sm text-slate-700 font-bold leading-relaxed mb-4">{log.details}</p>
                      
                      {log.targetName && (
                        <div className="pt-4 border-t border-slate-50 flex items-center gap-4">
                           <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                              <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Soggetto interessato</p>
                              <p className="text-[11px] font-black text-slate-700 uppercase">{log.targetName}</p>
                           </div>
                           <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 hidden sm:block">
                              <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Hash ID</p>
                              <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">{log.targetId?.slice(0,12)}...</p>
                           </div>
                        </div>
                      )}
                      {(log.ipAddress || log.userAgent) && (
                        <div className="pt-3 mt-3 border-t border-slate-50 flex flex-wrap gap-4">
                           {log.ipAddress && (
                             <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-slate-400">
                               <span className="uppercase tracking-widest">IP:</span> {log.ipAddress}
                             </div>
                           )}
                           {log.userAgent && (
                             <div className="flex items-center gap-2 text-[9px] font-mono font-bold text-slate-400 truncate max-w-[200px] sm:max-w-md">
                               <span className="uppercase tracking-widest">Client:</span> {log.userAgent}
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
