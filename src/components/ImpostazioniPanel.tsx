"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Settings, RefreshCw, FileDown, ClipboardList, Play, Shield, ArrowRight, Terminal } from "lucide-react"
import SettingsPanel from "./SettingsPanel"
import Link from "next/link"

export default function ImpostazioniPanel({ tenantSlug }: { tenantSlug?: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"settings" | "audit" | "verbatel">("settings")

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)

  // Verbatel state
  const [verbatelTestMode, setVerbatelTestMode] = useState(true)
  const [verbatelScript, setVerbatelScript] = useState("")
  const [isLoadingVerbatel, setIsLoadingVerbatel] = useState(false)

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true)
    try {
      const res = await fetch("/api/admin/audit")
      const data = await res.json()
      setAuditLogs(data.logs || [])
    } catch { }
    setIsLoadingAudit(false)
  }

  const generateVerbatelScript = async () => {
    setIsLoadingVerbatel(true)
    try {
      const now = new Date()
      const res = await fetch(`/api/admin/verbatel-export?month=${now.getMonth() + 1}&year=${now.getFullYear()}&testMode=${verbatelTestMode}`)
      const data = await res.json()
      setVerbatelScript(data.script || "// Errore: nessun dato")
    } catch {
      toast.error("Errore generazione script")
    }
    setIsLoadingVerbatel(false)
  }

  useEffect(() => {
    if (activeTab === "audit") loadAuditLogs()
  }, [activeTab])

  const tabs = [
    { id: "settings" as const, label: "Configurazione", icon: Settings, accent: "indigo" },
    { id: "audit" as const, label: "Audit Log", icon: ClipboardList, accent: "slate" },
    { id: "verbatel" as const, label: "Integrazione Verbatel", icon: FileDown, accent: "orange" },
  ]

  return (
    <div className="space-y-12 animate-fade-up p-2">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-4 bg-slate-900 rounded-2xl shadow-xl ring-1 ring-white/20">
              <Settings size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 font-sans italic lowercase">pannello <span className="text-indigo-600 not-italic uppercase">controllo</span></h1>
              <p className="text-slate-500 font-medium mt-1">Gestisci i parametri globali, i registri di sicurezza e le integrazioni esterne.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Premium */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200 w-fit backdrop-blur-sm">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                isActive 
                  ? "bg-white text-indigo-600 shadow-xl shadow-slate-200 ring-1 ring-slate-100" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="premium-card overflow-hidden border-t-4 border-t-indigo-600 slide-in-from-left-4 animate-in duration-500">
          <SettingsPanel onClose={() => router.refresh()} embedded />
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <div className="space-y-6 slide-in-from-right-4 animate-in duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">Registro Attività Amministrative</h2>
            <button 
              onClick={loadAuditLogs} 
              className="px-5 py-2.5 bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all flex items-center gap-3 shadow-sm active:scale-95"
            >
              <RefreshCw size={14} className={isLoadingAudit ? "animate-spin" : ""} /> Sincronizza Log
            </button>
          </div>

          {isLoadingAudit ? (
            <div className="flex flex-col items-center justify-center py-32 premium-card">
              <RefreshCw size={48} className="text-indigo-200 animate-spin mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Analisi dei registri in corso...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-32 premium-card">
              <p className="text-slate-400 font-medium italic">Nessuna attività registrata nel log di sistema.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {auditLogs.map(log => (
                <div key={log.id} className="premium-card p-6 flex items-start justify-between gap-6 group hover:border-indigo-100">
                  <div className="flex items-start gap-5">
                    <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        log.action.includes("DELETE") ? "bg-rose-50 text-rose-500" :
                        log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-50 text-emerald-500" :
                        log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-indigo-50 text-indigo-500" :
                        "bg-slate-100 text-slate-500"
                    }`}>
                      <ClipboardList size={20} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-3">
                         <span className="text-xs font-black uppercase tracking-widest text-slate-900">{log.action}</span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase">da {log.adminName || "Amministratore"}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{log.details}</p>
                      {log.targetName && (
                        <div className="flex items-center gap-1.5 mt-2">
                           <div className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase tracking-tighter">Target: {log.targetName}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono font-bold block">
                      {new Date(log.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold block uppercase">
                      {new Date(log.createdAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verbatel Tab */}
      {activeTab === "verbatel" && (
        <div className="space-y-8 slide-in-from-bottom-6 animate-in duration-500">
          <div className="bg-orange-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-orange-900/20 relative overflow-hidden">
             <div className="absolute -right-8 -bottom-8 opacity-10">
                <Terminal size={200} />
             </div>
             <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shrink-0">
                   <Terminal size={32} />
                </div>
                <div>
                   <h3 className="text-2xl font-black mb-2 font-sans italic tracking-tight">Sync Verbatel Console</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-orange-50 font-medium">
                      <div className="flex items-start gap-2 text-sm italic opacity-90">
                         <span className="font-bold">1.</span> Apri Verbatel - Reperibilità
                      </div>
                      <div className="flex items-start gap-2 text-sm italic opacity-90">
                         <span className="font-bold">2.</span> Apri Console Browser (F12)
                      </div>
                      <div className="flex items-start gap-2 text-sm italic opacity-90">
                         <span className="font-bold">3.</span> Copia Script Generato
                      </div>
                      <div className="flex items-start gap-2 text-sm italic opacity-90">
                         <span className="font-bold">4.</span> Incolla e premi Invio
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="premium-card p-10 space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <label className="group flex items-center gap-4 cursor-pointer p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-orange-200 transition-all">
                <div className="relative w-12 h-6 bg-slate-200 rounded-full transition-colors group-hover:bg-slate-300">
                   <input 
                     type="checkbox" 
                     checked={verbatelTestMode} 
                     onChange={e => setVerbatelTestMode(e.target.checked)} 
                     className="sr-only peer" 
                   />
                   <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${verbatelTestMode ? "translate-x-6 bg-orange-600" : ""}`} />
                </div>
                <span className="font-black text-slate-800 text-xs uppercase tracking-widest">Modalità Test (Solo 1 Agente)</span>
              </label>

              <button
                onClick={generateVerbatelScript}
                disabled={isLoadingVerbatel}
                className="w-full md:w-auto bg-orange-600 hover:bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoadingVerbatel ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                Genera Script Sincronizzazione
              </button>
            </div>

            {verbatelScript && (
              <div className="relative group">
                <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-800 text-orange-400 text-[10px] font-black uppercase tracking-widest rounded shadow-lg z-10">Console Output (.js)</div>
                <textarea
                  readOnly
                  value={verbatelScript}
                  className="w-full h-64 bg-slate-900 text-orange-200 font-mono text-xs p-8 rounded-3xl border-4 border-slate-800 focus:outline-none focus:border-orange-500 transition-colors shadow-inner pt-10"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(verbatelScript); toast.success("Codice copiato!") }}
                  className="absolute top-6 right-6 bg-white/10 hover:bg-orange-600 text-white backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xl"
                >
                  COPIA SCRIPT
                </button>
              </div>
            )}
          </div>

          <Link 
            href={`/${tenantSlug || 'admin'}/admin/risorse`} 
            className="flex items-center justify-between p-8 bg-white rounded-[2rem] border-2 border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group"
          >
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                 <Shield size={28} className="text-indigo-600" />
               </div>
               <div>
                 <span className="text-xl font-black text-slate-900 block font-sans tracking-tight">Anagrafica & Squadre</span>
                 <span className="text-sm text-slate-400 font-medium">Gestisci ruoli, gradi e raggruppamenti operativi</span>
               </div>
            </div>
            <ArrowRight className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all" size={24} />
          </Link>
        </div>
      )}
    </div>
  )
}
