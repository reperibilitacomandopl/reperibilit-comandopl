"use client"

import React, { useState } from "react"
import { X, Calendar as CalendarIcon, Users, CheckCircle2, RefreshCw } from "lucide-react"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"
import { useAdminState } from "./AdminStateContext"
import toast from "react-hot-toast"

const CAT_THEME: Record<string, { border: string; bg: string; text: string; btnBg: string; btnText: string; btnHover: string; activeBorder: string; activeBg: string }> = {
  amber:  { border: "border-yellow-300", bg: "bg-yellow-50",  text: "text-yellow-800", btnBg: "bg-yellow-500",  btnText: "text-white", btnHover: "hover:bg-yellow-600", activeBorder: "border-yellow-500", activeBg: "bg-yellow-500 text-white" },
  rose:   { border: "border-pink-300",   bg: "bg-pink-50",    text: "text-pink-800",   btnBg: "bg-pink-500",    btnText: "text-white", btnHover: "hover:bg-pink-600", activeBorder: "border-pink-500", activeBg: "bg-pink-500 text-white" },
  blue:   { border: "border-sky-300",    bg: "bg-sky-50",     text: "text-sky-800",    btnBg: "bg-sky-500",     btnText: "text-white", btnHover: "hover:bg-sky-600", activeBorder: "border-sky-500", activeBg: "bg-sky-500 text-white" },
  red:    { border: "border-red-300",    bg: "bg-red-50",     text: "text-red-800",    btnBg: "bg-red-500",     btnText: "text-white", btnHover: "hover:bg-red-600", activeBorder: "border-red-500", activeBg: "bg-red-500 text-white" },
  teal:   { border: "border-teal-300",   bg: "bg-teal-50",    text: "text-teal-800",   btnBg: "bg-teal-500",    btnText: "text-white", btnHover: "hover:bg-teal-600", activeBorder: "border-teal-500", activeBg: "bg-teal-500 text-white" },
  indigo: { border: "border-indigo-300", bg: "bg-indigo-50",  text: "text-indigo-800", btnBg: "bg-indigo-500",  btnText: "text-white", btnHover: "hover:bg-indigo-600", activeBorder: "border-indigo-500", activeBg: "bg-indigo-500 text-white" },
}

interface AdminBulkAbsenceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminBulkAbsenceModal({ isOpen, onClose }: AdminBulkAbsenceModalProps) {
  const { allAgents } = useAdminState()
  const [bulkData, setBulkData] = useState({
    agentId: "",
    startDate: "",
    endDate: "",
    code: ""
  })
  const [isSavingBulk, setIsSavingBulk] = useState(false)

  if (!isOpen) return null

