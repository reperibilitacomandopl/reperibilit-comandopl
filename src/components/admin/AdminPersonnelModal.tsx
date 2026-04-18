"use client"
import { AdminPersonnelSlideOver } from "./AdminPersonnelSlideOver"

import React, { useState } from "react"
import { 
  X, Users, Search, Phone, Eye, Settings2, FileEdit, Trash2, 
  Calendar as CalendarIcon, Save, RefreshCw, AlertCircle, Briefcase,
  Award, Hash, FileText, Shield, Mail, ChevronRight, Star, Clock, Filter
} from "lucide-react"
import { useAdminState } from "./AdminStateContext"
import toast from "react-hot-toast"
import { useRouter, useParams } from "next/navigation"

interface AdminPersonnelModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminPersonnelModal({ isOpen, onClose }: AdminPersonnelModalProps) {
  // Dati di sistema per le select dal contesto centralizzato
  const { 
    allAgents, 
    shifts, 
    currentYear, 
    currentMonth, 
    fetchAgentBalances,
    rotationGroups,
    categories
  } = useAdminState()
  
  const [anagSearchQuery, setAnagSearchQuery] = useState("")
  const [anagSquadraFilter, setAnagSquadraFilter] = useState("ALL")
  const [anagQualificaFilter, setAnagQualificaFilter] = useState("ALL")
  const [editingAgent, setEditingAgent] = useState<any>(null)
  const [selectedAgentForDetails, setSelectedAgentForDetails] = useState<any>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<"ANAGRAFICA" | "SALDI" | "STORICO" | "NOTE">("ANAGRAFICA")
  const [agentBalances, setAgentBalances] = useState<any>(null)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [viewMode, setViewMode] = useState<"TABLE" | "CARDS">("TABLE")
  
  const activeAgentsForPartners = allAgents.filter(a => a.isActive)

  const router = useRouter()
  const params = useParams()
  const tenantSlug = params?.tenantSlug as string

  const uniqueSquadre = Array.from(new Set(allAgents.map(a => a.squadra).filter(Boolean))) as string[]

