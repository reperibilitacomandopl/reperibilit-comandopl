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
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "In Attesa", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  ACCEPTED: { label: "Accettata (Da Approvare)", color: "bg-blue-100 text-blue-700 border-blue-300", icon: User },
  APPROVED_BY_ADMIN: { label: "Approvata", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  REJECTED: { label: "Rifiutata", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
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
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-blue-100 rounded-xl"><ArrowLeftRight size={24} className="text-blue-600" /></div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800">Bacheca Scambi Turno</h1>
          {pending.length > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full border border-amber-200">
              {pending.length} in attesa
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm font-medium">
          Gli agenti pubblicano qui i turni che vogliono cedere. Un collega accetta, tu approvi. Niente più gruppi WhatsApp.
        </p>
      </div>

      {/* Pending */}
      {pending.length === 0 && resolved.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <ArrowLeftRight size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-400 mb-1">Nessuna offerta di scambio</h3>
          <p className="text-sm text-slate-400">Quando un agente pubblicherà un turno da cedere, apparirà qui.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-600">
                Da Gestire ({pending.length})
              </h2>
              {pending.map(swap => {
                const status = STATUS_MAP[swap.status] || STATUS_MAP.PENDING
                const StatusIcon = status.icon
                const shiftDate = new Date(swap.shift.date)
                return (
                  <div key={swap.id} className="bg-white border-2 border-slate-100 hover:border-blue-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-400" />
                            <span className="text-sm font-black text-slate-700">{swap.requester.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({swap.requester.matricola})</span>
                          </div>
                          <span className="text-slate-300">→</span>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-600">
                              {shiftDate.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-black rounded-lg">
                            {swap.shift.type || swap.shift.repType || "—"}
                          </span>
                          {swap.shift.timeRange && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">
                              {swap.shift.timeRange}
                            </span>
                          )}
                        </div>
                        {swap.message && (
                          <div className="flex items-start gap-2 text-xs text-slate-500 italic">
                            <MessageSquare size={12} className="mt-0.5 shrink-0" />
                            "{swap.message}"
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black ${status.color}`}>
                            <StatusIcon size={10} /> {status.label}
                          </span>
                        </div>
                      </div>

                      {swap.status === "ACCEPTED" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAction(swap.id, "approve")}
                            disabled={processing === swap.id}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                          >
                            <ShieldCheck size={14} /> Approva
                          </button>
                          <button
                            onClick={() => handleAction(swap.id, "reject")}
                            disabled={processing === swap.id}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
                          >
                            <XCircle size={14} /> Rifiuta
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3 mt-8">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
                Storico ({resolved.length})
              </h2>
              {resolved.map(swap => {
                const status = STATUS_MAP[swap.status] || STATUS_MAP.PENDING
                const StatusIcon = status.icon
                const shiftDate = new Date(swap.shift.date)
                return (
                  <div key={swap.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 opacity-70">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-slate-500">{swap.requester.name}</span>
                      <span className="text-slate-300">→</span>
                      <span className="text-sm text-slate-500">
                        {shiftDate.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black ${status.color}`}>
                        <StatusIcon size={10} /> {status.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
