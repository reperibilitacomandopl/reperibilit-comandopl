"use client"

import React from "react"
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  RotateCcw, Sparkles, Wand2, GraduationCap, Copy, ClipboardPaste 
} from "lucide-react"

interface ServiceManagerToolbarProps {
  currentDate: Date
  changeDate: (days: number) => void
  goToToday: () => void
  isToday: () => boolean
  loading: boolean
  isAutoAssigning: boolean
  autoGenerate: () => Promise<void>
  handleAutoSchools: () => Promise<void>
  handleAIResolve: () => Promise<void>
  setShowResetConfirm: (show: boolean) => void
  copiedDay: any | null
  copyDay: () => void
  pasteDay: () => Promise<void>
  onClose?: () => void
  patrolSelectionSize: number
  createPatrolFromSelection: () => Promise<void>
  tenantSlug: string
}

export default function ServiceManagerToolbar({
  currentDate,
  changeDate,
  goToToday,
  isToday,
  loading,
  isAutoAssigning,
  autoGenerate,
  handleAutoSchools,
  handleAIResolve,
  setShowResetConfirm,
  copiedDay,
  copyDay,
  pasteDay,
  onClose,
  patrolSelectionSize,
  createPatrolFromSelection,
  tenantSlug
}: ServiceManagerToolbarProps) {
  return (
    <div className="bg-[#0f172a] text-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 border-b border-slate-800 z-20 shadow-2xl">
      <div className="flex items-center gap-4 mb-3 sm:mb-0">
        <div className="bg-blue-600 p-2 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          <CalendarIcon className="text-white" width={24} height={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">SALA OPERATIVA</h1>
          <p className="text-[10px] sm:text-xs text-slate-300 font-bold tracking-widest uppercase">Pianificazione OdS e Pattuglie
            {copiedDay && <span className="ml-2 text-indigo-400">• OdS copiato da {copiedDay.date}</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* DATE NAV */}
        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 shadow-inner">
          <button onClick={() => changeDate(-1)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Giorno Precedente (o tasto ←)">
            <ChevronLeft width={20} height={20} />
          </button>
          <div className="px-4 flex flex-col items-center min-w-[140px]">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">
              {currentDate.toLocaleDateString('it-IT', { weekday: 'long' })}
            </span>
            <span className="text-sm font-black text-white tabular-nums">
              {currentDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button onClick={() => changeDate(1)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white" title="Giorno Successivo (o tasto →)">
            <ChevronRight width={20} height={20} />
          </button>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
          {!isToday() && (
            <button 
              onClick={goToToday}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all font-bold text-xs uppercase"
              title="Torna a Oggi"
            >
              Oggi
            </button>
          )}

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

          {/* AI / AUTO ACTION */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleAutoSchools}
              disabled={isAutoAssigning}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-amber-900/20"
              title="Abbina automaticamente gli agenti alle scuole in base ai turni e alla vicinanza residenza (Beta)"
            >
              <GraduationCap width={14} height={14} /> 
              {isAutoAssigning ? "Elaborazione..." : "Scuole"}
            </button>

            <button 
              onClick={autoGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
              title="Generazione Matematica: Un Ufficiale per turno + coperture minime basate su algoritmo equità"
            >
              <Wand2 width={14} height={14} /> Auto-OdS
            </button>

            <button 
              onClick={handleAIResolve}
              disabled={loading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-indigo-900/20"
              title="Risoluzione intelligente dei buchi di reperibilità per l'intero mese corrente"
            >
              <Sparkles width={14} height={14} /> AI Resolve
            </button>
          </div>

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>

          {/* COPY PASTE */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button 
              onClick={copyDay}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              title="Copia OdS di questa giornata"
            >
              <Copy width={16} height={16} />
            </button>
            <button 
              onClick={pasteDay}
              disabled={!copiedDay}
              className={`p-2 rounded-lg transition-all ${copiedDay ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-slate-600 cursor-not-allowed'}`}
              title={copiedDay ? `Incolla OdS da ${copiedDay.date}` : "Nessun OdS copiato"}
            >
              <ClipboardPaste width={16} height={16} />
            </button>
          </div>

          {/* RIPRISTINA ODS */}
          <button 
            onClick={() => setShowResetConfirm(true)}
            disabled={loading}
            className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white border border-rose-600 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
            title="Rimuovi tutte le assegnazioni servizio per oggi"
          >
            <RotateCcw width={14} height={14} /> Reset
          </button>

          {patrolSelectionSize >= 2 && (
            <button 
              onClick={createPatrolFromSelection}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all animate-pulse shadow-lg shadow-indigo-500/20"
            >
              Pattuglia ({patrolSelectionSize})
            </button>
          )}

          <a href={`/${tenantSlug || 'admin'}/admin/stampa-ods`} className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm">
             Stampa
          </a>
        </div>

        {onClose && (
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="hidden sm:block px-3 py-2 bg-slate-800 hover:bg-rose-900 border border-slate-700 text-slate-200 hover:text-rose-200 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm">
                Chiudi
            </button>
            <button onClick={onClose} className="sm:hidden p-2 text-slate-400 hover:text-white transition-colors">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
