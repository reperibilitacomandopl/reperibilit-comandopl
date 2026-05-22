"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileText, Plus, MapPin, Clock, Euro, Search, Shield, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"

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
  trasgressoreCognome?: string | null
  marcaVeicolo?: string | null
  modelloVeicolo?: string | null
  coloreVeicolo?: string | null
}

const STATUS_STYLE: Record<string, { bg: string, text: string, border: string }> = {
  EMESSO: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  NOTIFICATO: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  PAGATO: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
  CONTESTATO: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
  ANNULLATO: { bg: "bg-slate-100 dark:bg-slate-800/50", text: "text-slate-500 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" },
}

const STATUS_LABEL: Record<string, string> = {
  EMESSO: "Emesso",
  NOTIFICATO: "Notificato",
  PAGATO: "Pagato",
  CONTESTATO: "Contestato",
  ANNULLATO: "Annullato",
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  EMESSO: <Clock size={10} />,
  NOTIFICATO: <FileText size={10} />,
  PAGATO: <CheckCircle size={10} />,
  CONTESTATO: <AlertCircle size={10} />,
  ANNULLATO: <AlertCircle size={10} />,
}

export default function AgentVerbalListView({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter()
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/agent/violations")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setViolations(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // KPI calculations
  const totaleImporto = violations.reduce((acc, v) => acc + v.importo, 0)
  const totalePagato = violations.filter(v => v.stato === "PAGATO").reduce((acc, v) => acc + v.importo, 0)
  const totaleEmesso = violations.filter(v => v.stato === "EMESSO").length

  // Filter by search
  const filtered = violations.filter(v => {
    if (!search) return true
    const q = search.toUpperCase()
    return v.targa.includes(q) || v.articoloCDS.toUpperCase().includes(q) || (v.trasgressoreCognome && v.trasgressoreCognome.toUpperCase().includes(q))
  })

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
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <FileText size={16} />
            </div>
            I Miei Verbali
          </h2>
          <p className="text-xs text-slate-500 mt-1">{violations.length} verbali emessi</p>
        </div>
        <button
          onClick={() => router.push(`/${tenantSlug}/agent/verbale/nuovo`)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus size={14} /> Nuovo
        </button>
      </div>

      {/* Mini KPI */}
      {violations.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Totale</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{violations.length}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Importo</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">€{totaleImporto.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Da Notificare</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{totaleEmesso}</p>
          </div>
        </div>
      )}

      {/* Search */}
      {violations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cerca per targa, articolo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      )}

      {/* List */}
      {violations.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Nessun verbale emesso</p>
          <p className="text-xs text-slate-400 mt-1">Inizia a emettere verbali dal pulsante in alto</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-500">Nessun risultato per &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const s = STATUS_STYLE[v.stato] || STATUS_STYLE.EMESSO
            return (
              <div
                key={v.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-wide">{v.targa}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{v.tipoInfrazione.replace(/_/g, " ")}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border flex items-center gap-1 ${s.bg} ${s.text} ${s.border}`}>
                    {STATUS_ICON[v.stato]} {STATUS_LABEL[v.stato] || v.stato}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <FileText size={12} /> {v.articoloCDS}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Euro size={12} /> <span className="font-black text-slate-900 dark:text-white">€ {v.importo.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin size={12} /> {v.indirizzo || "—"}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock size={12} /> {new Date(v.createdAt).toLocaleDateString("it-IT")}
                  </div>
                  {(v.puntiPatente != null && v.puntiPatente > 0) && (
                    <div className="flex items-center gap-1.5 text-rose-500 font-bold col-span-2">
                      <Shield size={12} /> -{v.puntiPatente} punti patente
                    </div>
                  )}
                  {v.marcaVeicolo && (
                    <div className="text-slate-400 col-span-2 text-[10px]">
                      {v.marcaVeicolo} {v.modelloVeicolo} {v.coloreVeicolo}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
