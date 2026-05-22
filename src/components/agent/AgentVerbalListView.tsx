"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Plus, MapPin, Clock, Euro, ExternalLink, AlertCircle } from "lucide-react"

type Violation = {
  id: string
  targa: string
  tipoInfrazione: string
  articoloCDS: string
  importo: number
  stato: string
  createdAt: string
  indirizzo: string | null
}

const STATUS_STYLE: Record<string, string> = {
  EMESSO: "bg-amber-100 text-amber-700 border-amber-200",
  NOTIFICATO: "bg-blue-100 text-blue-700 border-blue-200",
  PAGATO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ANNULLATO: "bg-slate-100 text-slate-500 border-slate-200",
}

const STATUS_LABEL: Record<string, string> = {
  EMESSO: "Emesso",
  NOTIFICATO: "Notificato",
  PAGATO: "Pagato",
  ANNULLATO: "Annullato",
}

export default function AgentVerbalListView({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter()
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/agent/violations")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setViolations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">I Miei Verbali</h2>
          <p className="text-xs text-slate-500 mt-0.5">{violations.length} verbali emessi</p>
        </div>
        <button
          onClick={() => router.push(`/${tenantSlug}/agent/verbale/nuovo`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Nuovo Verbale
        </button>
      </div>

      {/* List */}
      {violations.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Nessun verbale emesso</p>
          <p className="text-xs text-slate-400 mt-1">Inizia a emettere verbali dal pulsante in alto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{v.targa}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{v.tipoInfrazione}</p>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${STATUS_STYLE[v.stato] || STATUS_STYLE.EMESSO}`}>
                  {STATUS_LABEL[v.stato] || v.stato}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <FileText size={12} /> {v.articoloCDS}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Euro size={12} /> € {v.importo.toFixed(2)}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin size={12} /> {v.indirizzo || "—"}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock size={12} /> {new Date(v.createdAt).toLocaleDateString("it-IT")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
