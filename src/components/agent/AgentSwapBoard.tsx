"use client"
import React from "react"
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"

interface SwapRequest {
  id: string
  requester: { id: string, name: string }
  targetUser: { id: string, name: string }
  shift: { id: string, date: string, repType: string }
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED'
  targetUserId: string
}

interface AgentSwapBoardProps {
  currentUserId: string
  swapRequests: SwapRequest[]
  swapLoading: boolean
  handleRespondSwap: (id: string, status: "ACCEPTED" | "REJECTED") => void
}

export default function AgentSwapBoard({ currentUserId, swapRequests, swapLoading, handleRespondSwap }: AgentSwapBoardProps) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in duration-700">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white flex items-center gap-4">
        <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
          <RefreshCw size={24} className="text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase tracking-widest leading-none mb-1">Bacheca Scambi</h3>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Gestione Proposte Pattuglia</p>
        </div>
      </div>

      <div className="p-6">
        {swapRequests.length === 0 ? (
          <div className="text-center py-10 bg-white/5 rounded-2xl border-2 border-dashed border-white/10">
            <p className="text-slate-400 text-sm font-medium italic">Nessuna proposta di scambio attiva.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {swapRequests.map((req) => {
              const isIncoming = req.targetUserId === currentUserId
              const dateStr = new Date(req.shift.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
              
              return (
                <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${isIncoming ? 'bg-blue-900/20 border-blue-500/30 hover:border-blue-500/50' : 'bg-slate-800/50 border-white/5 hover:border-white/10'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isIncoming ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-500/10 text-slate-600'}`}>
                      {isIncoming ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${isIncoming ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'}`}>
                          {isIncoming ? 'Ricevuta' : 'Inviata'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{dateStr}</span>
                      </div>
                      <h4 className="font-black text-slate-900">
                        {isIncoming ? `Scambio da ${req.requester.name}` : `Proposta a ${req.targetUser.name}`}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">Turno: <span className="font-bold text-blue-600">{req.shift.repType}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'PENDING' ? (
                      isIncoming ? (
                        <>
                          <button 
                            disabled={swapLoading}
                            onClick={() => handleRespondSwap(req.id, "REJECTED")}
                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Rifiuta
                          </button>
                          <button 
                            disabled={swapLoading}
                            onClick={() => handleRespondSwap(req.id, "ACCEPTED")}
                            className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-black rounded-xl hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:scale-[1.05] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {swapLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                            Accetta
                          </button>
                        </>
                      ) : (
                        <span className="px-4 py-2 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-xl">In attesa...</span>
                      )
                    ) : (
                      <span className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl ${
                        req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {req.status === 'ACCEPTED' ? 'Accettata (In attesa Admin)' : 
                         req.status === 'REJECTED' ? 'Rifiutata' : 
                         'Approvata Admin'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
