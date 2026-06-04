"use client"

import React, { useState, useEffect, useRef } from "react"
import { Search, Sparkles, FileText, Check } from "lucide-react"

interface CdsViolationSearchProps {
  onSelect: (violation: any) => void
  disabled?: boolean
  initialText?: string
  initialArticolo?: string
  apiEndpoint?: string
}

export default function CdsViolationSearch({
  onSelect,
  disabled,
  initialText,
  initialArticolo,
  apiEndpoint = "/api/agent/violations/search"
}: CdsViolationSearchProps) {
  const [searchArticolo, setSearchArticolo] = useState(initialArticolo || "")
  const [nlpText, setNlpText] = useState(initialText || "")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const autoSearched = useRef(false)

  useEffect(() => {
    if (!autoSearched.current && (initialText || initialArticolo)) {
      autoSearched.current = true
      // Delay to let the component mount before searching
      const t = setTimeout(() => searchNLP(initialText, initialArticolo), 300)
      return () => clearTimeout(t)
    }
  }, [initialText, initialArticolo])

  const searchNLP = async (text?: string, articolo?: string) => {
    const t = text ?? nlpText
    const a = articolo ?? searchArticolo
    if (!t && !a) return
    setAiLoading(true)
    setSearched(true)
    setAiResults([])
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testo: t, articolo: a })
      })

      if (res.ok) {
        const data = await res.json()
        setAiResults(data.risultati || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSelect = (result: any) => {
    setSelected(result)
    setAiResults([])
    setSearched(false)
    onSelect(result)
  }

  return (
    <div className="space-y-3 relative w-full">
      <label className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles size={14} /> Ricerca Violazione (C.d.S.)
      </label>

      <div className="flex gap-2 w-full">
        <input
          type="text"
          value={searchArticolo}
          onChange={e => setSearchArticolo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchNLP())}
          className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-500/30 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-blue-100 placeholder:text-slate-400 dark:placeholder:text-blue-200/30 shadow-sm"
          placeholder="Art."
          disabled={disabled}
        />
        <input
          type="text"
          value={nlpText}
          onChange={e => setNlpText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchNLP())}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-blue-500/30 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-blue-100 placeholder:text-slate-400 dark:placeholder:text-blue-200/30 shadow-sm"
          placeholder="Es. Guidava al cellulare..."
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => searchNLP()}
          disabled={disabled || aiLoading || (nlpText.length < 3 && searchArticolo.length === 0)}
          className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all shadow-sm"
        >
          {aiLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}
        </button>
      </div>

      {/* AI Results Dropdown */}
      {searched && aiResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] max-h-80 overflow-y-auto animate-in slide-in-from-top-2 overflow-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/20">
          {aiResults.map((res, i) => (
            <button
              key={res.id}
              type="button"
              onClick={() => handleSelect(res)}
              className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-start gap-3 ${i !== aiResults.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}
            >
              <div className="p-2 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 mt-1">
                <FileText size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black text-slate-900 dark:text-white">Art. {res.articolo?.articolo}</span>
                  {res.comma && <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300">Comma {res.comma}</span>}
                  {res.codice && <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-500/20 text-[10px] font-bold text-rose-600 dark:text-rose-300">EGAF {res.codice}</span>}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{res.descrizione}</p>
                <div className="flex gap-3 mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>€ {res.sanzione}</span>
                  {res.puntiPatente > 0 && <span className="text-rose-500">-{res.puntiPatente} Punti</span>}
                  {(res.sospensione || res.fermo || res.sanzioneAccessoria) && (
                    <span className="text-amber-500">Sanzioni Accessorie</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {searched && aiResults.length === 0 && !aiLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-rose-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 text-sm text-center text-rose-600 dark:text-rose-300 z-10">
          Nessuna corrispondenza trovata. Riprova con altre parole chiave.
        </div>
      )}

      {selected && !searched && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-start gap-3 mt-2">
          <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">Art. {selected.articolo?.articolo} {selected.comma ? `Comma ${selected.comma}` : ""}</p>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 mt-1 line-clamp-2">{selected.descrizione}</p>
          </div>
        </div>
      )}
    </div>
  )
}
