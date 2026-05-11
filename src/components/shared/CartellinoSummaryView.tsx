"use client"

import React from "react"
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  WalletCards,
  ArrowRight
} from "lucide-react"
import { getLabel } from "@/utils/agenda-codes"

interface Request {
  id: string
  date: string
  endDate?: string | null
  code: string
  status: string
  hours?: number | null
  note?: string | null
}

interface BalanceDetail {
  code: string
  label: string
  initialValue: number
  used: number
  residue: number
  unit: string
}

interface CartellinoSummaryViewProps {
  requests: Request[]
  balances: {
    details?: any[]
  } | any | null
  mode: 'ADMIN' | 'USER'
  onAction?: (requestId: string, action: 'APPROVE' | 'REJECT') => Promise<void>
  isLoading?: boolean
}

export default function CartellinoSummaryView({ 
  requests, 
  balances, 
  mode, 
  onAction,
  isLoading 
}: CartellinoSummaryViewProps) {
  
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'REJECTED': return 'bg-rose-100 text-rose-700 border-rose-200'
      case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED': return <CheckCircle2 size={14} />
      case 'REJECTED': return <XCircle size={14} />
      case 'PENDING': return <Clock size={14} />
      default: return <AlertCircle size={14} />
    }
  }

  // Sezione Saldi Principali (Ferie, 104, Studio)
  const mainCodes = ["FERIE", "0015", "0016", "STUDIO", "104", "0010"]
  const mainBalances = balances?.details?.filter((d: any) => 
    mainCodes.some(code => d.code.includes(code) || d.label.toUpperCase().includes(code))
  ) || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      
      {/* COLONNA SINISTRA: RICHIESTE */}
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <CalendarDays size={20} />
             </div>
             <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Richieste del Mese</h3>
          </div>
          <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1 rounded-full uppercase">
            {requests.length} Totali
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
             <Clock className="mx-auto text-slate-300 mb-4" size={48} />
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Nessuna richiesta registrata</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => (
              <div 
                key={req.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-800">
                        {new Date(req.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                      </span>
                      {req.endDate && (
                        <>
                          <ArrowRight size={10} className="text-slate-400" />
                          <span className="text-xs font-black text-slate-800">
                            {new Date(req.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
                         {req.hours ? `${req.hours}h ` : ''}{getLabel(req.code) || req.code}
                       </span>
                       {req.note && <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">"{req.note}"</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      {req.status}
                    </div>

                    {mode === 'ADMIN' && req.status.toUpperCase() === 'PENDING' && onAction && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onAction(req.id, 'APPROVE')}
                          className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                          title="Approva"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button 
                          onClick={() => onAction(req.id, 'REJECT')}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
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
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
           <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <WalletCards size={20} />
           </div>
           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Saldi & Accantonamenti</h3>
        </div>

        {!balances ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
             <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Saldi non disponibili</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mainBalances.length > 0 ? mainBalances.map((det: any) => {
              const pct = Math.min(100, (det.used / Math.max(1, det.initialValue)) * 100)
              const isWarning = pct > 90
              
              return (
                <div key={det.code} className="bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm hover:border-indigo-300 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight pr-4">
                      {det.label}
                    </h4>
                    <span className="text-[10px] font-black text-slate-400">
                      {det.unit === 'HOURS' ? 'Ore' : 'GG'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-black text-slate-900">{det.residue}</span>
                    <span className="text-[10px] font-bold text-slate-400">Residuo</span>
                  </div>

                  <div className="space-y-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${isWarning ? 'bg-rose-500' : 'bg-indigo-600'} transition-all duration-1000`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                      <span>Usati: {det.used}</span>
                      <span>Totale: {det.initialValue}</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">Nessun saldo principale configurato</p>
              </div>
            )}

            {/* Riepilogo Straordinari/Recupero rapido */}
            <div className="col-span-1 sm:col-span-2 bg-indigo-900 rounded-[1.5rem] p-6 text-white relative overflow-hidden shadow-xl">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <TrendingUp size={80} />
               </div>
               <div className="relative z-10">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300 mb-2">Trend Operativo</p>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-2xl font-black">
                        {balances.details.find(d => d.code === 'RR')?.used || 0}
                      </p>
                      <p className="text-[8px] font-black uppercase text-indigo-300">Recuperi Effettuati</p>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div>
                      <p className="text-2xl font-black">
                        {balances.details.find(d => d.code === '0009')?.used || 0}
                      </p>
                      <p className="text-[8px] font-black uppercase text-indigo-300">Permessi Totali</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
