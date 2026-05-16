"use client"

import { useState } from "react"
import { X, Clock, AlertTriangle, Check } from "lucide-react"

interface ClockOutModalProps {
  type: "OVERTIME" | "EARLY_EXIT"
  plannedEndTime: string
  diffMins: number
  onConfirm: (data: { code: string; notes: string; actualEndTimeStr?: string }) => void
  onCancel: () => void
  onCorrectionOnly?: () => void
}

// Codici Straordinario
const OVERTIME_OPTIONS = [
  { code: "STR_EXTRA", label: "Straordinario Ordinario / Prolungamento" },
  { code: "2020", label: "Elezioni - Straordinario Elettorale" },
  { code: "2050", label: "Ordine Pubblico (A.O.)" },
  { code: "2026", label: "Stato Civile" },
  { code: "10001", label: "Stato Civile Notturno" }
]

// Codici Recupero Ore
const RECOVERY_OPTIONS = [
  { code: "0008", label: "Recupero Ore Eccedenti (Banca Ore)" },
  { code: "0009", label: "Recupero A.O." },
  { code: "0081", label: "Recupero Ore Straord. Elettorale" },
  { code: "0067", label: "Recupero Ore Corsi" }
]

export function ClockOutModal({ type, plannedEndTime, diffMins, onConfirm, onCancel, onCorrectionOnly }: ClockOutModalProps) {
  const isOvertime = type === "OVERTIME"
  const options = isOvertime ? OVERTIME_OPTIONS : RECOVERY_OPTIONS
  
  const [selectedCode, setSelectedCode] = useState(options[0].code)
  const [notes, setNotes] = useState("")
  const [actualTime, setActualTime] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) return // Prevenuto dal required HTML, ma doppio controllo
    onConfirm({
      code: selectedCode,
      notes: notes.trim(),
      actualEndTimeStr: actualTime.trim() || undefined
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95">
        
        {/* Header */}
        <div className={`p-6 text-white ${isOvertime ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Clock className="w-8 h-8" />
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-1">
            {isOvertime ? "Fine Turno Rilevata" : "Uscita Anticipata Rilevata"}
          </h2>
          <p className="text-white/80 text-sm font-medium">
            {isOvertime 
              ? `Sei in ritardo di circa ${Math.abs(diffMins)} minuti rispetto alla fine turno ufficiale (${plannedEndTime}).`
              : `Stai uscendo circa ${Math.abs(diffMins)} minuti prima della fine turno ufficiale (${plannedEndTime}).`
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipologia */}
          <div>
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">
              {isOvertime ? "Tipologia Straordinario" : "Modalità di Recupero"}
            </label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className={`w-full p-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none transition-colors
                ${isOvertime ? 'focus:border-amber-500 focus:bg-amber-50/50' : 'focus:border-blue-500 focus:bg-blue-50/50'}`}
              required
            >
              {options.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Orario Effettivo */}
          <div>
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">
              Orario Effettivo di Uscita (Opzionale)
            </label>
            <input 
              type="time" 
              value={actualTime}
              onChange={(e) => setActualTime(e.target.value)}
              className="w-full p-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium px-1">
              Lascia vuoto per usare l'orario attuale.
            </p>
          </div>

          {/* Motivazione */}
          <div>
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1.5 block">
              Motivazione (Obbligatoria)
            </label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isOvertime ? "es. Intervento per incidente..." : "es. Permesso visita medica..."}
              className="w-full p-3.5 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none transition-colors focus:border-slate-400"
              required
            />
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button 
              type="submit"
              className={`w-full py-4 text-white font-black rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2
                ${isOvertime ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
            >
              <Check className="w-5 h-5" />
              Conferma Registrazione
            </button>

            {isOvertime && onCorrectionOnly && (
              <button 
                type="button"
                onClick={onCorrectionOnly}
                className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors border-2 border-transparent hover:border-slate-200 flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Registra uscita senza straordinario
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  )
}
