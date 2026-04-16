"use client"

import { useState } from "react"
import { X, RefreshCw, Calendar, Users, ChevronDown, ArrowRight, Check, AlertCircle, AlertTriangle, Send } from "lucide-react"
import toast from "react-hot-toast"
import { DashboardShift } from "@/types/dashboard"

interface AgentSwapModalProps {
  currentUser: { id: string, name: string, matricola: string }
  allAgents: { id: string; name: string; matricola: string }[]
  myShifts: DashboardShift[]
  allShifts: DashboardShift[]
  onClose: () => void
  selectedShift?: DashboardShift | null
  onSuccess: () => void
}

export default function AgentSwapModal({ 
  currentUser, 
  allAgents, 
  myShifts, 
  allShifts, 
  onClose, 
  selectedShift,
  onSuccess 
}: AgentSwapModalProps) {
  const [swapDate, setSwapDate] = useState<string>(
    selectedShift ? new Date(selectedShift.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [targetColleagueId, setTargetColleagueId] = useState('')
  const [swapLoading, setSwapLoading] = useState(false)

  const handleRequestSwap = async () => {
    const dateToCheck = selectedShift ? new Date(selectedShift.date).toISOString().split('T')[0] : swapDate
    const myShiftFromList = myShifts.find(s => new Date(s.date).toISOString().split('T')[0] === dateToCheck)
    
    if (!myShiftFromList || !targetColleagueId) return
    
    setSwapLoading(true)
    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: myShiftFromList.id, targetUserId: targetColleagueId })
      })
      if (res.ok) {
        toast.success("Proposta di scambio inviata al collega!")
        onSuccess()
        onClose()
      } else {
        const d = await res.json()
        toast.error(d.error || "Errore nell'invio")
      }
    } catch {
      toast.error("Errore di rete")
    } finally {
      setSwapLoading(false)
    }
  }

  const renderPreview = () => {
    const dateToCheck = selectedShift ? new Date(selectedShift.date).toISOString().split('T')[0] : swapDate
    const myShiftFromList = myShifts.find(s => new Date(s.date).toISOString().split('T')[0] === dateToCheck)
    const targetShift = allShifts.find(s => s.userId === targetColleagueId && new Date(s.date).toISOString().split('T')[0] === dateToCheck)
    const colName = allAgents.find(a => a.id === targetColleagueId)?.name || "Collega"

    if (!targetColleagueId) return null

    if (!myShiftFromList || !targetShift) {
      return (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-xs font-bold leading-tight uppercase tracking-tighter italic">
            Seleziona un collega e una data valida per vedere l&apos;anteprima.
          </p>
        </div>
      )
    }

    const isForbidden = (myShiftFromList.type === "RIPOSO") || (targetShift.type === "RIPOSO")

    if (isForbidden) {
      return (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600">
          <AlertTriangle size={20} className="shrink-0" />
          <p className="text-xs font-bold leading-tight uppercase tracking-tighter italic">
            SCAMBIO NON POSSIBILE: Uno dei due operatori è a RIPOSO in questa data.
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black text-xs">TU</div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Cedi il turno</p>
              <p className="text-sm font-black text-slate-800">{myShiftFromList.type} <span className="text-slate-400 font-medium ml-1">({myShiftFromList.timeRange})</span></p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-300" />
        </div>

        <div className="flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 text-white rounded-lg flex items-center justify-center font-black text-xs uppercase">RICEVI</div>
            <div>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Dal collega {colName.split(' ')[0]}</p>
              <p className="text-sm font-black">{targetShift.type} <span className="text-indigo-200 font-medium ml-1">({targetShift.timeRange})</span></p>
            </div>
          </div>
          <Check size={20} className="text-indigo-300" />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-white/20 rounded-2xl border border-white/20">
              <RefreshCw size={24} />
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <h3 className="text-2xl font-black tracking-tight relative z-10">Proposta Scambio Turno</h3>
          <p className="text-blue-100 text-sm mt-2 opacity-80 relative z-10 font-medium">Inverti il tuo incarico con un collega per una data specifica.</p>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" /> DATA DELLO SCAMBIO
            </label>
            <input 
              type="date"
              value={swapDate}
              onChange={(e) => setSwapDate(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users size={14} className="text-blue-500" /> SELEZIONA IL COLLEGA
            </label>
            <div className="relative">
              <select 
                value={targetColleagueId}
                onChange={(e) => setTargetColleagueId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="">Scegli un collega...</option>
                {allAgents.filter(a => a.id !== currentUser.id).map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name} (Matr. {agent.matricola})</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-6 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-200 pb-3 mb-2">
              Anteprima Inversione Turni
            </p>
            {renderPreview()}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-[9px] text-amber-700 font-black uppercase tracking-widest text-center leading-relaxed italic">
              ⚠️ Premendo &quot;Invia Proposta&quot;, il sistema chiederà prima l&apos;accordo al collega e poi il visto finale dell&apos;Admin o della Segreteria.
            </p>
          </div>

          <button 
            disabled={!targetColleagueId || swapLoading}
            onClick={handleRequestSwap}
            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center justify-center gap-3"
          >
            {swapLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
            Invia Proposta Scambio
          </button>
        </div>
      </div>
    </div>
  )
}
