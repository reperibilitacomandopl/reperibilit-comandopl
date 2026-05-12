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
  GraduationCap
} from "lucide-react"
import { getLabel } from "@/utils/agenda-codes"

interface CartellinoSummaryViewProps {
  requests: any[]
  balances: any
  mode: 'ADMIN' | 'USER'
  onAction?: (requestId: string, action: 'APPROVE' | 'REJECT') => Promise<void>
  isLoading?: boolean
  userId?: string // Per caricare i diritti speciali lato agente
}

export default function CartellinoSummaryView({ 
  requests, 
  balances, 
  mode, 
  onAction,
  isLoading,
  userId
}: CartellinoSummaryViewProps) {

  // Carica diritti speciali (L.104, Studio) se disponibile l'userId
  const [entitlements, setEntitlements] = useState<any>(null)

  useEffect(() => {
    if (mode === 'USER') {
      fetch("/api/agent/entitlements")
        .then(res => res.json())
        .then(data => { if (!data.error) setEntitlements(data.status) })
        .catch(() => {})
    }
  }, [mode])
  
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'ACCEPTED': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
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
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED': case 'ACCEPTED': return <CheckCircle2 size={14} />
      case 'REJECTED': return <XCircle size={14} />
      case 'PENDING': return <Clock size={14} />
      default: return <AlertCircle size={14} />
    }
  }

  // Estrai TUTTI i saldi disponibili (non filtrare con codici hardcoded)
  const details = balances?.details || []
  
  // Separa saldi principali da quelli secondari, usando TUTTI i details disponibili
  const mainBalances = details.filter((d: any) => d.initialValue > 0 || d.used > 0)

  // Conteggi rapidi per le richieste
  const pendingCount = (requests || []).filter((r: any) => r.status?.toUpperCase() === 'PENDING').length
  const approvedCount = (requests || []).filter((r: any) => r.status?.toUpperCase() === 'APPROVED' || r.status?.toUpperCase() === 'ACCEPTED').length
  const rejectedCount = (requests || []).filter((r: any) => r.status?.toUpperCase() === 'REJECTED').length

  return (
    <div className="space-y-6">

      {/* STATISTICHE RAPIDE */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mt-1">In Attesa</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{approvedCount}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-1">Approvate</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-rose-600">{rejectedCount}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-1">Rifiutate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
        {/* COLONNA SINISTRA: RICHIESTE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <CalendarDays size={20} />
               </div>
               <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Richieste del Mese</h3>
            </div>
            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase">
              {(requests || []).length} Totali
            </span>
          </div>

          {(!requests || requests.length === 0) ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
               <Clock className="mx-auto text-slate-300 mb-3" size={40} />
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nessuna richiesta</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {requests.map((req: any) => (
                <div 
                  key={req.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-800">
                          {new Date(req.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                        </span>
                        {req.endDate && (
                          <>
                            <ArrowRight size={10} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-black text-slate-800">
                              {new Date(req.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                         <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                           {req.hours ? `${req.hours}h ` : ''}{getLabel(req.code) || req.code}
                         </span>
                         {req.notes && <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">"{req.notes}"</span>}
                         {req.note && !req.notes && <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">"{req.note}"</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-black uppercase ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)}
                        <span className="hidden sm:inline">{getStatusLabel(req.status)}</span>
                      </div>

                      {/* Bottoni azione - visibili sempre su mobile, hover su desktop */}
                      {mode === 'ADMIN' && req.status?.toUpperCase() === 'PENDING' && onAction && (
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onAction(req.id, 'APPROVE')}
                            className="p-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-all active:scale-95"
                            title="Approva"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button 
                            onClick={() => onAction(req.id, 'REJECT')}
                            className="p-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-all active:scale-95"
                            title="Rifiuta"
                          >
                            <XCircle size={14} />
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
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <WalletCards size={20} />
             </div>
             <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Saldi & Contatori</h3>
          </div>

          {mainBalances.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
               <AlertCircle className="mx-auto text-slate-300 mb-3" size={40} />
               <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Saldi non configurati</p>
               <p className="text-xs text-slate-400 mt-1">L'amministratore deve inizializzare i saldi per l'anno corrente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mainBalances.map((det: any) => {
                const pct = det.initialValue > 0 
                  ? Math.min(100, (det.used / det.initialValue) * 100) 
                  : 0
                const isWarning = pct > 80
                const isCritical = pct > 95
                const residue = det.residue ?? (det.initialValue - det.used)
                
                return (
                  <div key={det.code} className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${isCritical ? 'border-rose-300 bg-rose-50/30' : isWarning ? 'border-amber-300' : 'border-slate-200 hover:border-indigo-300'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight pr-2">
                        {det.label}
                      </h4>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${det.unit === 'HOURS' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {det.unit === 'HOURS' ? 'ORE' : 'GG'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mb-2">
                      <span className={`text-2xl font-black ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>{residue}</span>
                      <span className="text-[10px] font-bold text-slate-400">Residuo</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 rounded-full ${isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                        <span>Usati: {det.used}</span>
                        <span>Totale: {det.initialValue}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* DIRITTI SPECIALI (L.104, Studio) - Solo per utenti con diritti attivi */}
          {entitlements && (entitlements.hasL104 || entitlements.hasStudyLeave) && (
            <div className="space-y-3 mt-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
                <ShieldCheck size={14} />
                Diritti Speciali
              </h4>

              {entitlements.hasL104 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500 mb-0.5">L.104/92 (Mese Corrente)</p>
                      <h4 className="text-xl font-black text-blue-900">
                        {entitlements.l104Limit - entitlements.l104Used} 
                        <span className="text-sm text-blue-400 font-medium ml-1">{entitlements.l104Mode === 'HOURS' ? 'ore' : 'gg'} residui</span>
                      </h4>
                    </div>
                    <div className="p-2 bg-blue-600 rounded-xl shadow-md">
                      <ShieldCheck size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase text-blue-400">
                      <span>Utilizzati: {entitlements.l104Used} / {entitlements.l104Limit}</span>
                      <span>{entitlements.l104Limit > 0 ? Math.round((entitlements.l104Used / entitlements.l104Limit) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${(entitlements.l104Used / Math.max(1, entitlements.l104Limit)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {entitlements.hasStudyLeave && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500 mb-0.5">Diritto allo Studio (Anno)</p>
                      <h4 className="text-xl font-black text-indigo-900">
                        {entitlements.studyLeaveLimit - entitlements.studyLeaveUsed} 
                        <span className="text-sm text-indigo-400 font-medium ml-1">ore residue</span>
                      </h4>
                    </div>
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-md">
                      <GraduationCap size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase text-indigo-400">
                      <span>Utilizzate: {entitlements.studyLeaveUsed} / {entitlements.studyLeaveLimit}</span>
                      <span>{Math.round((entitlements.studyLeaveUsed / entitlements.studyLeaveLimit) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${(entitlements.studyLeaveUsed / entitlements.studyLeaveLimit) * 100}%` }} />
                    </div>
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
