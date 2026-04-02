"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Settings, RefreshCw, FileDown, ClipboardList, Play, Shield } from "lucide-react"
import SettingsPanel from "./SettingsPanel"
import Link from "next/link"

export default function ImpostazioniPanel() {
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
    { id: "settings" as const, label: "Configurazione", icon: Settings },
    { id: "audit" as const, label: "Registro Attività", icon: ClipboardList },
    { id: "verbatel" as const, label: "Export Verbatel", icon: FileDown },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Impostazioni</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Configurazione di sistema, audit log e integrazioni</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <SettingsPanel onClose={() => router.refresh()} embedded />
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Ultime 100 Azioni Amministrative</h2>
            <button onClick={loadAuditLogs} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors flex items-center gap-1.5">
              <RefreshCw size={12} className={isLoadingAudit ? "animate-spin" : ""} /> Aggiorna
            </button>
          </div>

          {isLoadingAudit ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <RefreshCw size={40} className="text-slate-300 animate-spin mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Caricamento registro...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-400 italic">
              Nessuna attività registrata.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        log.action.includes("DELETE") ? "bg-red-100 text-red-700" :
                        log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-100 text-emerald-700" :
                        log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>{log.action}</span>
                      <span className="text-xs font-bold text-slate-700">da {log.adminName || "Admin"}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {new Date(log.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{log.details}</p>
                  {log.targetName && (
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                      Target: <span className="text-slate-700">{log.targetName}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verbatel Tab */}
      {activeTab === "verbatel" && (
        <div className="space-y-4">
          <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl">
            <h3 className="font-bold text-orange-900 mb-2">Istruzioni d'uso:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-orange-800 font-medium">
              <li>In un'altra scheda, apri il <strong>Portale Verbatel</strong> - Prospetto Reperibilità.</li>
              <li>Imposta i filtri "Da... A..." per includere l'intero mese corrente.</li>
              <li>Ricarica la griglia Verbatel. Apri la Console del browser (F12 → Console).</li>
              <li>Genera lo script (qui sotto), <strong>copialo</strong>, incollalo in console e premi <strong>Invio</strong>.</li>
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={verbatelTestMode} onChange={e => setVerbatelTestMode(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-600" />
                <span className="font-bold text-slate-800 text-sm">Modalità Test (Solo 1 Agente)</span>
              </label>
              <button
                onClick={generateVerbatelScript}
                disabled={isLoadingVerbatel}
                className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                {isLoadingVerbatel ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                <span className="uppercase tracking-wider text-xs">Genera Script</span>
              </button>
            </div>

            {verbatelScript && (
              <div className="relative">
                <textarea
                  readOnly
                  value={verbatelScript}
                  className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl border-2 border-slate-700 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button
                  onClick={() => { navigator.clipboard.writeText(verbatelScript); toast.success("Codice copiato!") }}
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                >
                  COPIA
                </button>
              </div>
            )}
          </div>

          {/* Squadre Manager Link */}
          <Link 
            href="/admin/anagrafica" 
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-blue-500" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">Gestione Squadre</span>
              <span className="text-xs text-slate-400 font-medium">Vai all'Anagrafica per modificare l'assegnazione squadre</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