  const handleBulkSave = async () => {
    if (!bulkData.agentId || !bulkData.startDate || !bulkData.endDate || !bulkData.code) {
      toast.error("Compila tutti i campi")
      return
    }
    const valueUpper = bulkData.code.trim().toUpperCase()
    const isRep = valueUpper.includes("REP")
    const finalCode = isRep ? "rep_m" : valueUpper
    
    setIsSavingBulk(true)
    try {
      const res = await fetch("/api/admin/shifts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bulkData, code: finalCode, type: finalCode })
      })

      if (res.ok) {
        toast.success("Inserimento massivo completato")
        window.location.reload()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore durante l'inserimento")
      }
    } catch (err) {
      toast.error("Errore di connessione")
    } finally {
      setIsSavingBulk(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header - Stile coerente con il modale griglia (Indigo) */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-700 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
               <CalendarIcon className="text-white" width={24} height={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Turni / Assenze Multiple</h3>
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mt-0.5">Inserimento massivo sul calendario</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
          >
            <X width={24} height={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col lg:flex-row custom-scrollbar">
          
          {/* Colonna Sinistra (Impostazioni) */}
          <div className="w-full lg:w-80 border-r border-slate-200 bg-white p-6 shrink-0 flex flex-col">
            <div className="space-y-6 flex-1">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">1. Seleziona Agente</h4>
                <div className="relative group">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" width={18} height={18} />
                  <select
                    value={bulkData.agentId}
                    onChange={e => setBulkData({ ...bulkData, agentId: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Scegli operatore...</option>
                    {allAgents
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">2. Periodo (Incluso)</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1 px-1">INIZIO</p>
                     <input type="date" value={bulkData.startDate} onChange={e => setBulkData({ ...bulkData, startDate: e.target.value })} className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none px-1" />
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1 px-1">FINE</p>
                     <input type="date" value={bulkData.endDate} onChange={e => setBulkData({ ...bulkData, endDate: e.target.value })} className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none px-1" />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">3. Input Manuale</h4>
                <input 
                  type="text" 
                  value={bulkData.code} 
                  onChange={e => setBulkData({ ...bulkData, code: e.target.value.toUpperCase() })} 
                  placeholder="Scrivi codice o clicca a destra..." 
                  className="w-full pl-4 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Riepilogo e Salva in fondo alla colonna sinistra */}
            <div className="pt-6 mt-6 border-t border-slate-200">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 mb-4">
                 <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Agente:</span>
                    <span className="text-indigo-900 truncate max-w-[120px]">{allAgents.find(a => a.id === bulkData.agentId)?.name || '---'}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Codice:</span>
                    {bulkData.code ? <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-black">{bulkData.code}</span> : <span>---</span>}
                 </div>
              </div>
              <button 
                onClick={handleBulkSave}
                disabled={isSavingBulk || !bulkData.agentId || !bulkData.startDate || !bulkData.endDate || !bulkData.code}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-[13px] font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
              >
                 {isSavingBulk ? <RefreshCw className="animate-spin" width={18} height={18} /> : <CheckCircle2 width={20} height={20} />}
                 Applica Periodo
              </button>
            </div>
          </div>

          {/* Colonna Destra (Selezione Causale) */}
          <div className="flex-1 p-6 space-y-5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Seleziona Codice Rapido</p>
            
            {/* Turni Rapidi Generici */}
            <div className="grid grid-cols-6 gap-2 px-1">
              {["M7", "M8", "P12", "P14", "P15", "REP"].map(code => {
                const isActive = bulkData.code === code;
                return (
                  <button key={code} onClick={() => setBulkData({ ...bulkData, code })}
                    className={`py-2.5 rounded-lg text-xs font-black transition-all border ${code === "REP"
                      ? isActive ? "bg-violet-600 text-white border-violet-800 ring-2 ring-violet-300" : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-500 hover:text-white"
                      : code.startsWith("M")
                        ? isActive ? "bg-blue-600 text-white border-blue-800 ring-2 ring-blue-300" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-500 hover:text-white"
                        : isActive ? "bg-emerald-600 text-white border-emerald-800 ring-2 ring-emerald-300" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white"
                    }`}>
                    {code}
                  </button>
              )})}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {AGENDA_CATEGORIES.map(cat => {
                const theme = CAT_THEME[cat.color] || CAT_THEME.indigo
                return (
                  <div key={`bulk-${cat.group}`} className={`border ${theme.border} rounded-xl overflow-hidden shadow-sm`}>
                    <div className={`${theme.bg} px-3 py-2.5 flex items-center gap-2 border-b ${theme.border}`}>
                      <span className="text-sm">{cat.emoji}</span>
                      <span className={`text-[11px] font-black ${theme.text} uppercase tracking-wide`}>{cat.group}</span>
                    </div>
                    <div className="p-2.5 bg-white grid grid-cols-1 gap-1.5 h-full max-h-48 overflow-y-auto custom-scrollbar">
                      {cat.items.map(item => {
                        const isActive = bulkData.code === item.shortCode
                        return (
                        <button
                          key={`bulk-it-${item.shortCode}`}
                          onClick={() => setBulkData({ ...bulkData, code: item.shortCode })}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all border ${isActive ? theme.activeBorder : "border-slate-100 hover:border-slate-300"} ${isActive ? theme.bg : "bg-white"}`}
                        >
                          <span className={`text-[9px] font-black rounded px-1.5 py-0.5 min-w-[44px] text-center whitespace-nowrap transition-colors ${isActive ? theme.activeBg : `${theme.btnBg} ${theme.btnText}`}`}>
                            {item.shortCode.length > 7 ? item.shortCode.substring(0, 7) : item.shortCode}
                          </span>
                          <span className={`text-[10px] font-bold leading-tight ${isActive ? theme.text : "text-slate-700"}`}>
                            {item.label}
                          </span>
                        </button>
                      )})}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
