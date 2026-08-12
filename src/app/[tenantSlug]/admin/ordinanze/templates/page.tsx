"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, BookOpen, Trash2, Edit3, Save, X,
  FileText, ChevronDown, ChevronUp, AlertTriangle, CheckCircle
} from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import toast from "react-hot-toast"

const TIPI_TEMPLATE = [
  { key: "DIVIETO_SOSTA", label: "Divieto di Sosta", emoji: "🚫" },
  { key: "CHIUSURA_STRADA", label: "Chiusura Strada", emoji: "🚧" },
  { key: "DIVIETO_E_CHIUSURA", label: "Div. Sosta + Chiusura", emoji: "⛔" },
  { key: "EVENTO", label: "Evento / Manifestazione", emoji: "🎭" },
  { key: "LAVORI", label: "Lavori Stradali", emoji: "⚙️" },
  { key: "MANIFESTAZIONE", label: "Manifestazione Pubblica", emoji: "📢" },
  { key: "GENERICO", label: "Generico (tutti i tipi)", emoji: "📄" },
]

type Template = {
  id: string
  nome: string
  tipo: string
  descrizione: string | null
  contenuto: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
}

const TEMPLATE_VUOTO_DIVIETO_SOSTA = `COMUNE DI [NOME COMUNE]
POLIZIA LOCALE — COMANDO

ORDINANZA N. [NUMERO_PROGRESSIVO]

OGGETTO: Istituzione divieto di sosta temporaneo in [VIA] — [DATA]

IL RESPONSABILE DEL COMANDO

PREMESSO CHE
  - in data [DATA] è pervenuta istanza da parte di [RICHIEDENTE], con la quale si richiedeva l'istituzione di un divieto di sosta temporaneo nella via sotto specificata per le esigenze di seguito indicate;
  - la misura si rende necessaria per consentire [MOTIVAZIONE];

VISTO
  - il D.Lgs. 30 aprile 1992, n. 285 (Codice della Strada) e in particolare gli artt. 5, 6 e 7;
  - il D.P.R. 16 dicembre 1992, n. 495 (Regolamento di Esecuzione del Codice della Strada);
  - la Legge 7 agosto 1990, n. 241 e successive modifiche;

CONSIDERATO
  - che la misura richiesta è compatibile con le condizioni della viabilità locale;
  - che è necessario garantire la sicurezza della circolazione stradale durante le operazioni di [MOTIVAZIONE];

ORDINA

  Art. 1 — DIVIETO DI SOSTA
  È istituito il divieto di sosta con rimozione coatta in [VIA], nel tratto compreso [TRATTO], nelle seguenti fasce orarie:
  Data: [DATA_INIZIO] — [DATA_FINE]
  Orario: dalle ore [ORA_DALLE] alle ore [ORA_ALLE]

  Art. 2 — SEGNALETICA
  Il richiedente [RICHIEDENTE] è tenuto a provvedere all'istallazione della prescritta segnaletica verticale temporanea, in conformità al D.P.R. 495/1992.

  Art. 3 — TRASGRESSORI
  I trasgressori alle prescrizioni della presente ordinanza sono soggetti alle sanzioni previste dall'art. 7 del D.Lgs. 285/1992 e successive modifiche.

  Art. 4 — DECORRENZA
  La presente ordinanza ha efficacia limitata al periodo indicato all'Art. 1.

IL RESPONSABILE DEL PROCEDIMENTO
________________________________

[NOME COMUNE], [DATA_FIRMA]
`

const TEMPLATE_VUOTO_CHIUSURA = `COMUNE DI [NOME COMUNE]
POLIZIA LOCALE — COMANDO

ORDINANZA N. [NUMERO_PROGRESSIVO]

OGGETTO: Chiusura temporanea della circolazione in [VIA] — [DATA]

IL RESPONSABILE DEL COMANDO

PREMESSO CHE
  - in data [DATA] è pervenuta istanza da parte di [RICHIEDENTE], con la quale si richiedeva la chiusura temporanea al traffico veicolare della via sotto indicata;
  - la misura si rende necessaria al fine di [MOTIVAZIONE];

VISTO
  - il D.Lgs. 30 aprile 1992, n. 285 (Codice della Strada) e in particolare gli artt. 5, 6 e 7;
  - il D.P.R. 16 dicembre 1992, n. 495 (Regolamento di Esecuzione del Codice della Strada);
  - la Legge 7 agosto 1990, n. 241 e successive modifiche;

CONSIDERATO
  - che la chiusura della strada è necessaria per garantire la sicurezza pubblica durante [MOTIVAZIONE];
  - che è stata valutata la viabilità alternativa per il traffico deviato;

ORDINA

  Art. 1 — CHIUSURA TEMPORANEA
  È disposta la chiusura temporanea al traffico veicolare di [VIA], nel tratto compreso tra [TRATTO], nei seguenti periodi:
  Data: [DATA_INIZIO] — [DATA_FINE]
  Orario: dalle ore [ORA_DALLE] alle ore [ORA_ALLE]
  Sono esclusi dal divieto i residenti, i mezzi di emergenza e i mezzi autorizzati.

  Art. 2 — DEVIAZIONE DEL TRAFFICO
  Il traffico veicolare sarà deviato su [PERCORSO ALTERNATIVO] secondo la segnaletica appositamente installata.

  Art. 3 — SEGNALETICA
  Il richiedente [RICHIEDENTE] è tenuto a provvedere all'istallazione della prescritta segnaletica verticale e orizzontale temporanea, in conformità al D.P.R. 495/1992.

  Art. 4 — TRASGRESSORI
  I trasgressori alle prescrizioni della presente ordinanza sono soggetti alle sanzioni previste dall'art. 7 del D.Lgs. 285/1992.

  Art. 5 — DECORRENZA
  La presente ordinanza ha efficacia limitata al periodo indicato all'Art. 1.

IL RESPONSABILE DEL PROCEDIMENTO
________________________________

[NOME COMUNE], [DATA_FIRMA]
`