  const filteredAgents = allAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(anagSearchQuery.toLowerCase()) || 
                          agent.matricola.includes(anagSearchQuery)
    const matchesSquadra = anagSquadraFilter === "ALL" || agent.squadra === anagSquadraFilter
    return matchesSearch && matchesSquadra
  }).sort((a, b) => a.name.localeCompare(b.name))

  const getTodayShift = (agentId: string) => {
    return shifts.find(s => s.userId === agentId && new Date(s.date).toDateString() === new Date().toDateString())
  }

  if (!isOpen) return null

  const handleOpenDetails = async (agent: any) => {
    setSelectedAgentForDetails(agent)
    setActiveDetailTab("ANAGRAFICA")
    setIsLoadingBalances(true)
    const bals = await fetchAgentBalances(agent.id)
    setAgentBalances(bals)
    setIsLoadingBalances(false)
  }

  // Badge cue helpers
  const getShiftBadge = (shift: any) => {
    if (!shift) return null
    const t = shift.repType || shift.type
    const isRep = t?.includes('REP')
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${isRep ? 'bg-violet-100 text-violet-700' : 'bg-blue-50 text-blue-600'}`}>
        {t}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-50 flex items-center justify-center p-2 sm:p-4 lg:p-8" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header - Compatto */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center border border-white/5">
              <Users width={22} height={22} className="text-blue-400" />
            </div>
            <div>
              <h2 className="font-black text-xl uppercase tracking-tight">Anagrafica Personale</h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{filteredAgents.length} operatori • {uniqueSquadre.length} squadre</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-xl transition-all active:scale-95 border border-white/5 relative z-10">
            <X width={20} height={20} />
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap gap-3 items-center shrink-0">
          <div className="relative group flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" width={16} height={16} />
            <input 
              type="text" 
              placeholder="Cerca nome o matricola..." 
              value={anagSearchQuery}
              onChange={e => setAnagSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 font-bold text-slate-700 transition-all"
            />
          </div>
          <select 
            value={anagSquadraFilter} 
            onChange={e => setAnagSquadraFilter(e.target.value)} 
            className="px-4 py-2.5 text-[11px] bg-white border border-slate-200 rounded-xl font-black uppercase text-slate-600 focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            <option value="ALL">Tutte le squadre</option>
            {uniqueSquadre.map(sq => <option key={sq} value={sq}>{sq}</option>)}
          </select>
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5">
            <button onClick={() => setViewMode("TABLE")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "TABLE" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}>Lista</button>
            <button onClick={() => setViewMode("CARDS")} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === "CARDS" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}>Schede</button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {viewMode === "TABLE" ? (
            /* TABLE VIEW - Compact & Info-Dense */
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Operatore</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden sm:table-cell">Matricola</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden md:table-cell">Squadra</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden lg:table-cell">Qualifica</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden lg:table-cell">Turno Oggi</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden xl:table-cell">Contatto</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map(agent => {
                  const todayShift = getTodayShift(agent.id)
                  return (
                    <tr key={agent.id} className="hover:bg-blue-50/50 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0 ${agent.isUfficiale ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{agent.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {agent.isUfficiale && <Star width={10} height={10} className="text-amber-500 fill-amber-500" />}
                              <span className="text-[10px] text-slate-400 font-bold sm:hidden">{agent.matricola}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{agent.matricola}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-bold text-slate-600">{agent.squadra || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-[11px] font-bold text-slate-500">{agent.qualifica || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {getShiftBadge(todayShift) || <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex items-center gap-2">
                          {agent.phone && <Phone width={12} height={12} className="text-slate-400" />}
                          {agent.email && <Mail width={12} height={12} className="text-slate-400" />}
                          {agent.telegramChatId && <span className="text-[10px]">📱</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenDetails(agent)}
                            className="p-2 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded-lg transition-all"
                            title="Visualizza Fascicolo"
                          >
                            <Eye width={14} height={14} />
                          </button>
                          <button 
                            onClick={() => setEditingAgent(agent)}
                            className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-all"
                            title="Modifica Dati"
                          >
                            <Settings2 width={14} height={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            /* CARDS VIEW */
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map(agent => {
                const todayShift = getTodayShift(agent.id)
                return (
                  <div key={agent.id} className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className={`h-2 ${agent.isUfficiale ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-gradient-to-r from-slate-700 to-slate-600'}`}></div>
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 ${agent.isUfficiale ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-800 truncate">{agent.name}</p>
                          <p className="text-[10px] font-bold text-slate-400">{agent.matricola} • {agent.squadra || '—'}</p>
                        </div>
                        {agent.isUfficiale && <Star width={14} height={14} className="text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-slate-400">{agent.qualifica || 'Agente'}</span>
                        {getShiftBadge(todayShift)}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenDetails(agent)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200 hover:border-blue-200"
                        >
                          <Eye width={13} height={13} /> Dettagli
                        </button>
                        <button 
                          onClick={() => setEditingAgent(agent)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <Settings2 width={13} height={13} /> Modifica
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {filteredAgents.length} di {allAgents.length} operatori
          </p>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Sentinel • Gestione Risorse Umane
          </p>
        </div>
      </div>

      {/* DASHBOARD DETTAGLI AGENTE (FASCICOLO) */}
      {selectedAgentForDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-2 sm:p-4 lg:p-12 animate-in fade-in" onClick={() => setSelectedAgentForDetails(null)}>
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              
              {/* Header Fascicolo */}
              <div className={`${selectedAgentForDetails.isUfficiale ? 'bg-gradient-to-r from-indigo-900 to-indigo-950' : 'bg-gradient-to-r from-slate-800 to-slate-900'} px-8 py-8 text-white shrink-0 relative overflow-hidden`}>
                 <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
                 <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black border border-white/10">
                         {selectedAgentForDetails.name.slice(0,2).toUpperCase()}
                       </div>
                       <div>
                          <h2 className="text-3xl font-black uppercase tracking-tight">{selectedAgentForDetails.name}</h2>
                          <div className="flex flex-wrap gap-3 mt-2">
                             <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Matr. {selectedAgentForDetails.matricola}</span>
                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{selectedAgentForDetails.qualifica || 'N/D'}</span>
                             {selectedAgentForDetails.isUfficiale && <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1"><Star width={10} height={10} className="fill-amber-400" /> Ufficiale</span>}
                          </div>
                       </div>
                    </div>
                    <button onClick={() => setSelectedAgentForDetails(null)} className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all border border-white/5">
                      <X width={24} height={24} />
                    </button>
                 </div>
                 
                 {/* Tabs */}
                 <div className="flex gap-2 mt-8 overflow-x-auto no-scrollbar">
                    {['ANAGRAFICA', 'SALDI', 'STORICO', 'NOTE'].map(tab => (
                       <button 
                         key={tab} 
                         onClick={() => setActiveDetailTab(tab as any)}
                         className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeDetailTab === tab ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'}`}
                       >
                         {tab === 'ANAGRAFICA' ? '📋 Profilo' : tab === 'SALDI' ? '📊 Saldi' : tab === 'STORICO' ? '🕒 Storico' : '📝 Note'}
                       </button>
                    ))}
                 </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                 {activeDetailTab === 'ANAGRAFICA' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-5"><Award width={14} height={14} className="text-blue-500" /> Profilo</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between"><span className="text-xs font-bold text-slate-400">Data di Nascita</span><span className="text-xs font-black text-slate-800">{selectedAgentForDetails.dataDiNascita ? new Date(selectedAgentForDetails.dataDiNascita).toLocaleDateString('it-IT') : '—'}</span></div>
                              <div className="flex justify-between"><span className="text-xs font-bold text-slate-400">Squadra</span><span className="text-xs font-black text-slate-800">{selectedAgentForDetails.rotationGroup?.name || selectedAgentForDetails.squadra || '—'}</span></div>
                              <div className="flex justify-between"><span className="text-xs font-bold text-slate-400">Contratto</span><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{selectedAgentForDetails.tipoContratto || 'FULL-TIME (36h)'}</span></div>
                              <div className="flex justify-between"><span className="text-xs font-bold text-slate-400">Assunzione</span><span className="text-xs font-black text-slate-800">{selectedAgentForDetails.dataAssunzione ? new Date(selectedAgentForDetails.dataAssunzione).toLocaleDateString('it-IT') : '—'}</span></div>
                           </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-5"><Shield width={14} height={14} className="text-rose-500" /> Abilitazioni & Servizio</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400">Patente</span>
                                {(() => {
                                  const d = selectedAgentForDetails.scadenzaPatente
                                  const isExpired = d && new Date(d) < new Date()
                                  return <span className={`text-xs font-black ${isExpired ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md' : 'text-slate-800'}`}>{d ? new Date(d).toLocaleDateString('it-IT') : '—'} {isExpired ? '⚠️' : ''}</span>
                                })()}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400">Porto d&apos;Armi</span>
                                {(() => {
                                  const d = selectedAgentForDetails.scadenzaPortoArmi
                                  const isExpired = d && new Date(d) < new Date()
                                  return <span className={`text-xs font-black ${isExpired ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md' : 'text-slate-800'}`}>{d ? new Date(d).toLocaleDateString('it-IT') : '—'} {isExpired ? '⚠️' : ''}</span>
                                })()}
                              </div>
                              <div className="pt-2 border-t border-slate-50">
                                 <span className="text-[10px] font-black text-slate-300 uppercase block mb-2">Giorni Fissi:</span>
                                 <div className="flex gap-1">
                                    {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map(d => {
                                       const isFixed = selectedAgentForDetails.fixedServiceDays?.includes(d)
                                       return <span key={d} className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black ${isFixed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>{d[0]}</span>
                                    })}
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-5"><Users width={14} height={14} className="text-emerald-500" /> Preferenze Partner (Fallback)</h3>
                                 <div className="space-y-2">
                                    {selectedAgentForDetails.defaultPartnerIds && selectedAgentForDetails.defaultPartnerIds.length > 0 ? (
                                       selectedAgentForDetails.defaultPartnerIds.map((pid: string, idx: number) => {
                                          const pName = allAgents.find(a => a.id === pid)?.name || 'Sconosciuto'
                                          return (
                                             <div key={pid} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[9px] font-black">{idx+1}°</span>
                                                <span className="text-xs font-black text-slate-700">{pName}</span>
                                             </div>
                                          )
                                       })
                                    ) : (
                                       <p className="text-xs font-bold text-slate-300 italic">Nessuna preferenza impostata</p>
                                    )}
                                 </div>
                              </div>
                              <div>
                                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-5"><Mail width={14} height={14} className="text-blue-500" /> Recapiti Operativi</h3>
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <Mail width={14} height={14} className="text-slate-400 shrink-0" />
                                      <span className="text-xs font-bold text-slate-600 truncate">{selectedAgentForDetails.email || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <Phone width={14} height={14} className="text-slate-400 shrink-0" />
                                      <span className="text-xs font-bold text-slate-600">{selectedAgentForDetails.phone || '—'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                    </div>
                 )}
                 {activeDetailTab === 'STORICO' && (
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[300px] text-center">
                       <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                          <FileText width={32} height={32} />
                       </div>
                       <h3 className="text-lg font-black text-slate-800 mb-2">Dossier Completo Servizi</h3>
                       <p className="text-sm text-slate-500 mb-6 max-w-sm font-medium">Visualizza lo storico completo delle richieste e delle assegnazioni operative in una pagina dedicata.</p>
                       <button 
                         onClick={() => {
                            setSelectedAgentForDetails(null);
                            router.push(`/${tenantSlug}/admin/risorse/${selectedAgentForDetails.id}`);
                         }}
                         className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                       >
                          Apri Fascicolo Storico
                       </button>
                    </div>
                 )}
                 {activeDetailTab === 'SALDI' && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                       {isLoadingBalances ? (
                         <div className="p-16 text-center">
                           <RefreshCw width={24} height={24} className="animate-spin text-indigo-500 mx-auto mb-3" />
                           <p className="text-xs font-black uppercase text-slate-400">Caricamento saldi...</p>
                         </div>
                       ) : agentBalances?.balance?.details?.length > 0 ? (
                          <table className="w-full text-left">
                             <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Causale</th>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Iniziali</th>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-center">Utilizzati</th>
                                   <th className="px-6 py-4 text-[10px] font-black uppercase text-indigo-600 text-center bg-indigo-50/50">Residui</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {agentBalances.balance.details.map((d: any) => (
                                   <tr key={d.code} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 font-black text-slate-800 text-sm">{d.label || d.code}</td>
                                      <td className="px-6 py-4 font-bold text-slate-500 text-sm text-center">{d.initialValue}</td>
                                      <td className="px-6 py-4 font-bold text-rose-500 text-sm text-center">−{d.used || 0}</td>
                                      <td className="px-6 py-4 font-black text-indigo-700 text-lg text-center bg-indigo-50/30">{d.residue}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       ) : <p className="p-16 text-center font-black text-slate-300">Nessun dato saldo per {currentYear}</p>}
                    </div>
                 )}
                 {activeDetailTab === 'NOTE' && (
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm min-h-[200px]">
                       <h3 className="text-[10px] font-black uppercase text-amber-500 mb-4 flex items-center gap-2"><FileText width={14} height={14} /> Note Interne</h3>
                       <p className="text-slate-600 font-bold whitespace-pre-wrap text-sm leading-relaxed">{selectedAgentForDetails.noteInterne || "Nessuna nota registrata."}</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Slide-over per Modifica Operatore */}
      {editingAgent && (
        <AdminPersonnelSlideOver
          editingAgent={editingAgent}
          setEditingAgent={setEditingAgent}
          activeAgentsForPartners={activeAgentsForPartners}
          categories={categories}
          rotationGroups={rotationGroups}
          onSave={async (id, payload) => {
             const res = await fetch("/api/admin/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: id, ...payload })
             });
             if (res.ok) {
                if (payload.action === "resetPassword") {
                   await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, action: "resetPassword", newPassword: payload.newPassword }) });
                }
                toast.success("Operatore aggiornato con successo");
                router.refresh();
                setEditingAgent(null);
                return true;
             } else {
                toast.error("Errore salvataggio!");
                return false;
             }
          }}
          onDelete={async (id) => {
             await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) });
             toast.success("Agente eliminato");
             router.refresh();
          }}
        />
      )}
    </div>
  )
}
