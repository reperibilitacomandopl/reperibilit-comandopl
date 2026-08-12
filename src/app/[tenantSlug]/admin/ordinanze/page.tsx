"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import {
  FileText, Plus, Search, Filter, Clock, CheckCircle,
  XCircle, AlertCircle, BookOpen, ChevronRight, MapPin,
  Sparkles, AlertTriangle, Eye
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

const TIPO_LABEL: Record<string, string> = {
  DIVIETO_SOSTA: "Divieto di Sosta",
  CHIUSURA_STRADA: "Chiusura Strada",
  DIVIETO_E_CHIUSURA: "Div. Sosta + Chiusura",
  EVENTO: "Evento",
  LAVORI: "Lavori",
  MANIFESTAZIONE: "Manifestazione",
}

const TIPO_COLOR: Record<string, string> = {
  DIVIETO_SOSTA: "from-orange-500 to-amber-600",
  CHIUSURA_STRADA: "from-rose-500 to-red-600",
  DIVIETO_E_CHIUSURA: "from-red-500 to-rose-700",
  EVENTO: "from-violet-500 to-purple-600",
  LAVORI: "from-yellow-500 to-amber-600",
  MANIFESTAZIONE: "from-blue-500 to-indigo-600",
}

const STATO_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  NUOVA: { label: "Nuova", icon: <Clock size={12} />, bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  ANALISI: { label: "In analisi", icon: <Sparkles size={12} />, bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  BOZZA: { label: "Bozza pronta", icon: <FileText size={12} />, bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  REVISIONE: { label: "In revisione", icon: <AlertCircle size={12} />, bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  APPROVATA: { label: "Approvata", icon: <CheckCircle size={12} />, bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  RIGETTATA: { label: "Rigettata", icon: <XCircle size={12} />, bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
}

type OrdinanzaRequest = {
  id: string
  tipoOrdinanza: string
  testoRichiesta: string
  stato: string
  richiedente: string | null
  via: string | null
  dataInizio: string | null
  createdAt: string
  createdBy: { name: string; matricola: string }
  bozze: Array<{ id: string; stato: string; numeroProtocollo: string | null; createdAt: string }>
}

export default function OrdinanzeDashboard() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { isDark } = useTheme()
  const router = useRouter()

  const [requests, setRequests] = useState<OrdinanzaRequest[]>([])
  const [stats, setStats] = useState<Array<{ stato: string; _count: { stato: number } }>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statoFilter, setStatoFilter] = useState("ALL")
  const [tipoFilter, setTipoFilter] = useState("ALL")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statoFilter !== "ALL") params.set("stato", statoFilter)
      if (tipoFilter !== "ALL") params.set("tipo", tipoFilter)

      const res = await fetch(`/api/admin/ordinanze?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests ?? [])
        setStats(data.stats ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statoFilter, tipoFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const getStatoCount = (stato: string) =>
    stats.find(s => s.stato === stato)?._count?.stato ?? 0

  const totaleTutte = stats.reduce((acc, s) => acc + (s._count?.stato ?? 0), 0)

  const filtered = requests.filter(r => {
    const q = searchTerm.toLowerCase()
    return (
      !q ||
      (r.richiedente ?? "").toLowerCase().includes(q) ||
      (r.via ?? "").toLowerCase().includes(q) ||
      r.testoRichiesta.toLowerCase().includes(q)
    )
  })

  // Styles
  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark
    ? "bg-slate-950 border-white/10 text-white placeholder-white/30"
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const selectBg = isDark
    ? "bg-slate-950 border-white/10 text-white"
    : "bg-white border-slate-200 text-slate-900"
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
  const divider = isDark ? "divide-white/5 border-white/5" : "divide-slate-100 border-slate-200"

  return (
    <div className={`p-4 sm:p-8 max-w-7xl mx-auto space-y-8 ${isDark ? "text-slate-200" : "text-slate-800"}`}>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <FileText size={20} />
            </div>
            Ordinanze Viabilità
          </h1>
          <p className="text-sm opacity-60 font-medium mt-1">
            Agente AI per la predisposizione delle ordinanze — Revisione e approvazione operatore
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/ordinanze/templates`)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all border ${isDark ? "bg-slate-800 border-white/10 hover:bg-slate-700" : "bg-slate-100 border-slate-200 hover:bg-slate-200"}`}
          >
            <BookOpen size={16} />
            Modulistica
          </button>
          <button
            onClick={() => router.push(`/${tenantSlug}/admin/ordinanze/nuova`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
          >
            <Plus size={16} />
            Nuova Richiesta
          </button>
        </div>
      </div>

      {/* STAT TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "ALL", label: "Tutte", count: totaleTutte, color: "from-slate-500 to-slate-600" },
          { key: "BOZZA", label: "Bozza", count: getStatoCount("BOZZA"), color: "from-amber-500 to-orange-600" },
          { key: "REVISIONE", label: "Revisione", count: getStatoCount("REVISIONE"), color: "from-violet-500 to-purple-600" },
          { key: "APPROVATA", label: "Approvate", count: getStatoCount("APPROVATA"), color: "from-emerald-500 to-green-600" },
          { key: "RIGETTATA", label: "Rigettate", count: getStatoCount("RIGETTATA"), color: "from-rose-500 to-red-600" },
          { key: "NUOVA", label: "Nuove", count: getStatoCount("NUOVA") + getStatoCount("ANALISI"), color: "from-blue-500 to-indigo-600" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatoFilter(tab.key)}
            className={`relative p-4 rounded-2xl border text-left transition-all ${cardBg} ${statoFilter === tab.key ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
          >
            <div className={`text-2xl font-black bg-gradient-to-r ${tab.color} bg-clip-text text-transparent`}>
              {tab.count}
            </div>
            <div className="text-xs font-bold opacity-60 mt-1">{tab.label}</div>
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className={`rounded-3xl border ${cardBg} overflow-hidden shadow-sm`}>
        {/* Filters */}
        <div className={`p-4 border-b ${divider} flex flex-col sm:flex-row gap-3 items-center`}>
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
            <input
              type="text"
              placeholder="Cerca per richiedente, via, testo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${inputBg}`}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={15} className="opacity-40" />
            <select
              value={tipoFilter}
              onChange={e => setTipoFilter(e.target.value)}
              className={`py-2.5 pl-3 pr-8 rounded-xl border text-sm font-bold outline-none appearance-none cursor-pointer ${selectBg}`}
            >
              <option value="ALL">Tutti i tipi</option>
              {Object.entries(TIPO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className={`divide-y ${divider}`}>
          {loading ? (
            <div className="p-10 text-center opacity-50">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Caricamento pratiche...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center opacity-50">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">Nessuna pratica trovata</p>
              <p className="text-xs mt-1 opacity-60">
                {requests.length === 0 ? "Crea la tua prima richiesta di ordinanza" : "Prova a modificare i filtri"}
              </p>
            </div>
          ) : filtered.map((r) => {
            const stato = STATO_CONFIG[r.stato] ?? STATO_CONFIG.NUOVA
            const bozza = r.bozze[0]

            return (
              <div
                key={r.id}
                onClick={() => router.push(`/${tenantSlug}/admin/ordinanze/${r.id}`)}
                className={`p-5 flex items-center gap-4 cursor-pointer transition-colors ${rowHover} group`}
              >
                {/* Type badge */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TIPO_COLOR[r.tipoOrdinanza] ?? "from-slate-500 to-slate-600"} flex-shrink-0 flex items-center justify-center text-white`}>
                  <MapPin size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-wider opacity-50">
                      {TIPO_LABEL[r.tipoOrdinanza] ?? r.tipoOrdinanza}
                    </span>
                    {bozza?.numeroProtocollo && (
                      <span className="text-xs font-mono opacity-40">{bozza.numeroProtocollo}</span>
                    )}
                  </div>
                  <p className="font-bold text-sm truncate">
                    {r.richiedente && <span className="opacity-70">{r.richiedente} — </span>}
                    {r.via ?? r.testoRichiesta.substring(0, 80)}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs opacity-50">
                      {format(new Date(r.createdAt), "dd MMM yyyy", { locale: it })}
                    </span>
                    {r.dataInizio && (
                      <span className="text-xs opacity-50 flex items-center gap-1">
                        <Clock size={10} />
                        {format(new Date(r.dataInizio), "dd/MM/yyyy")}
                      </span>
                    )}
                    <span className="text-xs opacity-40">{r.createdBy.name}</span>
                  </div>
                </div>

                {/* Verifiche warning */}
                {r.stato === "REVISIONE" && (
                  <div className="flex items-center gap-1 text-amber-500 flex-shrink-0">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-bold">Da revisionare</span>
                  </div>
                )}

                {/* Stato badge */}
                <span className={`px-2.5 py-1 ${stato.bg} ${stato.text} border ${stato.border} rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0`}>
                  {stato.icon} {stato.label}
                </span>

                <ChevronRight size={16} className="opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
