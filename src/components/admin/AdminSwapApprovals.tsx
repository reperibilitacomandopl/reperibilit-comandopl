"use client"

import React from "react"
import { RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react"
import { getCategoryForCode } from "@/utils/constants"

interface PendingRequest {
  id: string;
  date: string | Date;
  user: { name: string };
  code: string;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  notes?: string | null;
}

interface PendingSwap {
  id: string;
  shift: { date: string | Date; type: string };
  requester: { name: string };
  targetUser: { name: string };
}

interface AdminSwapApprovalsProps {
  isOpen: boolean;
  onClose: () => void;
  isLoadingSwaps: boolean;
  pendingSwaps: PendingSwap[];
  pendingRequests: PendingRequest[];
  onApproveAction: (id: string, action: "APPROVE" | "REJECT", isSwap: boolean) => void;
}

export default function AdminSwapApprovals({ 
  isOpen, 
  onClose, 
  isLoadingSwaps, 
  pendingSwaps, 
  pendingRequests, 
  onApproveAction 
}: AdminSwapApprovalsProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white flex flex-col max-h-[90vh]">
        
        {/* Header Moderno Amber */}
        <div className="bg-white border-b border-slate-100 p-8 text-slate-900 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-amber-200">
               <RefreshCw width={28} height={28} className={isLoadingSwaps ? "animate-spin" : ""} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Centro Approvazioni</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Gestione Scambi e Permessi Dipendenti</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
          >
            <X width={24} height={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-slate-50/50 custom-scrollbar flex-1 space-y-10">
          {isLoadingSwaps ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw width={40} height={40} className="animate-spin text-slate-300 mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Verifica code in corso...</p>
            </div>
          ) : pendingSwaps.length === 0 && pendingRequests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                 <CheckCircle2 className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nessuna operazione in coda</p>
            </div>
          ) : (
            <>
              {/* Sezione 1: Assenze */}
              {pendingRequests.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                     <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Richieste di Assenza ({pendingRequests.length})</h4>
                  </div>
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 group">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                             {/* Data Circle */}
                             <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.2rem] flex flex-col items-center justify-center shadow-xl shadow-slate-200 shrink-0">
                                <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{new Date(req.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                                <span className="text-2xl font-black leading-none">{new Date(req.date).getDate()}</span>
                             </div>
                             
                             <div>
                                <h5 className="font-black text-slate-900 text-lg uppercase leading-tight tracking-tight mb-1">{req.user.name}</h5>
                                <div className="flex flex-wrap items-center gap-3">
                                   <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 uppercase">{getCategoryForCode(req.code)?.items.find(i => i.code === req.code)?.label || req.code}</span>
                                   {req.startTime && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><RefreshCw width={10}/> {req.startTime} • {req.endTime}</span>}
                                </div>
                                {req.notes && <p className="mt-3 text-xs text-slate-500 italic font-medium bg-slate-50 p-2 rounded-xl group-hover:bg-amber-50/50 transition-colors">&ldquo;{req.notes}&rdquo;</p>}
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                             <button onClick={() => { void onApproveAction(req.id, "REJECT", false); }} className="px-6 py-3.5 border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95">Rifiuta</button>
                             <button onClick={() => { void onApproveAction(req.id, "APPROVE", false); }} className="px-8 py-3.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Approva</button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sezione 2: Scambi */}
              {pendingSwaps.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                     <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Proposte di Scambio Turno ({pendingSwaps.length})</h4>
                  </div>
                  {pendingSwaps.map((swap) => (
                    <div key={swap.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative group">
                       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><RefreshCw size={80}/></div>
                       
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                          <div className="flex flex-col sm:flex-row items-center gap-6">
                             {/* User Swap Flow */}
                             <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-[1.8rem]">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 font-black text-xs shadow-sm border border-slate-200">{swap.requester.name.slice(0,2)}</div>
                                <div className="p-2 bg-slate-900 text-white rounded-full animate-pulse"><RefreshCw width={14} height={14} /></div>
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-sm">{swap.targetUser.name.slice(0,2)}</div>
                             </div>
                             
                             <div className="text-center sm:text-left">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Passaggio Turno del {new Date(swap.shift.date).toLocaleDateString('it-IT')}</p>
                                <h5 className="font-black text-slate-900 text-sm uppercase"><span className="text-slate-500">{swap.requester.name}</span> <span className="text-indigo-600">→</span> {swap.targetUser.name}</h5>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 rounded-lg uppercase tracking-tighter">Turno: {swap.shift.type}</span>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                             <button onClick={() => { void onApproveAction(swap.id, "REJECT", true); }} className="px-6 py-3.5 border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95">Annulla</button>
                             <button onClick={() => { void onApproveAction(swap.id, "APPROVE", true); }} className="px-8 py-3.5 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">Conferma Scopertura</button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="p-6 bg-slate-900 text-white shrink-0">
           <div className="flex items-start gap-4">
              <div className="p-2 bg-white/10 rounded-xl"><AlertCircle className="text-amber-400" width={18} height={18}/></div>
              <p className="text-[10px] text-white/60 font-medium leading-relaxed">
                ATTENZIONE: L'approvazione è definitiva e sposterà i turni nel Database centrale, notificando immediatamente gli interessati via Telegram e Push.
              </p>
           </div>
        </div>
      </div>
    </div>
  )
}
