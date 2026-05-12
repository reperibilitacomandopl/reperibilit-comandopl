"use client"

import React, { useEffect, useState } from "react"
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  WalletCards,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { getLabel, AGENDA_CATEGORIES } from "@/utils/agenda-codes"

interface CartellinoSummaryViewProps {
  requests: any[]
  balances: any
  mode: 'ADMIN' | 'USER'
  onAction?: (requestId: string, action: 'APPROVE' | 'REJECT') => Promise<void>
  isLoading?: boolean
  userId?: string
  // Navigazione mese per la vista Admin
  month?: number
  year?: number
  onMonthChange?: (month: number, year: number) => void
}

const MONTH_NAMES = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

// Tutti i codici possibili dall'agenda, raggruppati
const ALL_BALANCE_CODES = AGENDA_CATEGORIES.flatMap(cat => 
  cat.items.map(item => ({
    code: item.code,
    label: item.label,
    unit: item.unit,
    group: cat.group,
    groupEmoji: cat.emoji,
    groupColor: cat.color
  }))
)

export default function CartellinoSummaryView({ 
  requests, 
  balances, 
  mode, 
  onAction,
  isLoading,
  userId,
  month,
  year,
  onMonthChange
}: CartellinoSummaryViewProps) {

  const [entitlements, setEntitlements] = useState<any>(null)

  useEffect(() => {
    if (mode === 'USER') {
      fetch("/api/agent/entitlements")
        .then(res => res.json())
        .then(data => { if (!data.error) setEntitlements(data.status) })
        .catch(() => {})
    }
  }, [mode])

  // Helpers sicuri per evitare NaN
  const safeNum = (val: any): number => {
    const n = Number(val)
    return isNaN(n) ? 0 : n
  }
  
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': case 'ACCEPTED': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': case 'ACCEPTED': return 'Approvata'
      case 'REJECTED': return 'Rifiutata'
      case 'PENDING': return 'In Attesa'
      default: return status || '—'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': case 'ACCEPTED': return <CheckCircle2 size={12} />
      case 'REJECTED': return <XCircle size={12} />
      case 'PENDING': return <Clock size={12} />
      default: return <AlertCircle size={12} />
    }
  }

  // Estrai i saldi dal DB e calcola residuo in modo sicuro
  const details = (balances?.details || []).map((d: any) => ({
    ...d,
    initialValue: safeNum(d.initialValue),
    used: safeNum(d.used),
    residue: safeNum(d.residue) || (safeNum(d.initialValue) - safeNum(d.used))
  }))

  // Mostra TUTTI i saldi configurati (initialValue > 0 oppure usati > 0)
  const activeBalances = details.filter((d: any) => d.initialValue > 0 || d.used > 0)
  // Saldi a zero (non utilizzati) - mostrali in trasparenza
  const inactiveBalances = details.filter((d: any) => d.initialValue === 0 && d.used === 0)

  // Conteggi richieste
  const safeRequests = requests || []
  const pendingCount = safeRequests.filter((r: any) => r.status?.toUpperCase() === 'PENDING').length
  const approvedCount = safeRequests.filter((r: any) => ['APPROVED','ACCEPTED'].includes(r.status?.toUpperCase())).length
  const rejectedCount = safeRequests.filter((r: any) => r.status?.toUpperCase() === 'REJECTED').length

  // Navigazione mese
  const currentMonth = month || new Date().getMonth() + 1
  const currentYear = year || new Date().getFullYear()

  const goToPrevMonth = () => {
    if (!onMonthChange) return
    const m = currentMonth === 1 ? 12 : currentMonth - 1
    const y = currentMonth === 1 ? currentYear - 1 : currentYear
    onMonthChange(m, y)
  }
  const goToNextMonth = () => {
    if (!onMonthChange) return
    const m = currentMonth === 12 ? 1 : currentMonth + 1
    const y = currentMonth === 12 ? currentYear + 1 : currentYear
    onMonthChange(m, y)
  }

  return (
    <div className="space-y-5">

      {/* NAVIGAZIONE MESE */}
      {onMonthChange && (
        <div className="flex items-center justify-center gap-4 py-2">
          <button onClick={goToPrevMonth} className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[160px]">
            <p className="text-lg font-black text-white">{MONTH_NAMES[currentMonth - 1]}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentYear}</p>
          </div>
          <button onClick={goToNextMonth} className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-all active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* STATISTICHE RAPIDE */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className={`${mode === 'ADMIN' ? 'bg-amber-900/30 border-amber-700/50' : 'bg-amber-50 border-amber-200'} border rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center`}>
          <p className={`text-xl sm:text-2xl font-black ${mode === 'ADMIN' ? 'text-amber-400' : 'text-amber-600'}`}>{pendingCount}</p>
          <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-0.5 ${mode === 'ADMIN' ? 'text-amber-500/70' : 'text-amber-500'}`}>In Attesa</p>
        </div>
        <div className={`${mode === 'ADMIN' ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'} border rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center`}>
          <p className={`text-xl sm:text-2xl font-black ${mode === 'ADMIN' ? 'text-emerald-400' : 'text-emerald-600'}`}>{approvedCount}</p>
          <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-0.5 ${mode === 'ADMIN' ? 'text-emerald-500/70' : 'text-emerald-500'}`}>Approvate</p>
        </div>
        <div className={`${mode === 'ADMIN' ? 'bg-rose-900/30 border-rose-700/50' : 'bg-rose-50 border-rose-200'} border rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center`}>
          <p className={`text-xl sm:text-2xl font-black ${mode === 'ADMIN' ? 'text-rose-400' : 'text-rose-600'}`}>{rejectedCount}</p>
          <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mt-0.5 ${mode === 'ADMIN' ? 'text-rose-500/70' : 'text-rose-500'}`}>Rifiutate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      
        {/* COLONNA SINISTRA: RICHIESTE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className={`p-1.5 rounded-lg ${mode === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  <CalendarDays size={18} />
               </div>
               <h3 className={`text-sm font-black uppercase tracking-tight ${mode === 'ADMIN' ? 'text-white' : 'text-slate-800'}`}>Richieste del Mese</h3>
            </div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${mode === 'ADMIN' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {safeRequests.length} Totali
            </span>
          </div>

          {safeRequests.length === 0 ? (
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center ${mode === 'ADMIN' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
               <Clock className={`mx-auto mb-2 ${mode === 'ADMIN' ? 'text-slate-600' : 'text-slate-300'}`} size={36} />
               <p className={`text-xs font-black uppercase tracking-widest ${mode === 'ADMIN' ? 'text-slate-600' : 'text-slate-400'}`}>Nessuna richiesta</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {safeRequests.map((req: any) => (
                <div 
                  key={req.id}
                  className={`border rounded-xl p-3 shadow-sm transition-all group ${mode === 'ADMIN' ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:shadow-md'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className={`text-xs font-black ${mode === 'ADMIN' ? 'text-white' : 'text-slate-800'}`}>
                          {new Date(req.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                        </span>
                        {req.endDate && (
                          <>
                            <ArrowRight size={9} className="text-slate-400 shrink-0" />
                            <span className={`text-xs font-black ${mode === 'ADMIN' ? 'text-white' : 'text-slate-800'}`}>
                              {new Date(req.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            </span>
                          </>
                        )}
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${mode === 'ADMIN' ? 'text-indigo-300 bg-indigo-500/20' : 'text-indigo-600 bg-indigo-50'}`}>
                        {req.hours ? `${req.hours}h ` : ''}{getLabel(req.code) || req.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)}
                        <span className="hidden sm:inline">{getStatusLabel(req.status)}</span>
                      </div>

                      {mode === 'ADMIN' && req.status?.toUpperCase() === 'PENDING' && onAction && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => onAction(req.id, 'APPROVE')}
                            className="p-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-all active:scale-95"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                          <button 
                            onClick={() => onAction(req.id, 'REJECT')}
                            className="p-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-all active:scale-95"
                          >
                            <XCircle size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLONNA DESTRA: SALDI */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
             <div className={`p-1.5 rounded-lg ${mode === 'ADMIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                <WalletCards size={18} />
             </div>
             <h3 className={`text-sm font-black uppercase tracking-tight ${mode === 'ADMIN' ? 'text-white' : 'text-slate-800'}`}>Saldi & Contatori</h3>
          </div>

          {activeBalances.length === 0 && inactiveBalances.length === 0 ? (
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center ${mode === 'ADMIN' ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
               <AlertCircle className={`mx-auto mb-2 ${mode === 'ADMIN' ? 'text-slate-600' : 'text-slate-300'}`} size={36} />
               <p className={`text-xs font-black uppercase tracking-widest ${mode === 'ADMIN' ? 'text-slate-600' : 'text-slate-400'}`}>Saldi non configurati</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {/* Saldi attivi */}
              {activeBalances.map((det: any) => {
                const initial = safeNum(det.initialValue)
                const used = safeNum(det.used)
                const residue = initial - used
                const pct = initial > 0 ? Math.min(100, (used / initial) * 100) : 0
                const isWarning = pct > 80
                const isCritical = pct > 95
                
                return (
                  <div key={det.code} className={`border rounded-xl p-3 transition-all ${
                    mode === 'ADMIN' 
                      ? `bg-slate-800/60 ${isCritical ? 'border-rose-500/50' : isWarning ? 'border-amber-500/50' : 'border-slate-700 hover:border-slate-600'}` 
                      : `bg-white ${isCritical ? 'border-rose-300' : isWarning ? 'border-amber-300' : 'border-slate-200 hover:border-indigo-300'}`
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`text-[9px] font-black uppercase tracking-wider leading-tight pr-1 ${mode === 'ADMIN' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {det.label}
                      </h4>
                      <span className={`text-[8px] font-black px-1 py-0.5 rounded shrink-0 ${det.unit === 'HOURS' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {det.unit === 'HOURS' ? 'ORE' : 'GG'}
                      </span>
                    </div>

                    <p className={`text-xl font-black mb-1 ${isCritical ? 'text-rose-400' : mode === 'ADMIN' ? 'text-white' : 'text-slate-900'}`}>
                      {residue}
                      <span className={`text-[10px] font-bold ml-1 ${mode === 'ADMIN' ? 'text-slate-500' : 'text-slate-400'}`}>/ {initial}</span>
                    </p>

                    <div className="space-y-1">
                      <div className={`h-1 w-full rounded-full overflow-hidden ${mode === 'ADMIN' ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className={`text-[7px] font-bold uppercase ${mode === 'ADMIN' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Usati: {used}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Saldi inattivi (trasparenza) */}
              {inactiveBalances.map((det: any) => (
                <div key={det.code} className={`border rounded-xl p-3 opacity-40 ${
                  mode === 'ADMIN' ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-100'
                }`}>
                  <h4 className={`text-[9px] font-black uppercase tracking-wider mb-1 ${mode === 'ADMIN' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {det.label}
                  </h4>
                  <p className={`text-lg font-black ${mode === 'ADMIN' ? 'text-slate-600' : 'text-slate-300'}`}>0</p>
                  <p className={`text-[7px] font-bold uppercase ${mode === 'ADMIN' ? 'text-slate-600' : 'text-slate-400'}`}>Non utilizzato</p>
                </div>
              ))}
            </div>
          )}

          {/* DIRITTI SPECIALI L.104 e Studio */}
          {entitlements && (entitlements.hasL104 || entitlements.hasStudyLeave) && (
            <div className="space-y-2 mt-1">
              <h4 className={`text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 ${mode === 'ADMIN' ? 'text-slate-500' : 'text-slate-400'}`}>
                <ShieldCheck size={13} /> Diritti Speciali
              </h4>

              {entitlements.hasL104 && (
                <div className={`border rounded-xl p-3 ${mode === 'ADMIN' ? 'bg-blue-900/20 border-blue-700/40' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className={`text-[9px] font-black uppercase tracking-wider ${mode === 'ADMIN' ? 'text-blue-400' : 'text-blue-500'}`}>L.104/92 (Mese)</p>
                    <ShieldCheck size={14} className={mode === 'ADMIN' ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                  <p className={`text-xl font-black mb-1 ${mode === 'ADMIN' ? 'text-white' : 'text-blue-900'}`}>
                    {safeNum(entitlements.l104Limit) - safeNum(entitlements.l104Used)}
                    <span className={`text-[10px] font-bold ml-1 ${mode === 'ADMIN' ? 'text-blue-400/70' : 'text-blue-400'}`}>
                      / {safeNum(entitlements.l104Limit)} {entitlements.l104Mode === 'HOURS' ? 'ore' : 'gg'}
                    </span>
                  </p>
                  <div className={`h-1 w-full rounded-full overflow-hidden ${mode === 'ADMIN' ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${(safeNum(entitlements.l104Used) / Math.max(1, safeNum(entitlements.l104Limit))) * 100}%` }} />
                  </div>
                </div>
              )}

              {entitlements.hasStudyLeave && (
                <div className={`border rounded-xl p-3 ${mode === 'ADMIN' ? 'bg-indigo-900/20 border-indigo-700/40' : 'bg-indigo-50 border-indigo-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className={`text-[9px] font-black uppercase tracking-wider ${mode === 'ADMIN' ? 'text-indigo-400' : 'text-indigo-500'}`}>Studio 150H (Anno)</p>
                    <GraduationCap size={14} className={mode === 'ADMIN' ? 'text-indigo-400' : 'text-indigo-600'} />
                  </div>
                  <p className={`text-xl font-black mb-1 ${mode === 'ADMIN' ? 'text-white' : 'text-indigo-900'}`}>
                    {safeNum(entitlements.studyLeaveLimit) - safeNum(entitlements.studyLeaveUsed)}
                    <span className={`text-[10px] font-bold ml-1 ${mode === 'ADMIN' ? 'text-indigo-400/70' : 'text-indigo-400'}`}>
                      / {safeNum(entitlements.studyLeaveLimit)} ore
                    </span>
                  </p>
                  <div className={`h-1 w-full rounded-full overflow-hidden ${mode === 'ADMIN' ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${(safeNum(entitlements.studyLeaveUsed) / Math.max(1, safeNum(entitlements.studyLeaveLimit))) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
