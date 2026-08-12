"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import {
  ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle,
  Clock, User, MapPin, Calendar, Download, BookOpen,
  ChevronDown, ChevronUp, Sparkles, Edit3, Save, X
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import toast from "react-hot-toast"
import type { Verifica } from "@/lib/ordinanza-ai"

const STATO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  NUOVA: { label: "Nuova", bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  ANALISI: { label: "In analisi", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  BOZZA: { label: "Bozza pronta", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  REVISIONE: { label: "In revisione", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  APPROVATA: { label: "Approvata", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  RIGETTATA: { label: "Rigettata", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
}

const TIPO_LABEL: Record<string, string> = {
  DIVIETO_SOSTA: "Divieto di Sosta",
  CHIUSURA_STRADA: "Chiusura Temporanea Strada",
  DIVIETO_E_CHIUSURA: "Divieto di Sosta + Chiusura Strada",
  EVENTO: "Evento / Manifestazione",
  LAVORI: "Lavori Stradali",
  MANIFESTAZIONE: "Manifestazione Pubblica",
}

type BozzaDetail = {
  id: string
  testo: string
  testoModificato: string | null
  numeroProtocollo: string | null
  stato: string
  noteOperatore: string | null
  approvataAt: string | null
  fileDocxUrl: string | null
  filePdfUrl: string | null
  documentiUsati: Array<{ nome: string; tipo: string }> | null
  approvataDa: { name: string; matricola: string } | null
  createdAt: string
}

type RequestDetail = {
  id: string
  tipoOrdinanza: string
  testoRichiesta: string
  stato: string
  richiedente: string | null
  via: string | null
  civico: string | null
  dataInizio: string | null
  dataFine: string | null
  oraDalle: string | null
  oraAlle: string | null
  motivazione: string | null
  analisiAi: { analisi: Record<string, unknown>; verifiche: Verifica[]; riassunto: string } | null
  verifiche: Verifica[] | null
  createdAt: string
  createdBy: { name: string; matricola: string; qualifica: string | null }
  bozze: BozzaDetail[]
}

export default function OrdinanzaDetailPage() {
  const { tenantSlug, id } = useParams<{ tenantSlug: string; id: string }>()
  const { isDark } = useTheme()
  const router = useRouter()

  const [data, setData] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedBozza, setExpandedBozza] = useState<string | null>(null)
  const [editingBozza, setEditingBozza] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ordinanze/${id}`)
      if (res.ok) setData(await res.json())
      else toast.error("Pratica non trovata")
    } catch { toast.error("Errore di rete") }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveBozza = async (bozzaId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/ordinanze/${id}/bozza/${bozzaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testoModificato: editText }),
      })
      if (res.ok) {
        toast.success("Bozza aggiornata")
        setEditingBozza(null)
        fetchData()
      }
    } catch { toast.error("Errore salvataggio") }
    finally { setSaving(false) }
  }

  const handleAzione = async (bozzaId: string, azione: "APPROVA" | "RIGETTA") => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/ordinanze/${id}/approva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bozzaId, azione }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success(azione === "APPROVA" ? "Ordinanza approvata! Documenti generati." : "Pratica rigettata.")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore")
    } finally {
      setActionLoading(false)
    }
  }

  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
  const sectionBg = isDark ? "bg-slate-800/50" : "bg-slate-50"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm opacity-50">Caricamento pratica...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const stato = STATO_CONFIG[data.stato] ?? STATO_CONFIG.NUOVA
  const verifiche = data.verifiche ?? data.analisiAi?.verifiche ?? []
  const attenzioni = verifiche.filter(v => v.categoria === "ATTENZIONE").length
  const mancanti = verifiche.filter(v => v.categoria === "MANCANTE").length

  return (
    <div className={`p-4 sm:p-8 max-w-5xl mx-auto space-y-6 ${isDark ? "text-slate-200" : "text-slate-800"}`}>

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push(`/${tenantSlug}/admin/ordinanze`)}
          className={`p-2 rounded-xl transition-all flex-shrink-0 ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black tracking-tight">
              {TIPO_LABEL[data.tipoOrdinanza] ?? data.tipoOrdinanza}
            </h1>
            <span className={`px-2.5 py-1 ${stato.bg} ${stato.text} border ${stato.border} rounded-lg text-xs font-bold`}>
              {stato.label}
            </span>
          </div>
          <p className="text-sm opacity-50 mt-0.5 flex items-center gap-3">
            <span className="flex items-center gap-1"><User size={12} /> {data.createdBy.name}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {format(new Date(data.createdAt), "dd MMM yyyy HH:mm", { locale: it })}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: dati pratica */}
        <div className="lg:col-span-1 space-y-4">

          {/* Info principali */}
          <div className={`rounded-2xl border ${cardBg} p-4 space-y-3`}>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Dettagli pratica</h3>
            {[
              { icon: <User size={13} />, label: "Richiedente", value: data.richiedente },
              { icon: <MapPin size={13} />, label: "Via / Luogo", value: [data.via, data.civico].filter(Boolean).join(", ") || null },
              { icon: <Calendar size={13} />, label: "Data inizio", value: data.dataInizio ? format(new Date(data.dataInizio), "dd/MM/yyyy") : null },
              { icon: <Calendar size={13} />, label: "Data fine", value: data.dataFine ? format(new Date(data.dataFine), "dd/MM/yyyy") : null },
              { icon: <Clock size={13} />, label: "Orario", value: data.oraDalle ? `${data.oraDalle} – ${data.oraAlle}` : null },
              { icon: <FileText size={13} />, label: "Motivazione", value: data.motivazione },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-2">
                <span className="opacity-40 mt-0.5 flex-shrink-0">{f.icon}</span>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-wider opacity-40">{f.label}</p>
                  <p className={`text-xs font-medium mt-0.5 ${!f.value ? "opacity-30 italic" : ""}`}>{f.value ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Verifiche */}
          {verifiche.length > 0 && (
            <div className={`rounded-2xl border ${cardBg} p-4 space-y-3`}>
              <h3 className="text-xs font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                <AlertTriangle size={12} />
                Verifiche AI
                {(attenzioni > 0 || mancanti > 0) && (
                  <span className="ml-auto text-amber-400 text-[10px]">{attenzioni + mancanti} da controllare</span>
                )}
              </h3>
              <div className="space-y-1.5">
                {verifiche.map(v => (
                  <div key={v.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${v.categoria === "OK" ? "bg-emerald-500/8 text-emerald-400" : v.categoria === "ATTENZIONE" ? "bg-amber-500/8 text-amber-400" : "bg-rose-500/8 text-rose-400"}`}>
                    {v.categoria === "OK" ? <CheckCircle size={11} /> : v.categoria === "ATTENZIONE" ? <AlertTriangle size={11} /> : <XCircle size={11} />}
                    {v.descrizione}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testo originale */}
          <div className={`rounded-2xl border ${cardBg} p-4 space-y-2`}>
            <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Testo originale</h3>
            <p className={`text-xs font-mono leading-relaxed opacity-70 max-h-40 overflow-y-auto ${sectionBg} p-2 rounded-xl`}>
              {data.testoRichiesta}
            </p>
          </div>
        </div>

        {/* RIGHT: bozze */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-black flex items-center gap-2 text-sm">
            <FileText size={16} className="text-indigo-400" />
            Bozze ordinanza ({data.bozze.length})
          </h3>

          {data.bozze.length === 0 ? (
            <div className={`rounded-2xl border ${cardBg} p-8 text-center opacity-50`}>
              <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">Nessuna bozza generata</p>
              <p className="text-xs mt-1 opacity-60">Torna alla dashboard e usa il wizard per generare una bozza</p>
            </div>
          ) : data.bozze.map((b) => {
            const bStato = STATO_CONFIG[b.stato] ?? STATO_CONFIG.NUOVA
            const isExpanded = expandedBozza === b.id
            const isEditing = editingBozza === b.id
            const testoVisualizzato = b.testoModificato ?? b.testo

            return (
              <div key={b.id} className={`rounded-2xl border ${cardBg} overflow-hidden`}>
                {/* Bozza header */}
                <div
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                  onClick={() => setExpandedBozza(isExpanded ? null : b.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm font-mono">{b.numeroProtocollo ?? "Bozza"}</span>
                      <span className={`px-2 py-0.5 ${bStato.bg} ${bStato.text} border ${bStato.border} rounded text-[10px] font-black`}>
                        {bStato.label}
                      </span>
                    </div>
                    <p className="text-xs opacity-40 mt-0.5">
                      {format(new Date(b.createdAt), "dd MMM yyyy HH:mm", { locale: it })}
                      {b.approvataDa && ` — Approvata da ${b.approvataDa.name}`}
                    </p>
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {b.stato === "BOZZA" && !isEditing && (
                      <>
                        <button
                          onClick={() => { setEditingBozza(b.id); setEditText(testoVisualizzato); setExpandedBozza(b.id) }}
                          className={`p-1.5 rounded-lg text-xs transition-all ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200"}`}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAzione(b.id, "APPROVA")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          <CheckCircle size={12} /> Approva
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleAzione(b.id, "RIGETTA")}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          <XCircle size={12} /> Rigetta
                        </button>
                      </>
                    )}
                    {b.fileDocxUrl && (
                      <a
                        href={`/api/storage?path=${encodeURIComponent(b.fileDocxUrl)}`}
                        download
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-100 hover:bg-slate-200"}`}
                      >
                        <Download size={12} /> DOCX
                      </a>
                    )}
                    {b.filePdfUrl && (
                      <a
                        href={`/api/storage?path=${encodeURIComponent(b.filePdfUrl)}`}
                        target="_blank"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                      >
                        <FileText size={12} /> PDF
                      </a>
                    )}
                  </div>

                  {isExpanded ? <ChevronUp size={16} className="opacity-40 flex-shrink-0" /> : <ChevronDown size={16} className="opacity-40 flex-shrink-0" />}
                </div>

                {/* Corpo bozza espanso */}
                {isExpanded && (
                  <div className={`border-t ${isDark ? "border-white/5" : "border-slate-100"} p-4 space-y-3`}>

                    {b.documentiUsati && b.documentiUsati.length > 0 && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                        <BookOpen size={12} />
                        <span>Template usati: {b.documentiUsati.map(d => d.nome).join(", ")}</span>
                      </div>
                    )}

                    {isEditing ? (
                      <>
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={20}
                          className={`w-full rounded-xl border p-3 text-xs font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${inputBg}`}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingBozza(null)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
                          >
                            <X size={12} /> Annulla
                          </button>
                          <button
                            onClick={() => handleSaveBozza(b.id)}
                            disabled={saving}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
                          >
                            {saving ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={12} />}
                            Salva
                          </button>
                        </div>
                      </>
                    ) : (
                      <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed p-3 rounded-xl max-h-96 overflow-y-auto ${sectionBg}`}>
                        {testoVisualizzato}
                      </pre>
                    )}

                    {b.noteOperatore && (
                      <div className={`text-xs p-2 rounded-lg ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"}`}>
                        Note: {b.noteOperatore}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