export default function OrdinanzeTemplatePage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { isDark } = useTheme()
  const router = useRouter()

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nome: "",
    tipo: "DIVIETO_SOSTA",
    descrizione: "",
    contenuto: "",
  })

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/ordinanze/templates")
      if (res.ok) setTemplates(await res.json())
    } catch { toast.error("Errore caricamento template") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleSubmit = async () => {
    if (!form.nome.trim() || !form.contenuto.trim()) {
      toast.error("Nome e contenuto sono obbligatori")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/ordinanze/templates/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success("Template aggiornato")
      } else {
        const res = await fetch("/api/admin/ordinanze/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        if (!res.ok) throw new Error()
        toast.success("Template aggiunto")
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ nome: "", tipo: "DIVIETO_SOSTA", descrizione: "", contenuto: "" })
      fetchTemplates()
    } catch { toast.error("Errore nel salvataggio") }
    finally { setSaving(false) }
  }

  const handleEdit = (t: Template) => {
    setForm({ nome: t.nome, tipo: t.tipo, descrizione: t.descrizione ?? "", contenuto: t.contenuto })
    setEditingId(t.id)
    setShowForm(true)
    setExpandedId(null)
  }

  const handleDelete = async (id: string, isDefault: boolean) => {
    if (isDefault) { toast.error("Impossibile eliminare un template di sistema"); return }
    if (!confirm("Eliminare questo template?")) return
    try {
      const res = await fetch(`/api/admin/ordinanze/templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Template eliminato")
      fetchTemplates()
    } catch { toast.error("Errore eliminazione") }
  }

  const useStarterTemplate = (tipo: "DIVIETO" | "CHIUSURA") => {
    const contenuto = tipo === "DIVIETO" ? TEMPLATE_VUOTO_DIVIETO_SOSTA : TEMPLATE_VUOTO_CHIUSURA
    const nomeBase = tipo === "DIVIETO" ? "Divieto di Sosta — Template Base" : "Chiusura Strada — Template Base"
    const tipoKey = tipo === "DIVIETO" ? "DIVIETO_SOSTA" : "CHIUSURA_STRADA"
    setForm({ nome: nomeBase, tipo: tipoKey, descrizione: "Template di partenza — personalizza con le ordinanze reali del Comando", contenuto })
    setShowForm(true)
    setEditingId(null)
  }

  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const selectBg = isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"

  const byTipo = TIPI_TEMPLATE.map(t => ({
    ...t,
    templates: templates.filter(tmpl => tmpl.tipo === t.key),
  })).filter(t => t.templates.length > 0 || !showForm)

  return (
    <div className={`p-4 sm:p-8 max-w-5xl mx-auto space-y-6 ${isDark ? "text-slate-200" : "text-slate-800"}`}>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/${tenantSlug}/admin/ordinanze`)}
          className={`p-2 rounded-xl transition-all ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-400" />
            Modulistica e Template
          </h1>
          <p className="text-xs opacity-50 mt-0.5">Ordinanze di riferimento — usate dall&apos;agente AI per generare le bozze</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ nome: "", tipo: "DIVIETO_SOSTA", descrizione: "", contenuto: "" }) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
        >
          <Plus size={16} />
          Aggiungi Template
        </button>
      </div>

      {/* Info box */}
      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${isDark ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"}`}>
        <AlertTriangle size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className={`font-bold ${isDark ? "text-indigo-300" : "text-indigo-800"}`}>Come funziona la Modulistica</p>
          <p className={`text-xs mt-1 opacity-80 ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>
            Carica le ordinanze reali già emesse dal Comando (anche anonimizzate). L&apos;agente AI le studierà e userà il vostro stile per generare le nuove bozze.
            Più ordinanze reali carichi, migliore sarà la qualità delle bozze generate.
          </p>
        </div>
      </div>

      {/* Starter templates vuoti */}
      {templates.length === 0 && !showForm && (
        <div className={`rounded-2xl border ${cardBg} p-6 space-y-4`}>
          <h3 className="font-black flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            Nessun template caricato
          </h3>
          <p className="text-sm opacity-60">Puoi partire dai template base predefiniti e personalizzarli con le ordinanze reali del Comando:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => useStarterTemplate("DIVIETO")}
              className={`p-4 rounded-xl border text-left transition-all hover:border-orange-500/30 ${isDark ? "bg-slate-800/50 border-white/5" : "bg-slate-50 border-slate-200"}`}
            >
              <span className="text-2xl">🚫</span>
              <p className="font-black text-sm mt-2">Template Divieto di Sosta</p>
              <p className="text-xs opacity-50 mt-0.5">Struttura base conforme al CdS</p>
            </button>
            <button
              onClick={() => useStarterTemplate("CHIUSURA")}
              className={`p-4 rounded-xl border text-left transition-all hover:border-rose-500/30 ${isDark ? "bg-slate-800/50 border-white/5" : "bg-slate-50 border-slate-200"}`}
            >
              <span className="text-2xl">🚧</span>
              <p className="font-black text-sm mt-2">Template Chiusura Strada</p>
              <p className="text-xs opacity-50 mt-0.5">Struttura base conforme al CdS</p>
            </button>
          </div>
        </div>
      )}

      {/* Form aggiunta/modifica */}
      {showForm && (
        <div className={`rounded-2xl border ${cardBg} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-black">
              {editingId ? "Modifica template" : "Nuovo template / Ordinanza di riferimento"}
            </h3>
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className={`p-1.5 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase opacity-50">Nome *</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Es: Ordinanza n.45/2025 — Divieto Sosta"
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase opacity-50">Tipo *</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${selectBg}`}
              >
                {TIPI_TEMPLATE.map(t => (
                  <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase opacity-50">Descrizione (opzionale)</label>
            <input
              value={form.descrizione}
              onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              placeholder="Es: Ordinanza per trasloco, anno 2025"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase opacity-50">
              Testo ordinanza * — <span className="text-indigo-400 normal-case font-normal">Incolla il testo completo dell&apos;ordinanza reale</span>
            </label>
            <textarea
              value={form.contenuto}
              onChange={e => setForm(f => ({ ...f, contenuto: e.target.value }))}
              rows={16}
              placeholder="Incolla qui il testo completo dell'ordinanza. L'agente AI la studierà e replicherà il vostro stile nelle nuove bozze."
              className={`w-full px-3 py-3 rounded-xl border text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-indigo-500 ${inputBg}`}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => { setShowForm(false); setEditingId(null) }}
              className={`px-4 py-2.5 text-sm font-bold rounded-xl ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
            >
              Annulla
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
              {editingId ? "Salva modifiche" : "Aggiungi template"}
            </button>
          </div>
        </div>
      )}

      {/* Lista template per tipo */}
      {loading ? (
        <div className="text-center p-10 opacity-50">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Caricamento template...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byTipo.map(gruppo => (
            <div key={gruppo.key} className={`rounded-2xl border ${cardBg} overflow-hidden`}>
              <div className={`px-5 py-3 flex items-center gap-2 ${isDark ? "bg-slate-800/50" : "bg-slate-50"}`}>
                <span className="text-lg">{gruppo.emoji}</span>
                <span className="font-black text-sm">{gruppo.label}</span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${isDark ? "bg-slate-700 text-slate-400" : "bg-slate-200 text-slate-600"}`}>
                  {gruppo.templates.length}
                </span>
              </div>

              {gruppo.templates.length === 0 ? (
                <p className="p-4 text-xs opacity-40 italic">Nessun template per questo tipo. Aggiungine uno!</p>
              ) : (
                <div className={`divide-y ${isDark ? "divide-white/5" : "divide-slate-100"}`}>
                  {gruppo.templates.map(t => (
                    <div key={t.id}>
                      <div
                        className={`px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{t.nome}</span>
                            {t.isDefault && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${isDark ? "bg-blue-500/15 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                                Sistema
                              </span>
                            )}
                          </div>
                          {t.descrizione && <p className="text-xs opacity-40 mt-0.5">{t.descrizione}</p>}
                          <p className="text-xs opacity-30 mt-0.5">{t.contenuto.length} caratteri</p>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(t)}
                            className={`p-1.5 rounded-lg text-xs transition-all ${isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"}`}
                          >
                            <Edit3 size={13} />
                          </button>
                          {!t.isDefault && (
                            <button
                              onClick={() => handleDelete(t.id, t.isDefault)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {expandedId === t.id ? <ChevronUp size={14} className="opacity-40" /> : <ChevronDown size={14} className="opacity-40" />}
                      </div>

                      {expandedId === t.id && (
                        <div className={`px-5 pb-4 border-t ${isDark ? "border-white/5 bg-slate-950/30" : "border-slate-100 bg-slate-50/50"}`}>
                          <pre className="text-[11px] font-mono whitespace-pre-wrap leading-relaxed opacity-70 max-h-60 overflow-y-auto pt-3">
                            {t.contenuto}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {templates.length > 0 && (
            <div className={`rounded-2xl border p-4 flex items-center gap-3 ${isDark ? "bg-emerald-500/8 border-emerald-500/15" : "bg-emerald-50 border-emerald-200"}`}>
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-400">
                <strong>{templates.length} template</strong> disponibili — l&apos;agente AI li userà come riferimento per le nuove bozze.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
