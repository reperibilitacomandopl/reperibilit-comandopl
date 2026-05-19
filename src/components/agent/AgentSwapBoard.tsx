"use client"
import React, { useState, useEffect } from "react"
import { RefreshCw, ChevronLeft, ChevronRight, Calendar, Users, Info, PlusCircle, ArrowLeftRight, Check, X } from "lucide-react"
import toast from "react-hot-toast"

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
  vacationSwapRequests?: any[]
  swapLoading: boolean
  handleRespondSwap: (id: string, status: "ACCEPTED" | "REJECTED") => void
  handleRespondVacationSwap?: (id: string, status: "ACCEPTED" | "REJECTED") => void
  handleProposeVacationSwap?: (vacationPlanId: string, targetUserId: string) => Promise<any>
}

export default function AgentSwapBoard({ 
  currentUserId, 
  swapRequests, 
  vacationSwapRequests = [], 
  swapLoading, 
  handleRespondSwap,
  handleRespondVacationSwap,
  handleProposeVacationSwap
}: AgentSwapBoardProps) {
  const [activeTab, setActiveTab] = useState<"shifts" | "vacations">("shifts")
  const [showProposeModal, setShowProposeModal] = useState(false)
  
  // Modal State data
  const [myPlans, setMyPlans] = useState<any[]>([])
  const [colleagues, setColleagues] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [selectedColleagueId, setSelectedColleagueId] = useState("")
  const [modalLoading, setModalLoading] = useState(false)

  // Carica i dati per il form del modal solo all'apertura
  useEffect(() => {
    if (showProposeModal) {
      loadModalData()
    }
  }, [showProposeModal])

  const loadModalData = async () => {
    setModalLoading(true)
    try {
      const year = new Date().getFullYear()
      const [plansRes, usersRes] = await Promise.all([
        fetch(`/api/admin/vacations?year=${year}`),
        fetch("/api/admin/users")
      ])
      const plansData = await plansRes.json()
      const usersData = await usersRes.json()

      // Filtra i piani ferie propri assegnati o confermati
      const filteredPlans = (plansData.plans || []).filter(
        (p: any) => p.userId === currentUserId && (p.status === "ASSIGNED" || p.status === "CONFIRMED")
      )
      setMyPlans(filteredPlans)

      // Filtra i colleghi (escludendo se stesso ed eventuali admin puri)
      const filteredUsers = (usersData.users || []).filter((u: any) => u.id !== currentUserId)
      setColleagues(filteredUsers)

      if (filteredPlans.length > 0) setSelectedPlanId(filteredPlans[0].id)
      if (filteredUsers.length > 0) setSelectedColleagueId(filteredUsers[0].id)
    } catch (e) {
      console.error("Errore caricamento dati modal scambi ferie", e)
      toast.error("Errore nel caricamento dei dati di proposta")
    } finally {
      setModalLoading(false)
    }
  }

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanId || !selectedColleagueId) {
      toast.error("Seleziona il tuo periodo ferie e il collega con cui scambiare")
      return
    }

    const res = await handleProposeVacationSwap?.(selectedPlanId, selectedColleagueId)
    if (res && res.success) {
      setShowProposeModal(false)
    }
  }

  const getPeriodLabel = (p: string) => {
    switch (p) {
      case "SUMMER": return "Estate ☀️"
      case "WINTER": return "Inverno ❄️"
      case "EASTER": return "Pasqua 🐣"
      case "CHRISTMAS": return "Natale 🎄"
      default: return p
    }
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in duration-500">
      
      {/* Dynamic Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md">
            <ArrowLeftRight size={24} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest leading-none mb-1">Bacheca Scambi</h3>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Sentinel Exchange Control</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("shifts")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === "shifts"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👮‍♂️ Scambi Pattuglia
          </button>
          <button
            onClick={() => setActiveTab("vacations")}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === "vacations"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-655/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📅 Ferie e Festivi
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* TAB 1: SHIFT SWAPS */}
        {activeTab === "shifts" && (
          <div>
            {swapRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                <Info size={24} className="text-slate-500" />
                <p className="text-slate-400 text-sm font-medium italic">Nessuna proposta di scambio pattuglia attiva.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {swapRequests.map((req) => {
                  const isIncoming = req.targetUserId === currentUserId
                  const dateStr = new Date(req.shift.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
                  
                  return (
                    <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border transition-all ${isIncoming ? 'bg-indigo-950/20 border-indigo-500/25 hover:border-indigo-500/40' : 'bg-slate-800/40 border-white/5 hover:border-white/10'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isIncoming ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-500/10 text-slate-400'}`}>
                          {isIncoming ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${isIncoming ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
                              {isIncoming ? 'Ricevuta' : 'Inviata'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{dateStr}</span>
                          </div>
                          <h4 className="font-black text-white mt-1">
                            {isIncoming ? `Scambio da ${req.requester.name}` : `Proposta a ${req.targetUser.name}`}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Turno: <span className="font-bold text-cyan-400 uppercase">{req.shift.repType}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === 'PENDING' ? (
                          isIncoming ? (
                            <>
                              <button 
                                disabled={swapLoading}
                                onClick={() => handleRespondSwap(req.id, "REJECTED")}
                                className="px-4 py-2 text-xs font-black text-slate-300 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-50"
                              >
                                Rifiuta
                              </button>
                              <button 
                                disabled={swapLoading}
                                onClick={() => handleRespondSwap(req.id, "ACCEPTED")}
                                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-black rounded-xl hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/10 transition-all flex items-center gap-1.5"
                              >
                                {swapLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                                Accetta
                              </button>
                            </>
                          ) : (
                            <span className="px-4 py-2 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase rounded-xl border border-amber-500/20">In attesa...</span>
                          )
                        ) : (
                          <span className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl border ${
                            req.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                            req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {req.status === 'ACCEPTED' ? 'Accettata (In attesa Comando)' : 
                             req.status === 'REJECTED' ? 'Rifiutata' : 
                             'Approvata Comando'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VACATION SWAPS */}
        {activeTab === "vacations" && (
          <div className="space-y-6">
            
            {/* Regulatory warning banner with Italian phrasing */}
            <div className="bg-indigo-950/40 border border-indigo-500/20 p-4 rounded-2xl flex items-start gap-3">
              <Info className="text-cyan-400 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-[11px] leading-relaxed text-indigo-200">
                <p className="font-black uppercase text-white tracking-wider mb-1">📅 REGOLAMENTO SCAMBIO FERIE & FESTIVI</p>
                Le proposte di scambio ferie devono essere inviate **almeno 1 mese prima** dall'inizio del periodo da scambiare. Le richieste tardive non saranno processate dal sistema. Ciascuno scambio concordato richiede il Visto del Comandante del Corpo e della Segreteria per essere effettivo.
              </div>
            </div>

            {/* Action Bar for Vacations */}
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Le tue Richieste di Scambio Ferie</span>
              <button
                onClick={() => setShowProposeModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-650/15"
              >
                <PlusCircle size={14} /> Proponi Scambio
              </button>
            </div>

            {vacationSwapRequests.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
                <Calendar size={24} className="text-slate-500" />
                <p className="text-slate-400 text-sm font-medium italic">Nessuna richiesta di scambio ferie attiva.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vacationSwapRequests.map((req) => {
                  const isIncoming = req.targetUserId === currentUserId
                  const startRequester = new Date(req.vacationPlan.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                  const endRequester = new Date(req.vacationPlan.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                  const periodTextReq = `${startRequester} - ${endRequester} (${getPeriodLabel(req.vacationPlan.period)})`

                  const startTarget = req.targetVacationPlan ? new Date(req.targetVacationPlan.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : "—"
                  const endTarget = req.targetVacationPlan ? new Date(req.targetVacationPlan.endDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : "—"
                  const periodTextTarget = req.targetVacationPlan ? `${startTarget} - ${endTarget} (${getPeriodLabel(req.targetVacationPlan.period)})` : "—"

                  return (
                    <div key={req.id} className={`flex flex-col gap-4 p-4 rounded-3xl border transition-all ${isIncoming ? 'bg-indigo-950/20 border-indigo-500/25' : 'bg-slate-800/40 border-white/5'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${isIncoming ? 'bg-indigo-650 text-white' : 'bg-slate-700 text-white'}`}>
                              {isIncoming ? 'Ricevuta' : 'Inviata'}
                            </span>
                            <span className="text-[10px] text-slate-450 font-bold">Proposta di Scambio Ferie</span>
                          </div>

                          <h4 className="font-black text-white text-sm mt-1 uppercase">
                            {isIncoming 
                              ? `Richiesta da ${req.requester.name}` 
                              : `Proposta a ${req.targetUser?.name || "Collega"}`
                            }
                          </h4>

                          {/* Swap Comparison Block */}
                          <div className="flex items-center gap-3 mt-2 text-xs text-slate-350">
                            <div className="bg-white/5 px-2.5 py-1.5 rounded-lg">
                              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Periodo Richiedente</p>
                              <p className="font-bold">{periodTextReq}</p>
                            </div>
                            <ArrowLeftRight size={14} className="text-indigo-400" />
                            <div className="bg-white/5 px-2.5 py-1.5 rounded-lg">
                              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Periodo Collega</p>
                              <p className="font-bold">{periodTextTarget}</p>
                            </div>
                          </div>
                        </div>

                        {/* Status / Responses */}
                        <div className="flex items-center gap-2 self-end md:self-center">
                          {req.status === 'PENDING' ? (
                            isIncoming ? (
                              <>
                                <button 
                                  disabled={swapLoading}
                                  onClick={() => handleRespondVacationSwap?.(req.id, "REJECTED")}
                                  className="px-4 py-2 text-xs font-black text-slate-300 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-50"
                                >
                                  Rifiuta
                                </button>
                                <button 
                                  disabled={swapLoading}
                                  onClick={() => handleRespondVacationSwap?.(req.id, "ACCEPTED")}
                                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-black rounded-xl hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-500/10 transition-all flex items-center gap-1.5"
                                >
                                  {swapLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                                  Accetta
                                </button>
                              </>
                            ) : (
                              <span className="px-4 py-2 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase rounded-xl border border-amber-500/20">In attesa del collega...</span>
                            )
                          ) : (
                            <span className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl border ${
                              req.status === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' :
                              req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {req.status === 'ACCEPTED' ? 'Accettata (In attesa Visto Comando)' : 
                               req.status === 'REJECTED' ? 'Rifiutata' : 
                               'Scambio Concluso 🏆'}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* MODAL PROPONI SCAMBIO FERIE */}
      {showProposeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 bg-slate-950 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-indigo-400" />
                <h3 className="text-base font-black uppercase tracking-widest">Proponi Scambio Ferie</h3>
              </div>
              <button
                onClick={() => setShowProposeModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleProposeSubmit} className="p-6 flex-1 overflow-y-auto space-y-4 text-white">
              
              {/* Infobox limits */}
              <div className="bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-2xl text-[10px] text-indigo-300 leading-relaxed">
                <p className="font-black text-white uppercase tracking-wider mb-0.5">⚠️ Regola Scadenze</p>
                Il periodo da scambiare deve iniziare tra più di 30 giorni. Il sistema verificherà la data e bloccherà automaticamente la proposta se tardiva.
              </div>

              {modalLoading ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400 animate-pulse">
                  Caricamento dei tuoi periodi ferie...
                </div>
              ) : (
                <>
                  {/* Step 1: Select My Plan */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Seleziona il tuo Turno Ferie</label>
                    {myPlans.length === 0 ? (
                      <p className="text-xs text-red-400 font-bold bg-red-950/20 border border-red-500/20 p-3 rounded-xl">
                        Nessun periodo ferie assegnato/confermato trovato per te in questo anno.
                      </p>
                    ) : (
                      <select
                        value={selectedPlanId}
                        onChange={e => setSelectedPlanId(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
                      >
                        {myPlans.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {getPeriodLabel(p.period)} ({new Date(p.startDate).toLocaleDateString('it-IT')} - {new Date(p.endDate).toLocaleDateString('it-IT')})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Step 2: Select Colleague */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Seleziona il Collega con cui Scambiare</label>
                    {colleagues.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium">Caricamento colleghi in corso...</p>
                    ) : (
                      <select
                        value={selectedColleagueId}
                        onChange={e => setSelectedColleagueId(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-4 py-3 text-xs font-bold outline-none cursor-pointer"
                      >
                        {colleagues.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            👮‍♂️ {u.name} ({u.qualifica || "Agente"})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Submit buttons */}
                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowProposeModal(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={swapLoading || myPlans.length === 0}
                      className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {swapLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                      Invia Proposta
                    </button>
                  </div>
                </>
              )}

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
