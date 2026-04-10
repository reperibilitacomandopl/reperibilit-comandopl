"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { ArrowLeftRight, CheckCircle2, XCircle, Clock, User, Calendar, MessageSquare, ShieldCheck } from "lucide-react"

type Swap = {
  id: string
  requesterId: string
  requester: { id: string; name: string; matricola: string }
  shift: { id: string; date: string; type: string; repType: string | null; timeRange: string | null }
  message: string | null
  acceptedById: string | null
  status: string
  createdAt: string
  tenantId: string
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "In Attesa", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  ACCEPTED: { label: "Accettata (Da Approvare)", color: "bg-indigo-100 text-indigo-700 border-indigo-300", icon: User },
  APPROVED_BY_ADMIN: { label: "Approvata", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  REJECTED: { label: "Rifiutata", color: "bg-rose-100 text-rose-700 border-rose-300", icon: XCircle },
}

export default function SwapBoardClient({ swaps: initial }: { swaps: Swap[] }) {
  const [swaps, setSwaps] = useState<Swap[]>(initial)
  const [processing, setProcessing] = useState<string | null>(null)

  const handleAction = async (swapId: string, action: "approve" | "reject") => {
    setProcessing(swapId)
    try {
      const res = await fetch("/api/admin/swap-board", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId, action })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSwaps(prev => prev.map(s => s.id === swapId
        ? { ...s, status: action === "approve" ? "APPROVED_BY_ADMIN" : "REJECTED" }
        : s
      ))
      toast.success(data.message)
    } catch (e: any) { toast.error(e.message || "Errore") }
    finally { setProcessing(null) }
  }

  const pending = swaps.filter(s => s.status === "PENDING" || s.status === "ACCEPTED")
  const resolved = swaps.filter(s => s.status === "APPROVED_BY_ADMIN" || s.status === "REJECTED")

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-12 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 ring-1 ring-white/20">
              <ArrowLeftRight size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 font-sans">Bacheca <span className="text-indigo-600">Scambi</span></h1>
              <p className="text-slate-500 font-medium mt-1">
                Gestione centralizzata delle cessioni e assunzioni di turno.
              </p>
            </div>
          </div>
        </div>
        
        {pending.length > 0 && (
          <div className="glass-effect px-5 py-2.5 rounded-2xl flex items-center gap-3 ring-1 ring-amber-200 shadow-lg shadow-amber-500/5">
             <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
             <span className="text-sm font-black text-amber-700 font-sans uppercase tracking-widest">
               {pending.length} Da Gestire
             </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-10">
        {pending.length === 0 && resolved.length === 0 ? (
          <div className="premium-card p-16 text-center border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ArrowLeftRight size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-400 font-sans mb-2">Nessuna proposta attiva</h3>
            <p className="text-slate-400 max-w-xs mx-auto">Le offerte di cessione turno caricate dagli agenti appariranno qui.</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-600 pl-4 border-l-4 border-indigo-500">
                  Richieste Attuali ({pending.length})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {pending.map(swap => {
                    const status = STATUS_MAP[swap.status] || STATUS_MAP.PENDING
                    const StatusIcon = status.icon
                    const shiftDate = new Date(swap.shift.date)
                    return (
                      <div key={swap.id} className="premium-card p-6 relative overflow-hidden group">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${swap.status === 'ACCEPTED' ? 'bg-indigo-500' : 'bg-amber-400'}`} />
                        
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                          <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-4 flex-wrap">
                               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl ring-1 ring-slate-200/50">
                                  <User size={14} className="text-indigo-600" />
                                  <span className="text-sm font-black text-slate-800 font-sans tracking-tight">{swap.requester.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">#{swap.requester.matricola}</span>
                               </div>

                               <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200">
                                 <ArrowLeftRight size={14} className="text-slate-400" />
                               </div>

                               <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-xl ring-1 ring-indigo-100">
                                  <Calendar size={14} className="text-indigo-600" />
                                  <span className="text-sm font-black text-indigo-700 font-sans tracking-tight">
                                    {shiftDate.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
                                  </span>
                               </div>

                               <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-200">
                                  <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                                    {swap.shift.type || swap.shift.repType || "—"}
                                  </span>
                               </div>
                            </div>

                            {swap.message && (
                               <div className="flex items-start gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                  <MessageSquare size={14} className="text-slate-400 mt-1 shrink-0" />
                                  <p className="text-sm text-slate-500 italic">"{swap.message}"</p>
                               </div>
                            )}

                            <div className="flex items-center gap-2">
                               <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tight ${status.color}`}>
                                  <StatusIcon size={12} /> {status.label}
                               </span>
                            </div>
                          </div>

                          {swap.status === "ACCEPTED" && (
                            <div className="flex items-center gap-3 shrink-0">
                               <button
                                 onClick={() => handleAction(swap.id, "approve")}
                                 disabled={processing === swap.id}
                                 className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                               >
                                 <ShieldCheck size={16} /> Approva
                               </button>
                               <button
                                 onClick={() => handleAction(swap.id, "reject")}
                                 disabled={processing === swap.id}
                                 className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 hover:border-rose-200 hover:text-rose-600 text-slate-600 text-xs font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                               >
                                 <XCircle size={16} /> Rifiuta
                               </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {resolved.length > 0 && (
              <div className="space-y-6 pt-10">
                <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 pl-4 border-l-4 border-slate-300">
                  CRONOLOGIA ({resolved.length})
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {resolved.map(swap => {
                    const status = STATUS_MAP[swap.status] || STATUS_MAP.PENDING
                    const StatusIcon = status.icon
                    const shiftDate = new Date(swap.shift.date)
                    return (
                      <div key={swap.id} className="bg-white/40 border border-slate-100 rounded-2xl px-5 py-4 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="text-sm font-bold text-slate-700 font-sans tracking-tight">{swap.requester.name}</span>
                          <span className="text-slate-300 font-black tracking-widest">{"> >"}</span>
                          <span className="text-sm font-bold text-slate-500 font-sans">
                            {shiftDate.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${status.color}`}>
                            <StatusIcon size={12} /> {status.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {new Date(swap.createdAt).toLocaleDateString("it-IT")}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
