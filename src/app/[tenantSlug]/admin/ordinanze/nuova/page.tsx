"use client"

import { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Upload, FileText, Sparkles, ChevronRight, ChevronLeft,
  CheckCircle, AlertTriangle, XCircle, Loader2, ArrowLeft,
  MapPin, Calendar, Clock, User, ClipboardList, Building2, BookOpen
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import toast from "react-hot-toast"
import type { AnalisiCompleta, Verifica } from "@/lib/ordinanza-ai"

const TIPI = [
  { key: "DIVIETO_SOSTA", label: "Divieto di Sosta", desc: "Traslochi, cantieri, eventi puntuali", color: "from-orange-500 to-amber-600", icon: "🚫" },
  { key: "CHIUSURA_STRADA", label: "Chiusura Strada", desc: "Lavori, manifestazioni, emergenze", color: "from-rose-500 to-red-600", icon: "🚧" },
  { key: "DIVIETO_E_CHIUSURA", label: "Div. Sosta + Chiusura", desc: "Misure combinate", color: "from-red-500 to-rose-700", icon: "⛔" },
  { key: "EVENTO", label: "Evento / Manifestazione", desc: "Sagre, cortei, eventi pubblici", color: "from-violet-500 to-purple-600", icon: "🎭" },
  { key: "LAVORI", label: "Lavori Stradali", desc: "Manutenzione, scavi, cantieri", color: "from-yellow-500 to-amber-600", icon: "⚙️" },
  { key: "MANIFESTAZIONE", label: "Manifestazione Pubblica", desc: "Comizi, cortei, assembramenti", color: "from-blue-500 to-indigo-600", icon: "📢" },
]

type Step = "tipo" | "testo" | "analisi" | "bozza" | "revisione"

interface BozzaData {
  id: string
  testo: string
  testoModificato: string | null
  numeroProtocollo: string | null
  stato: string
  documentiUsati: Array<{ nome: string; tipo: string }>
}

export default function NuovaOrdinanzaPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { isDark } = useTheme()
  const router = useRouter()

  const [step, setStep] = useState<Step>("tipo")
  const [tipoOrdinanza, setTipoOrdinanza] = useState("")
  const [testoRichiesta, setTestoRichiesta] = useState("")
  const [dragging, setDragging] = useState(false)

  const [requestId, setRequestId] = useState<string | null>(null)
  const [analisi, setAnalisi] = useState<AnalisiCompleta | null>(null)
  const [bozza, setBozza] = useState<BozzaData | null>(null)
  const [testoBozzaEdit, setTestoBozzaEdit] = useState("")
  const [noteOperatore, setNoteOperatore] = useState("")

  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"

  // ---- Step: Tipo ----
  const handleSelectTipo = (tipo: string) => {
    setTipoOrdinanza(tipo)
    setStep("testo")
  }

  // ---- Drag & Drop PDF ----
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // parse PDF client-side via pdf-parse is server-side only
      // qui usiamo un approccio semplice: leggiamo come testo se possibile
      toast("Caricato il PDF. Per una lettura migliore, incolla il testo estratto manualmente.", { icon: "ℹ️" })
      return
    }

    // TXT / plain text
    const text = await file.text()
    setTestoRichiesta(text)
    toast.success("File caricato!")
  }

  // ---- Step: Crea richiesta + Analisi ----
  const handleAnalizza = async () => {
    if (testoRichiesta.trim().length < 20) {
      toast.error("Inserisci un testo più dettagliato della richiesta")
      return
    }

    setLoading(true)
    setLoadingMsg("Salvataggio richiesta...")

    try {
      // 1. Crea la richiesta
      const resCreate = await fetch("/api/admin/ordinanze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoOrdinanza, testoRichiesta }),
      })
      if (!resCreate.ok) {
        const err = await resCreate.json()
        throw new Error(err.error)
      }
      const created = await resCreate.json()
      setRequestId(created.id)

      // 2. Analisi AI
      setLoadingMsg("L'agente sta analizzando la richiesta...")
      setStep("analisi")

      const resAnalisi = await fetch(`/api/admin/ordinanze/${created.id}/analizza`, {
        method: "POST",
      })
      if (!resAnalisi.ok) {
        const err = await resAnalisi.json()
        throw new Error(err.error)
      }
      const data = await resAnalisi.json()
      setAnalisi(data.analisi)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'analisi")
      setStep("testo")
    } finally {
      setLoading(false)
      setLoadingMsg("")
    }
  }

  // ---- Step: Genera Bozza ----
  const handleGeneraBozza = async () => {
    if (!requestId) return
    setLoading(true)
    setLoadingMsg("L'agente sta redigendo la bozza di ordinanza...")
    setStep("bozza")

    try {
      const res = await fetch(`/api/admin/ordinanze/${requestId}/bozza`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const data = await res.json()
      setBozza(data.bozza)
      setTestoBozzaEdit(data.bozza.testoModificato ?? data.bozza.testo)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore generazione bozza")
      setStep("analisi")
    } finally {
      setLoading(false)
      setLoadingMsg("")
    }
  }

  // ---- Step: Salva modifiche bozza ----
  const handleSalvaBozza = async () => {
    if (!requestId || !bozza) return
    setLoading(true)

    try {
      await fetch(`/api/admin/ordinanze/${requestId}/bozza/${bozza.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testoModificato: testoBozzaEdit, noteOperatore }),
      })
      setStep("revisione")
    } catch {
      toast.error("Errore nel salvataggio")
    } finally {
      setLoading(false)
    }
  }

  // ---- Approva / Rigetta ----
  const handleAzione = async (azione: "APPROVA" | "RIGETTA") => {
    if (!requestId || !bozza) return
    setLoading(true)
    setLoadingMsg(azione === "APPROVA" ? "Generazione DOCX e PDF..." : "Rigetto in corso...")

    try {
      const res = await fetch(`/api/admin/ordinanze/${requestId}/approva`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bozzaId: bozza.id, azione, note: noteOperatore }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      if (azione === "APPROVA") {
        toast.success("Ordinanza approvata! DOCX e PDF generati.")
        router.push(`/${tenantSlug}/admin/ordinanze/${requestId}`)
      } else {
        toast.success("Pratica rigettata.")
        router.push(`/${tenantSlug}/admin/ordinanze`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore")
    } finally {
      setLoading(false)
      setLoadingMsg("")
    }
  }

  const getCategoriaStyle = (cat: Verifica["categoria"]) => {
    switch (cat) {
      case "OK": return { icon: <CheckCircle size={14} className="text-emerald-400" />, bg: "bg-emerald-500/8 border-emerald-500/20", text: "text-emerald-400" }
      case "ATTENZIONE": return { icon: <AlertTriangle size={14} className="text-amber-400" />, bg: "bg-amber-500/8 border-amber-500/20", text: "text-amber-400" }
      case "MANCANTE": return { icon: <XCircle size={14} className="text-rose-400" />, bg: "bg-rose-500/8 border-rose-500/20", text: "text-rose-400" }
    }
  }

  const STEP_LABELS: Record<Step, string> = {
    tipo: "Tipo ordinanza",
    testo: "Testo richiesta",
    analisi: "Analisi AI",
    bozza: "Bozza",
    revisione: "Revisione finale",
  }
  const STEPS: Step[] = ["tipo", "testo", "analisi", "bozza", "revisione"]
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className={`p-4 sm:p-8 max-w-4xl mx-auto space-y-8 ${isDark ? "text-slate-200" : "text-slate-800"}`}>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/${tenantSlug}/admin/ordinanze`)}
          className={`p-2 rounded-xl transition-all ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-400" />
            Nuova Richiesta Ordinanza
          </h1>
          <p className="text-xs opacity-50 mt-0.5">Assistente AI — Polizia Locale</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 text-xs font-bold whitespace-nowrap ${i <= stepIdx ? "text-indigo-400" : "opacity-30"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i < stepIdx ? "bg-indigo-500 text-white" : i === stepIdx ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400" : isDark ? "bg-slate-800 text-slate-600" : "bg-slate-200 text-slate-400"}`}>
                {i < stepIdx ? "✓" : i + 1}
              </div>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < stepIdx ? "bg-indigo-500" : isDark ? "bg-slate-800" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className={`rounded-3xl border ${cardBg} p-10 text-center space-y-4`}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <Sparkles size={20} className="text-indigo-400 animate-pulse" />
          </div>
          <p className="font-bold text-indigo-400">{loadingMsg || "In elaborazione..."}</p>
          <p className="text-xs opacity-40">L&apos;agente AI sta lavorando sulla tua richiesta</p>
        </div>
      )}

      {/* STEP: TIPO */}
      {!loading && step === "tipo" && (
        <div className={`rounded-3xl border ${cardBg} p-6 space-y-6`}>
          <div>
            <h2 className="text-lg font-black">Che tipo di ordinanza devi predisporre?</h2>
            <p className="text-sm opacity-50 mt-1">Seleziona il tipo corrispondente alla richiesta ricevuta</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TIPI.map(t => (
              <button
                key={t.key}
                onClick={() => handleSelectTipo(t.key)}
                className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] group ${isDark ? "bg-slate-800/50 border-white/5 hover:border-white/15" : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-xl flex-shrink-0 shadow-lg`}>
                    {t.icon}
                  </div>
                  <div>
                    <p className="font-black text-sm">{t.label}</p>
                    <p className="text-xs opacity-50 mt-0.5">{t.desc}</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto opacity-30 group-hover:opacity-70 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: TESTO */}
      {!loading && step === "testo" && (
        <div className={`rounded-3xl border ${cardBg} p-6 space-y-6`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${TIPI.find(t => t.key === tipoOrdinanza)?.color ?? "from-indigo-500 to-violet-600"} flex items-center justify-center text-xl flex-shrink-0`}>
              {TIPI.find(t => t.key === tipoOrdinanza)?.icon}
            </div>
            <div>
              <h2 className="text-lg font-black">Inserisci il testo della richiesta</h2>
              <p className="text-sm opacity-50 mt-0.5">{TIPI.find(t => t.key === tipoOrdinanza)?.label}</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${dragging ? "border-indigo-500 bg-indigo-500/5" : isDark ? "border-white/10 hover:border-white/20" : "border-slate-300 hover:border-slate-400"}`}
          >
            <Upload size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold opacity-60">Trascina qui un file .txt</p>
            <p className="text-xs opacity-40 mt-1">oppure incolla il testo sotto</p>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={testoRichiesta}
            onChange={e => setTestoRichiesta(e.target.value)}
            rows={10}
            placeholder={`Incolla qui il testo della richiesta ricevuta...\n\nEsempio:\n"Si richiede l'istituzione del divieto di sosta in Via XX Settembre, civico 15, dalle ore 07:00 alle ore 18:00 del 25 agosto 2026, per consentire operazioni di trasloco. Richiedente: Mario Rossi."`}
            className={`w-full rounded-2xl border p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${inputBg}`}
          />

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setStep("tipo")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
            >
              <ChevronLeft size={16} /> Indietro
            </button>
            <button
              onClick={handleAnalizza}
              disabled={testoRichiesta.trim().length < 20}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              <Sparkles size={16} />
              Analizza con AI
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP: ANALISI */}
      {!loading && step === "analisi" && analisi && (
        <div className="space-y-4">
          {/* Dati estratti */}
          <div className={`rounded-3xl border ${cardBg} p-6 space-y-5`}>
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" />
              <h2 className="text-lg font-black">Dati estratti dalla richiesta</h2>
              <span className={`ml-auto px-2 py-0.5 rounded-lg text-xs font-black ${analisi.analisi.confidenza >= 75 ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                Confidenza {analisi.analisi.confidenza}%
              </span>
            </div>

            <p className={`text-sm p-3 rounded-xl italic ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
              &ldquo;{analisi.riassunto}&rdquo;
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: <User size={14} />, label: "Richiedente", value: analisi.analisi.richiedente },
                { icon: <MapPin size={14} />, label: "Via / Luogo", value: [analisi.analisi.via, analisi.analisi.civico].filter(Boolean).join(", ") || null },
                { icon: <Building2 size={14} />, label: "Comune", value: analisi.analisi.comune },
                { icon: <Calendar size={14} />, label: "Data inizio", value: analisi.analisi.dataInizio },
                { icon: <Calendar size={14} />, label: "Data fine", value: analisi.analisi.dataFine },
                { icon: <Clock size={14} />, label: "Orario", value: analisi.analisi.oraDalle && analisi.analisi.oraAlle ? `${analisi.analisi.oraDalle} – ${analisi.analisi.oraAlle}` : null },
                { icon: <ClipboardList size={14} />, label: "Motivazione", value: analisi.analisi.motivazione },
                { icon: <FileText size={14} />, label: "Misure richieste", value: analisi.analisi.misureRichieste.join(", ") || null },
              ].map(field => (
                <div key={field.label} className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? "bg-slate-800/50" : "bg-slate-50"}`}>
                  <span className="opacity-50 mt-0.5 flex-shrink-0">{field.icon}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-40">{field.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${!field.value ? "opacity-30 italic" : ""}`}>
                      {field.value ?? "Non rilevato"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist verifiche */}
          <div className={`rounded-3xl border ${cardBg} p-6 space-y-4`}>
            <h3 className="font-black flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Verifiche necessarie
            </h3>
            <div className="space-y-2">
              {analisi.verifiche.map(v => {
                const style = getCategoriaStyle(v.categoria)
                return (
                  <div key={v.id} className={`flex items-center gap-3 p-3 rounded-xl border ${style.bg}`}>
                    {style.icon}
                    <span className={`text-sm font-medium ${style.text}`}>{v.descrizione}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setStep("testo")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
            >
              <ChevronLeft size={16} /> Modifica testo
            </button>
            <button
              onClick={handleGeneraBozza}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              <FileText size={16} />
              Genera Bozza Ordinanza
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP: BOZZA */}
      {!loading && step === "bozza" && bozza && (
        <div className="space-y-4">
          <div className={`rounded-3xl border ${cardBg} p-6 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                Bozza Ordinanza
              </h2>
              {bozza.numeroProtocollo && (
                <span className={`px-3 py-1 rounded-xl text-xs font-mono font-black ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                  {bozza.numeroProtocollo}
                </span>
              )}
            </div>

            {bozza.documentiUsati && bozza.documentiUsati.length > 0 && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${isDark ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                <BookOpen size={12} />
                <span>Basato su: {bozza.documentiUsati.map(d => d.nome).join(", ")}</span>
              </div>
            )}

            <p className="text-xs opacity-50">Modifica liberamente il testo prima di approvare:</p>

            <textarea
              value={testoBozzaEdit}
              onChange={e => setTestoBozzaEdit(e.target.value)}
              rows={20}
              className={`w-full rounded-2xl border p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${inputBg}`}
            />

            <textarea
              value={noteOperatore}
              onChange={e => setNoteOperatore(e.target.value)}
              rows={2}
              placeholder="Note operative per l'operatore (opzionale)..."
              className={`w-full rounded-xl border p-3 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${inputBg}`}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setStep("analisi")}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
            >
              <ChevronLeft size={16} /> Indietro
            </button>
            <button
              onClick={handleSalvaBozza}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              Procedi alla revisione
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP: REVISIONE */}
      {!loading && step === "revisione" && bozza && (
        <div className="space-y-4">
          <div className={`rounded-3xl border ${cardBg} p-6 space-y-5`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
                <CheckCircle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black">Revisione finale</h2>
                <p className="text-sm opacity-50">Approva per generare il documento ufficiale</p>
              </div>
            </div>

            {/* Anteprima testo finale */}
            <div className={`rounded-2xl border p-4 max-h-80 overflow-y-auto ${isDark ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200"}`}>
              <pre className="text-xs font-mono whitespace-pre-wrap opacity-80 leading-relaxed">
                {testoBozzaEdit}
              </pre>
            </div>

            {noteOperatore && (
              <div className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-400">Note operative</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">{noteOperatore}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAzione("RIGETTA")}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent text-sm font-bold rounded-xl transition-all"
              >
                <XCircle size={16} />
                Rigetta
              </button>
              <button
                onClick={() => handleAzione("APPROVA")}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
              >
                <CheckCircle size={16} />
                Approva e Genera Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
