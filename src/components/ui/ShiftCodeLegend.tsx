"use client"

import { useState } from "react"
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react"

const SHIFT_CODES = [
  { code: "M7", label: "Mattina (07:00)", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { code: "M8", label: "Mattina (08:00)", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { code: "P14", label: "Pomeriggio (14:00)", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { code: "P13", label: "Pomeriggio (13:00)", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { code: "RP", label: "Riposo Programmato", color: "bg-red-100 text-red-700 border-red-200" },
  { code: "RR", label: "Riposo Recupero", color: "bg-red-50 text-red-600 border-red-100" },
  { code: "REP_F", label: "Reperibilità Feriale", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { code: "REP_P", label: "Reperibilità Prefestiva", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { code: "REP_FE", label: "Reperibilità Festiva", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { code: "0015", label: "Ferie", color: "bg-amber-50 text-amber-700 border-amber-100" },
  { code: "0016", label: "Festività Soppresse", color: "bg-amber-50 text-amber-700 border-amber-100" },
  { code: "0008", label: "Recupero Ore", color: "bg-teal-50 text-teal-700 border-teal-100" },
  { code: "0003", label: "Malattia", color: "bg-rose-50 text-rose-700 border-rose-100" },
  { code: "0104", label: "Legge 104", color: "bg-violet-50 text-violet-700 border-violet-100" },
]

export default function ShiftCodeLegend() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <BookOpen size={16} className="text-indigo-600" />
          </div>
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Legenda Codici Turno</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {SHIFT_CODES.map(sc => (
              <div key={sc.code} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${sc.color}`}>
                <span className="font-mono font-black text-xs min-w-[40px]">{sc.code}</span>
                <span className="text-[10px] font-bold truncate">{sc.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
