"use client"
import React, { useState } from "react"
import { CalendarDays, X, ChevronDown, Send, AlertCircle, Upload } from "lucide-react"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"
import { PERMESSI_104_CODES, CONGEDO_CODES } from "@/utils/agenda-codes"
import { toast } from "react-hot-toast"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

import { BalanceData } from "@/types/dashboard"

interface AgentRequestFormProps {
  balances: BalanceData | null
  onClose: () => void
  initialCode?: string
  initialNotes?: string
}

export default function AgentRequestForm({ balances, onClose, initialCode = "", initialNotes = "" }: AgentRequestFormProps) {
  const [reqDate, setReqDate] = useState(new Date().toISOString().split('T')[0])
  const [reqEndDate, setReqEndDate] = useState("")
  const [reqCode, setReqCode] = useState(initialCode)
  const [reqNotes, setReqNotes] = useState(initialNotes)
  const [reqLoading, setReqLoading] = useState(false)
  const [isHourlyRequest, setIsHourlyRequest] = useState(false)
  const [reqStartTime, setReqStartTime] = useState("")
  const [reqEndTime, setReqEndTime] = useState("")
  const [reqHours, setReqHours] = useState<string | number>("")
  const [entitlements, setEntitlements] = useState<any>(null)

  const searchParams = useSearchParams()
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

  useEffect(() => {
    fetch(`/api/agent/entitlements?month=${month}&year=${year}`)
      .then(res => res.json())
      .then(d => {
        if (!d.error) setEntitlements(d.status)
      })
  }, [month, year])

  // Sticky Logic for L.104 and Hourly codes
  useEffect(() => {
    let itemUnit = "DAYS"
    for (const cat of AGENDA_CATEGORIES) {
      const found = cat.items.find(i => i.code === reqCode || i.shortCode === reqCode)
      if (found) {
        itemUnit = (found as any).unit || "DAYS"
        break
      }
    }

    if (PERMESSI_104_CODES.includes(reqCode) && entitlements) {
      const isH = reqCode.endsWith('H')
      if (entitlements.l104Mode === "DAYS") setIsHourlyRequest(false)
      else if (entitlements.l104Mode === "HOURS") setIsHourlyRequest(true)
      else setIsHourlyRequest(isH)
    } else if (itemUnit === "HOURS") {
      setIsHourlyRequest(true)
    } else {
      setIsHourlyRequest(false)
    }
  }, [reqCode, entitlements])

  useEffect(() => {
    if (isHourlyRequest && reqStartTime && reqEndTime) {
      const [startH, startM] = reqStartTime.split(':').map(Number);
      const [endH, endM] = reqEndTime.split(':').map(Number);
      
      let start = startH + startM / 60;
      let end = endH + endM / 60;
      
      if (end < start) end += 24; // Gestione scavalco mezzanotte
      
      const diff = end - start;
      if (diff > 0) setReqHours(Number(diff.toFixed(2)));
    }
  }, [reqStartTime, reqEndTime, isHourlyRequest]);

  const calcDays = () => {
    if (!reqDate) return 0;
    const start = new Date(reqDate);
    const end = reqEndDate ? new Date(reqEndDate) : new Date(reqDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  const totalDays = calcDays();

  const handleSubmit = async () => {
    if (!reqDate || !reqCode) {
      toast.error("Compila la data e la causale")
      return
    }
    setReqLoading(true)
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: reqDate,
          endDate: reqEndDate || null,
          code: reqCode,
          notes: reqNotes,
          startTime: isHourlyRequest ? reqStartTime : null,
          endTime: isHourlyRequest ? reqEndTime : null,
          hours: isHourlyRequest ? reqHours : null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore")
      toast.success("✅ Richiesta inviata!")
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore"
      toast.error(message)
    } finally {
      setReqLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 sm:p-8 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="flex justify-between items-start relative z-10">
            <div className="p-3 bg-white/20 rounded-2xl border border-white/20 shadow-inner">
              <CalendarDays size={24} />
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-black/10 rounded-full p-1">
              <X size={20} />
            </button>
          </div>
          <h3 className="text-2xl font-black tracking-tight mt-4 relative z-10">Inoltra Richiesta</h3>
          <p className="text-amber-50 text-sm mt-1 opacity-90 relative z-10 font-medium">
            Le richieste inserite qui verranno notificate al Comando Centrale per l&apos;approvazione automatica.
          </p>
        </div>

        <div className="p-6 sm:p-8 bg-slate-50 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {balances && (
            <div className="mb-6 grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Ferie</p>
                <p className="text-xl font-black text-slate-800">{(balances.ferieResidue ?? 0)}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase">di {(balances.ferieTotali ?? 0)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-blue-500 tracking-wider">L. 104</p>
                <p className="text-xl font-black text-slate-800">{(balances.permessi104Residui ?? 0)}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase">di {(balances.permessi104Totali ?? 0)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm">
                <p className="text-[9px] font-black uppercase text-teal-500 tracking-wider">Festività</p>
                <p className="text-xl font-black text-slate-800">{(balances.festivitaResidue ?? 0)}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase">di {(balances.festivitaTotali ?? 0)}</p>
              </div>
            </div>
          )}
          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Inizio</label>
              <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Fine <span className="text-slate-300 normal-case">(opzionale, se periodo)</span></label>
                {!isHourlyRequest && totalDays > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 uppercase tracking-widest border border-amber-200">
                    Totale: {totalDays} {totalDays === 1 ? 'Giorno' : 'Giorni'}
                  </span>
                )}
              </div>
              <input type="date" value={reqEndDate} onChange={e => setReqEndDate(e.target.value)} min={reqDate} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleziona Causale</label>
              <div className="relative">
                <select value={reqCode} onChange={e => setReqCode(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none appearance-none pr-10">
                  <option value="">Seleziona tipo di assenza...</option>
                  {AGENDA_CATEGORIES.map(cat => {
                    const filteredItems = cat.items.filter(item => {
                      if (PERMESSI_104_CODES.includes(item.code)) return entitlements?.hasL104
                      if (item.code === "0150") return entitlements?.hasStudyLeave
                      if (CONGEDO_CODES.includes(item.code)) return entitlements?.hasParentalLeave
                      if (item.code === "0018") return entitlements?.hasChildSicknessLeave
                      return true
                    })
                    if (filteredItems.length === 0) return null
                    return (
                      <optgroup key={cat.group} label={cat.group}>
                        {filteredItems.map(item => (
                          <option key={item.code} value={item.code}>{cat.emoji} {item.label} ({item.code})</option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                <ChevronDown size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              
              {/* Entitlement Feedback */}
              {reqCode && (PERMESSI_104_CODES.includes(reqCode) || reqCode === "0150") && entitlements && (
                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg animate-in slide-in-from-top-1">
                   <p className="text-[10px] font-black text-blue-700 uppercase flex justify-between items-center">
                     <span>{reqCode === "0150" ? "Budget Studio 150h" : "Budget L.104"}</span>
                     <span>Residuo: {reqCode === "0150" ? (150 - entitlements.studyLeaveUsed) + "h" : (entitlements.l104Limit - entitlements.l104Used) + (entitlements.l104Mode === "HOURS" ? "h" : "gg")}</span>
                   </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="hourlyReqToggle" 
                checked={isHourlyRequest} 
                onChange={(e) => setIsHourlyRequest(e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 border-slate-300"
              />
              <label htmlFor="hourlyReqToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
                Richiesta a ore (Permesso orario)
              </label>
            </div>

            {isHourlyRequest && (
              <div className="grid grid-cols-3 gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Inizio</label>
                  <input type="time" value={reqStartTime} onChange={e => setReqStartTime(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Fine</label>
                  <input type="time" value={reqEndTime} onChange={e => setReqEndTime(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Tot. Ore</label>
                  <input type="number" step="0.5" min="0" max="24" value={reqHours} onChange={e => setReqHours(e.target.value)} placeholder="0" className="w-full bg-white border border-amber-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note / Messaggio</label>
              <textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none resize-none" placeholder="Motivo o riferimenti..."></textarea>
            </div>

            {reqCode === "TIMB_MANC" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 items-center">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <p className="text-[10px] font-bold text-amber-800 leading-tight">
                  Specifica nelle note l&apos;orario corretto e il tipo di timbratura (Entrata/Uscita).
                </p>
              </div>
            )}

            {reqCode === "ALLEGATO" && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex gap-3 items-center">
                <Upload size={20} className="text-indigo-600 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-800 leading-tight">
                  L&apos;upload diretto è in manutenzione. Specifica nelle note il documento e invialo via mail al comando.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <button 
              disabled={reqLoading}
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl py-4 font-black text-sm shadow-xl shadow-amber-200 hover:-translate-y-0.5 hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send size={18} />
              {reqLoading ? "Invio in corso..." : "Invia Richiesta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

