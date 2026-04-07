"use client"

import { useState, useEffect, useMemo } from "react"
import { Loader2, Save, RotateCcw, ArrowRight, Info, Hash, Search, SearchSlash, AlertTriangle, Layers } from "lucide-react"
import toast from "react-hot-toast"
import { AGENDA_CATEGORIES, getUnit } from "../utils/agenda-codes"

export default function AdminInitialBalances({ allAgents, currentYear, onClose }: { allAgents?: any[], currentYear?: number, onClose?: () => void }) {
  const [loading, setLoading] = useState(!allAgents)
  const [saving, setSaving] = useState(false)
  const [agents, setAgents] = useState<any[]>(allAgents || [])
  const [year, setYear] = useState(currentYear || new Date().getFullYear())
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>({})
  const [originalGrid, setOriginalGrid] = useState<Record<string, Record<string, number>>>({})
  const [usage, setUsage] = useState<any>(null)

  // Master-Detail State
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Solo i codici che vogliamo gestire come "Saldi Iniziali"
  const relevantItems = AGENDA_CATEGORIES.flatMap(cat => cat.items).filter(item => 
    ["0015", "0016", "0010", "0112", "0111", "0110", "0098", "0095", "0097", "0096", "0031", "0038", "0014", "0002", "0004", "0005", "0009"].includes(item.code)
  )

  useEffect(() => {
    loadData()
  }, [year])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/balances?year=${year}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const fetchedAgents = data.agents || []
      setAgents(fetchedAgents)
      setUsage(data.usage)

      // Se non c'è un agente selezionato, seleziona il primo
      if (!selectedAgentId && fetchedAgents.length > 0) {
        setSelectedAgentId(fetchedAgents[0].id)
      }

      // Costruisci il form state
      const initialGrid: Record<string, Record<string, number>> = {}
      fetchedAgents.forEach((ag: any) => {
        initialGrid[ag.id] = {}
        relevantItems.forEach(item => {
          const balance = data.balances.find((b: any) => b.userId === ag.id)
          const detail = balance?.details.find((d: any) => d.code === item.code)
          initialGrid[ag.id][item.code] = detail?.initialValue || 0
        })
      })
      setGrid(JSON.parse(JSON.stringify(initialGrid)))
      setOriginalGrid(JSON.parse(JSON.stringify(initialGrid)))
    } catch (err: any) {
      toast.error(err.message || "Errore caricamento")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (agentId: string, code: string, val: string) => {
    const num = parseFloat(val) || 0
    setGrid(prev => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [code]: num
      }
    }))
  }

  const applyToAll = (code: string, val: number) => {
    if (!confirm(`Vuoi copiare il valore ${val} a TUTTI gli ${filteredAgents.length} operatori filtrati in lista?`)) return
    setGrid(prev => {
      const next = { ...prev }
      filteredAgents.forEach(ag => {
        if (!next[ag.id]) next[ag.id] = {}
        next[ag.id][code] = val
      })
      return next
    })
    toast.success(`Valore copiato a ${filteredAgents.length} operatori`)
  }

  const handleSave = async () => {
    setSaving(true)
    const updates: any[] = []

    Object.keys(grid).forEach(userId => {
      relevantItems.forEach(item => {
        if (grid[userId][item.code] !== originalGrid[userId][item.code]) {
          updates.push({
            userId,
            code: item.code,
            label: item.label,
            initialValue: grid[userId][item.code],
            unit: getUnit(item.code)
          })
        }
      })
    })

    if (updates.length === 0) {
      toast("Nessuna modifica da salvare", { icon: "ℹ️" })
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/balances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, updates })
      })
      if (res.ok) {
        toast.success(`Salvati ${updates.length} valori!`)
        loadData()
      } else {
        throw new Error()
      }
    } catch {
      toast.error("Errore durante il salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const handleCarryOver = async () => {
    if (!confirm(`Vuoi riportare i saldi residui di ferie (0015) dall'anno ${year - 1} all'anno ${year} (come Ferie Anni Precedenti 0016)?`)) return
    
    setSaving(true)
    try {
      const res = await fetch("/api/admin/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromYear: year - 1, toYear: year })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        loadData()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || "Errore riporto saldi")
    } finally {
      setSaving(false)
    }
  }

  const calculateUsed = (userId: string, code: string) => {
    if (!usage) return 0
    const item = relevantItems.find(i => i.code === code)
    if (!item) return 0

    if (item.unit === "HOURS") {
      const agenda = usage.agendaSums.find((s: any) => s.userId === userId && s.code === code)
      return agenda?._sum.hours || 0
    } else {
      const shifts = usage.shiftsCount.find((s: any) => s.userId === userId && s.type === code)
      return shifts?._count._all || 0
    }
  }

  // Derived state
  const filteredAgents = useMemo(() => {
    return agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || (a.matricola && a.matricola.includes(searchQuery)))
  }, [agents, searchQuery])

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null
  const hasChanges = JSON.stringify(grid) !== JSON.stringify(originalGrid)

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="text-slate-500 font-bold animate-pulse">Caricamento Saldi Iniziali...</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Hash className="text-indigo-600" size={28} />
            Impostazione Saldi <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{year}</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Scegli un operatore e configura i saldi spettanti.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setYear(year - 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"><RotateCcw size={16} /></button>
            <span className="px-4 font-black text-slate-900">{year}</span>
            <button onClick={() => setYear(year + 1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 rotate-180"><RotateCcw size={16} /></button>
          </div>

          <button 
            onClick={handleCarryOver}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg"
          >
            <ArrowRight size={16} /> Riporto Anno Prec.
          </button>

          <button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${hasChanges ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 animate-pulse' : 'bg-slate-100 text-slate-400 cursor-not-allowed hidden md:flex'}`}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
            Salva Modifiche Globali
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
           <button 
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-2xl bg-indigo-600 text-white hover:bg-indigo-700 animate-bounce`}
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
            Salva Modifiche
          </button>
        </div>
      )}

      {/* Main Layout: Master Detail */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
        {/* LATO SINISTRO (MASTER): Lista Agenti */}
        <div className="w-full lg:w-80 flex flex-col gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 shrink-0 overflow-hidden">
          <div className="relative shrink-0">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Cerca operatore..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
             />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
             {filteredAgents.length === 0 && (
                <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                   <SearchSlash size={24} />
                   <p className="text-xs font-bold uppercase">Nessun operatore</p>
                </div>
             )}
             {filteredAgents.map(agent => (
               <button
                 key={agent.id}
                 onClick={() => setSelectedAgentId(agent.id)}
                 className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${selectedAgentId === agent.id ? 'bg-indigo-50 border-2 border-indigo-200 shadow-sm scale-[1.02]' : 'bg-transparent hover:bg-slate-50 border-2 border-transparent'}`}
               >
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${agent.isUfficiale ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {agent.name.split(' ').map((n:any) => n[0]).join('').slice(0,2)}
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className={`text-sm font-bold truncate ${selectedAgentId === agent.id ? 'text-indigo-900' : 'text-slate-800'}`}>{agent.name}</p>
                   {agent.matricola && <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{agent.isUfficiale ? 'Uff.' : 'Ag.'} Matr. {agent.matricola}</p>}
                 </div>
               </button>
             ))}
          </div>
        </div>

        {/* LATO DESTRO (DETAIL): Valori dell'Agente Selezionato */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 overflow-y-auto custom-scrollbar relative">
          {selectedAgent ? (
             <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-6">
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedAgent.name}</h2>
                      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                         Saldi Iniziali e Spettanze Anno {year}
                      </p>
                   </div>
                   {agentHasChanges(selectedAgent.id) && (
                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-lg text-xs font-black uppercase flex items-center gap-2 animate-pulse">
                         <AlertTriangle size={14} /> Modifiche non salvate
                      </span>
                   )}
                </div>

                <div className="flex flex-col gap-3">
                   {relevantItems.map(item => {
                      const initial = grid[selectedAgent.id]?.[item.code] || 0
                      const original = originalGrid[selectedAgent.id]?.[item.code] || 0
                      const used = calculateUsed(selectedAgent.id, item.code)
                      const remaining = initial - used
                      const isChanged = initial !== original

                      return (
                         <div key={item.code} className={`flex items-center gap-3 sm:gap-4 bg-white border-2 rounded-2xl p-3 sm:p-4 transition-all duration-300 ${isChanged ? 'border-amber-400 shadow-md scale-[1.01] z-10' : 'border-slate-100 hover:border-slate-300'}`}>
                            <div className="w-14 h-12 flex flex-col justify-center items-center bg-slate-100 rounded-xl shrink-0">
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.code}</span>
                               <span className={`text-[8px] font-black mt-0.5 px-1.5 rounded-full ${item.unit === 'HOURS' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.unit === 'HOURS' ? 'ORE' : 'GG'}</span>
                            </div>
                            
                            <div className="flex-1 min-w-[100px]">
                               <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight text-balance">{item.label}</h3>
                            </div>
                            
                            {/* Stats */}
                            <div className="hidden lg:flex items-center gap-2 shrink-0">
                               <div className="flex flex-col items-center justify-center w-[85px] py-1.5 bg-rose-50 rounded-xl border border-rose-100/50">
                                  <span className="text-[8px] text-rose-800 font-bold uppercase tracking-widest leading-none mb-1">Usato</span>
                                  <span className="text-sm font-black text-rose-600 leading-none">{used}</span>
                               </div>
                               
                               <div className={`flex flex-col items-center justify-center w-[85px] py-1.5 rounded-xl border ${remaining < 0 ? 'bg-red-50 border-red-200' : remaining === 0 ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                  <span className={`text-[8px] font-bold uppercase tracking-widest leading-none mb-1 ${remaining < 0 ? 'text-red-800' : remaining === 0 ? 'text-slate-500' : 'text-emerald-800'}`}>Residuo</span>
                                  <span className={`text-sm font-black leading-none ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>{remaining}</span>
                               </div>
                            </div>

                            {/* Mobile Stats (Only visible below LG breakpoint) */}
                            <div className="lg:hidden flex flex-col items-end justify-center shrink-0 pr-2">
                               <span className="text-[10px] font-bold text-rose-600">Usati: {used}</span>
                               <span className={`text-[10px] font-bold ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-slate-400' : 'text-emerald-600'}`}>Res.: {remaining}</span>
                            </div>

                            {/* Actions & Input */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 border-l border-slate-100 pl-3 sm:pl-4 ml-1">
                               <div className="flex flex-col items-center w-16 sm:w-20">
                                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Spettante</span>
                                  <input 
                                     type="number"
                                     step={item.unit === 'HOURS' ? '0.5' : '1'}
                                     value={initial || ""}
                                     onChange={(e) => handleChange(selectedAgent.id, item.code, e.target.value)}
                                     placeholder="0"
                                     className={`w-full text-center bg-slate-50 border rounded-xl py-1.5 sm:py-2 text-sm sm:text-lg font-black focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all ${isChanged ? 'border-amber-400 text-amber-700 bg-amber-50 shadow-inner' : 'border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                                  />
                               </div>
                               <button
                                  onClick={() => applyToAll(item.code, initial)}
                                  title="Applica questo valore a tutti gli agenti in lista"
                                  className="mt-4 p-2 sm:p-2.5 bg-slate-100 hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm active:scale-95 border border-transparent hover:border-indigo-200"
                               >
                                  <Layers size={18} />
                               </button>
                            </div>
                         </div>
                      )
                   })}
                </div>
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                <Hash size={48} className="opacity-20" />
                <p className="text-lg font-bold">Seleziona un operatore dalla lista</p>
             </div>
          )}
        </div>
      </div>
    </div>
  )

  function agentHasChanges(agentId: string) {
     return relevantItems.some(i => grid[agentId]?.[i.code] !== originalGrid[agentId]?.[i.code])
  }
}
