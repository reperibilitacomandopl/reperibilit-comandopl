"use client"

import { useState } from "react"
import { X, Clock, AlertTriangle, Check } from "lucide-react"

interface ClockOutModalProps {
  type: "OVERTIME" | "EARLY_EXIT" | "LATE_IN"
  plannedEndTime: string
  diffMins: number
  onConfirm: (data: { code: string; notes: string; actualEndTimeStr?: string; actualStartTimeStr?: string }) => void
  onCancel: () => void
  onCorrectionOnly?: () => void
}

// Codici Straordinario
const OVERTIME_OPTIONS = [
  { code: "STR_EXTRA", label: "Straordinario / Prolungamento" },
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

// Codici Giustificazione Ritardo
const LATE_OPTIONS = [
  { code: "0008", label: "Recupero Ore (Banca Ore)" },
  { code: "0014", label: "Particolari Motivi Personali/Familiari" },
  { code: "0032", label: "Permesso Visita Medica" },
  { code: "104_1H", label: "Permesso L.104/92 (Ore)" },
  { code: "0005", label: "Permesso Istituzionale Retribuito" }
]

export function ClockOutModal({ type, plannedEndTime, diffMins, onConfirm, onCancel, onCorrectionOnly }: ClockOutModalProps) {
  const isOvertime = type === "OVERTIME"
  const isLateIn = type === "LATE_IN"
  
  const options = isOvertime 
    ? OVERTIME_OPTIONS 
    : isLateIn 
      ? LATE_OPTIONS 
      : RECOVERY_OPTIONS
  
  const [selectedCode, setSelectedCode] = useState(options[0].code)
  const [notes, setNotes] = useState("")
  const [actualTime, setActualTime] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) return // Prevenuto dal required HTML, ma doppio controllo
    
    if (isLateIn) {
      onConfirm({
        code: selectedCode,
        notes: notes.trim(),
        actualStartTimeStr: actualTime.trim() || undefined
      })
    } else {
      onConfirm({
        code: selectedCode,
        notes: notes.trim(),
        actualEndTimeStr: actualTime.trim() || undefined
      })
    }
  }

  // Seleziona il gradiente dell'header in base al tipo di anomalia
  const headerGradient = isOvertime
    ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-500/20"
    : isLateIn
      ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-red-500/20"
      : "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[1.8rem] shadow-2xl max-w-sm w-full border border-slate-200/80 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header - Compact */}
        <div className={`p-4 text-white shrink-0 ${headerGradient}`}>
          <div className="flex justify-between items-center mb-2">
            <div className="p-2 bg-white/25 rounded-xl backdrop-blur-md">
              <Clock className="w-5 h-5" />
            </div>
            <button onClick={onCancel} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-black tracking-tight leading-tight">
            {isOvertime 
              ? "Fine Turno Rilevata" 
              : isLateIn 
                ? "Ingresso in Ritardo" 
                : "Uscita Anticipata"
            }
          </h2>
          <p className="text-white/90 text-[11px] font-bold mt-1 leading-snug">
            {isOvertime 
              ? `Sei in ritardo di ${Math.abs(diffMins)} min rispetto alla fine turno (${plannedEndTime}).`
              : isLateIn
                ? `Sei in ritardo di ${Math.abs(diffMins)} min rispetto all'inizio turno (${plannedEndTime}).`
                : `Stai uscendo ${Math.abs(diffMins)} min prima della fine turno (${plannedEndTime}).`
            }
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-3.5">
          {/* Tipologia */}
          <div>
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1 block">
              {isOvertime 
                ? "Tipologia Straordinario" 
                : isLateIn 
                  ? "Giustificazione Ritardo" 
                  : "Modalità di Recupero"
              }
            </label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className={`w-full p-2.5 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 outline-none transition-colors
                ${isOvertime 
                  ? 'focus:border-amber-500 focus:bg-amber-50/30' 
                  : isLateIn
                    ? 'focus:border-rose-500 focus:bg-rose-50/30'
                    : 'focus:border-blue-500 focus:bg-blue-50/30'}`}
              required
            >
              {options.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Orario Effettivo */}
          <div>
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1 block">
              {isLateIn 
                ? "Orario Effettivo di Ingresso (Opzionale)" 
                : "Orario Effettivo di Uscita (Opzionale)"
              }
            </label>
            <input 
              type="time" 
              value={actualTime}
              onChange={(e) => setActualTime(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 outline-none transition-colors focus:border-slate-400"
            />
            <p className="text-[9px] text-slate-400 mt-1 font-semibold px-0.5">
              Lascia vuoto per usare l'orario attuale.
            </p>
          </div>

          {/* Motivazione */}
          <div>
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1 block">
              Motivazione (Obbligatoria)
            </label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isOvertime 
                ? "es. Intervento prolungato..." 
                : isLateIn
                  ? "es. Traffico o imprevisto stradale..."
                  : "es. Visita medica o permesso..."
              }
              className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 outline-none transition-colors focus:border-slate-400"
              required
            />
          </div>

          <div className="pt-1 flex flex-col gap-2 shrink-0">
            <button 
              type="submit"
              className={`w-full py-3 text-white font-black text-xs rounded-xl shadow-md transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5
                ${isOvertime 
                  ? 'bg-amber-500 hover:bg-amber-600' 
                  : isLateIn
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Check className="w-4 h-4" />
              Conferma Registrazione
            </button>

            {onCorrectionOnly && (
              <button 
                type="button"
                onClick={onCorrectionOnly}
                className="w-full py-2 text-slate-500 font-bold text-[10px] hover:bg-slate-50 rounded-lg transition-colors border border-slate-100 flex items-center justify-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {isLateIn 
                  ? "Registra ingresso senza giustificazione" 
                  : "Registra uscita senza straordinario"
                }
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  )
}
