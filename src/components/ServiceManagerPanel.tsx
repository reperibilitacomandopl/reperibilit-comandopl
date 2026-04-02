"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, User, Shield, Car, Printer, RefreshCw, GripVertical, Info, Clock, AlertTriangle, Wand2, Radio } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { isAssenza, formatShiftCode } from "../utils/shift-logic"

export default function ServiceManagerPanel({ onClose }: { onClose?: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  
  const [users, setUsers] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    
    try {
      const res = await fetch(`/api/admin/shifts/daily?date=${y}-${m}-${d}`)
      const data = await res.json()
      if (data.users) setUsers(data.users)
      if (data.shifts) setShifts(data.shifts)
      if (data.absences) setAbsences(data.absences)
      if (data.categories) setCategories(data.categories)
      if (data.vehicles) setVehicles(data.vehicles)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [currentDate])

  const changeDate = (days: number) => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + days)
    setCurrentDate(next)
  }

  const assignService = async (userId: string, targetTypeString: string, categoryId: string | null = null, typeId: string | null = null, vehicleId: string | null = null, timeRange: string | null = null, serviceDetails: string | null = null) => {
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")

    // Trova i valori esistenti per preservare vehicleId se non stiamo cambiando macro categoria (M7/P14)
    const existingObj = shifts.find(s => s.userId === userId)
    let newVehicleId = vehicleId;
    if(vehicleId === undefined && existingObj?.vehicleId) {
        newVehicleId = existingObj.vehicleId;
    }

    try {
      const res = await fetch("/api/admin/shifts/daily", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date: `${y}-${m}-${d}`,
          type: targetTypeString,
          serviceCategoryId: categoryId,
          serviceTypeId: typeId,
          vehicleId: newVehicleId,
          timeRange: timeRange,
          serviceDetails: serviceDetails
        })
      })
      if (!res.ok) throw new Error("Errore salvataggio")
      loadData()
    } catch (e) {
      console.error(e)
      toast.error("Errore di rete durante l'assegnazione")
    }
  }

  // --- Drag and Drop logic
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("userId", userId)
  }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDropToService = (e: React.DragEvent, shiftTypeRange: string, catId: string, typeId: string) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      const userShift = shifts.find(s => s.userId === userId)
      let finalType = shiftTypeRange === "M" ? "M7" : shiftTypeRange === "P" ? "P14" : shiftTypeRange;
      
      // Preserve original shift code if it aligns with the macro-phase (M vs P) to preserve 7,30 or 15,30
      if (userShift && userShift.type.startsWith(shiftTypeRange) && userShift.type !== "M" && userShift.type !== "P") {
          finalType = userShift.type;
      }

      assignService(userId, finalType, catId, typeId)
      toast.success("Agente riassegnato al servizio")
    }
  }

  const handleDropToCategory = (e: React.DragEvent, shiftTypeRange: string, catId: string) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      const cat = categories.find(c => c.id === catId)
      const firstType = cat?.types?.[0]
      if (firstType) {
        handleDropToService(e, shiftTypeRange, catId, firstType.id)
      } else {
        toast.error("Nessun servizio disponibile in questa categoria")
      }
    }
  }

  const autoGenerate = async () => {
    if (!confirm("Questa operazione sovrascriverà le assegnazioni non salvate per la data selezionata. Procedere?")) return
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    
    try {
      const res = await fetch("/api/admin/ods/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: `${y}-${m}-${d}` })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Configurato! ${data.count} assegnazioni effettuate.`)
        loadData()
      } else {
        toast.error(data.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setLoading(false)
  }

  const handleRemoveService = (userId: string, originalTimeRange: string) => {
    assignService(userId, originalTimeRange, null, null, null)
  }

  const toggleLink = async (shiftId: string, currentGroupId: string | null) => {
    // Se c'è già un gruppo, lo separiamo.
    // Altrimenti, per ora creiamo un gruppo basato sul timestamp per "unire"
    const newGroupId = currentGroupId ? null : `manual_${Date.now()}`
    try {
        const res = await fetch("/api/admin/shifts/daily", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: shifts.find(s => s.id === shiftId)?.userId,
              date: currentDate.toISOString().split("T")[0],
              patrolGroupId: newGroupId
            })
        })
        if(res.ok) loadData()
    } catch {}
  }

  // Identificazione stati agenti
  const indisponibili = users.filter(u => 
    shifts.some(s => s.userId === u.id && isAssenza(s.type))
  )

  const disponibiliNonAssegnati = users.filter(u => {
    if (indisponibili.includes(u)) return false
    const shift = shifts.find(s => s.userId === u.id)
    if (!shift) return true // Nessun turno
    if (shift.serviceTypeId) return false // Già in un servizio
    return true
  }).sort((a,b) => {
      // Ordiniamo prima quelli he hanno "M7" o "P14" (turni generici ma senza destinazione)
      const sa = shifts.find(s => s.userId === a.id)?.type || ""
      const sb = shifts.find(s => s.userId === b.id)?.type || ""
      return sa.localeCompare(sb)
  })

  // Funzione Rendering Blocco Fase (Mattino / Pomeriggio)
  const renderFaseBlocco = (titolo: string, filtroTurni: string[]) => {
      // Trova tutti gli agenti operativi in questa fase
      const agentiFase = shifts.filter(s => {
          if (indisponibili.some(indisp => indisp.id === s.userId)) return false;
          return filtroTurni.some(t => s.type.startsWith(t)) && s.serviceTypeId;
      });

      // Separa Ufficiali da Agenti
      const ufficialiInServizio = agentiFase.filter(s => {
          const u = users.find(user => user.id === s.userId);
          return u?.isUfficiale;
      });

      return (
        <div className="flex-1 flex flex-col min-w-[380px]">
            <div className="bg-slate-900 border-b-2 border-blue-600 px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-lg">
                <span className="font-black text-slate-100 tracking-widest text-sm uppercase">{titolo}</span>
                <span className="text-[10px] text-blue-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                   {agentiFase.length} In Servizio
                </span>
            </div>
            
            <div className="flex-1 bg-slate-100 p-3 space-y-4 overflow-y-auto custom-scrollbar relative">
                
                {/* SEZIONE UFFICIALI DI TURNO */}
                <div className="bg-blue-900/10 border-2 border-blue-600/20 rounded-2xl overflow-hidden mb-4">
                    <div className="bg-blue-700 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Shield size={14} /> Ufficiali di Servizio ({ufficialiInServizio.length})
                    </div>
                    <div className="p-2 space-y-2">
                        {ufficialiInServizio.map(shiftAssegnato => {
                            const agente = users.find(u => u.id === shiftAssegnato.userId)
                            if(!agente) return null
                            return renderAgentCard(agente, shiftAssegnato)
                        })}
                        {ufficialiInServizio.length === 0 && (
                            <div className="py-4 text-center text-slate-400 text-[10px] font-bold uppercase italic">Nessun Ufficiale Assegnato</div>
                        )}
                    </div>
                </div>

                {categories.length === 0 && <div className="text-center text-slate-400 text-xs italic mt-10">Nessuna Categoria Servizio Rilevata</div>}
                
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div 
                            onDragOver={handleDragOver}
                            onDrop={e => handleDropToCategory(e, filtroTurni[0], cat.id)}
                            className="bg-slate-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors group"
                        >
                            <span className="text-slate-200 flex items-center gap-2">
                                {cat.name}
                                <span className="opacity-0 group-hover:opacity-100 text-[8px] bg-blue-600 px-1 inline-block rounded">Rilascia qui per assegnazione rapida</span>
                            </span>
                        </div>
                        
                        <div className="p-2 space-y-2">
                            {cat.types.map((tipo: any) => {
                                // Agenti (NON ufficiali) in questo servizio
                                const agentiInQuestoServizio = agentiFase.filter(s => {
                                    const u = users.find(user => user.id === s.userId);
                                    return s.serviceTypeId === tipo.id && !u?.isUfficiale;
                                });
                                
                                return (
                                <div key={tipo.id} className="border border-slate-200 rounded-lg overflow-hidden transition-all group-hover:border-blue-400">
                                    <div 
                                        onDragOver={handleDragOver} 
                                        onDrop={e => handleDropToService(e, filtroTurni[0], cat.id, tipo.id)}
                                        className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-blue-500" />
                                            {tipo.name}
                                        </div>
                                        <span className="text-[10px] text-slate-400 italic">Trascina Agente Qui</span>
                                    </div>
                                    
                                    <div className="bg-white divide-y divide-slate-100">
                                        {agentiInQuestoServizio.map(shiftAssegnato => {
                                            const agente = users.find(u => u.id === shiftAssegnato.userId)
                                            if(!agente) return null
                                            return renderAgentCard(agente, shiftAssegnato)
                                        })}
                                        {agentiInQuestoServizio.length === 0 && (
                                            <div className="p-3 text-center text-[10px] uppercase font-bold tracking-widest text-slate-300 bg-slate-50 border-t border-dashed border-slate-200">
                                                Nessun equipaggio
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )
  }

  // Refactoring card agente per maggiore controllo
  const renderAgentCard = (agente: any, shiftAssegnato: any) => {
    const timeRangeStr = shiftAssegnato.timeRange || (shiftAssegnato.type==="M7" ? "07:00-13:00" : shiftAssegnato.type==="M8" ? "08:00-14:00" : "14:00-20:00")

    return (
        <div key={agente.id} className="p-2 flex flex-col hover:bg-slate-50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2 mb-2">
                <div className="flex items-center gap-3">
                   <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)] ${agente.isUfficiale ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                   <div className="flex flex-col">
                       <span className="text-xs font-black text-slate-800 tracking-wide uppercase">
                           {agente.isUfficiale && <span className="text-[9px] text-blue-600 font-black mr-1">[UFF]</span>}
                           {agente.name}
                       </span>
                       <div className="flex items-center gap-2">
                         <input 
                            type="text" 
                            defaultValue={timeRangeStr}
                            onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, e.target.value)}
                            className="text-[10px] font-bold text-slate-500 bg-transparent border-none p-0 focus:ring-0 w-24"
                            placeholder="hh:mm-hh:mm"
                         />
                         {agente.servizio && <span className="text-[8px] font-bold text-blue-400 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">{agente.servizio}</span>}
                       </div>
                   </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <select 
                        value={shiftAssegnato.vehicleId || ""}
                        onChange={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, e.target.value)}
                        className="text-[10px] bg-slate-100 font-bold px-2 py-1.5 rounded-md border border-slate-200 focus:border-blue-500 transition-all text-slate-700 max-w-[120px] truncate"
                    >
                        <option value="">+ Veicolo</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>

                    <button 
                        onClick={() => toggleLink(shiftAssegnato.id, shiftAssegnato.patrolGroupId)}
                        className={`p-1.5 rounded-md transition-colors ${shiftAssegnato.patrolGroupId ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-300 hover:text-indigo-400 hover:bg-indigo-50'}`}
                        title={shiftAssegnato.patrolGroupId ? "Separa Pattuglia" : "Abbiina ad altro membro (Crea Pattuglia)"}
                    >
                        <Radio size={14} className={shiftAssegnato.patrolGroupId ? 'rotate-90' : ''} />
                    </button>

                    <button 
                        onClick={() => handleRemoveService(agente.id, shiftAssegnato.type)} 
                        className="text-slate-300 hover:text-red-500 p-1.5 bg-slate-50 hover:bg-red-50 rounded-md transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>
            {/* Campo Dettagli/Zona */}
            <input 
                type="text"
                defaultValue={shiftAssegnato.serviceDetails || ""}
                onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, shiftAssegnato.timeRange, e.target.value)}
                placeholder="Inserisci dettagli servizio o zona..."
                className="w-full text-[10px] font-medium text-slate-600 bg-white border border-slate-100 rounded px-2 py-1 focus:border-blue-400 outline-none"
            />
        </div>
    )
  }


  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative font-sans">
      
      {/* HEADER COMMAND CENTER */}
      <div className="bg-[#0f172a] text-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 border-b border-slate-800 z-20 shadow-2xl">
        <div className="flex items-center gap-4 mb-3 sm:mb-0">
          <div className="bg-blue-600 p-2 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)]">
             <CalendarIcon className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">SALA OPERATIVA</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-widest uppercase">Pianificazione OdS e Pattuglie</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-inner">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"><ChevronLeft size={20}/></button>
                <div className="px-6 font-black tracking-widest uppercase text-white shadow-sm">
                    {currentDate.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"><ChevronRight size={20}/></button>
            </div>

            <button 
                onClick={autoGenerate}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 text-xs tracking-wider"
                title="Autocompila Ordine di Servizio basato sui Template"
            >
                <Wand2 size={16}/> {loading ? "..." : "AUTOCONFIGURA"}
            </button>

            <Link href="/stampa-ods" className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
               <Printer size={16}/> Stampa OdS
            </Link>

            {onClose && (
                <button onClick={onClose} className="hidden sm:flex px-4 py-2.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 text-slate-200 hover:text-rose-200 rounded-xl text-xs font-bold uppercase transition-all shadow-sm">
                    Chiudi
                </button>
            )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900"></div>
            <Loader2 size={48} className="animate-spin text-blue-500 mb-4 relative z-10" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs relative z-10 animate-pulse">Sincronizzazione Database...</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR FORZE A DISPOSIZIONE */}
          <div className="w-[280px] bg-slate-800/50 border-r border-slate-800 flex flex-col shrink-0">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                 <h3 className="text-slate-200 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                     <User size={16} className="text-blue-500"/> Forze in Campo
                 </h3>
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Trascina nei box a destra</p>
             </div>
             
             <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">
                 
                 {/* Disabili / Assenti */}
                 <div>
                     <div className="flex items-center gap-2 px-2 mb-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                         <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Fuori Servizio ({indisponibili.length})</span>
                     </div>
                     <div className="space-y-1">
                         {indisponibili.map(u => {
                            const motive = absences.find(a => a.userId === u.id)?.code || shifts.find(s => s.userId === u.id)?.type || "NON DISP."
                            return (
                                <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2 flex justify-between items-center opacity-70">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-400 uppercase">{u.name}</span>
                                      {u.servizio && <span className="text-[8px] font-bold text-rose-400/70 uppercase">{u.servizio}</span>}
                                    </div>
                                    <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-1.5 rounded">{motive}</span>
                                </div>
                            )
                         })}
                     </div>
                 </div>

                 {/* Disponibili Da Piazzare */}
                 <div>
                     <div className="flex items-center gap-2 px-2 mb-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                         <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">A Disposizione ({disponibiliNonAssegnati.length})</span>
                     </div>
                     <div className="space-y-1.5">
                         {disponibiliNonAssegnati.map(u => {
                            const baseShift = shifts.find(s => s.userId === u.id)?.type || "?"
                            return (
                                <div 
                                    key={u.id} 
                                    draggable 
                                    onDragStart={e => handleDragStart(e, u.id)}
                                    className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 flex justify-between items-center cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors hover:shadow-[0_0_10px_rgba(59,130,246,0.2)] group"
                                >
                                    <div className="flex items-center gap-2">
                                        <GripVertical size={14} className="text-slate-600 group-hover:text-blue-400"/>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-200 uppercase">{u.name}</span>
                                          {u.servizio && <span className="text-[8px] font-bold text-blue-400/70 uppercase">{u.servizio}</span>}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black px-1.5 rounded ${baseShift.startsWith("M") ? 'bg-blue-900/50 text-blue-300 border border-blue-800' : baseShift.startsWith("P") ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-800' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                                        {baseShift}
                                    </span>
                                </div>
                            )
                         })}
                         {disponibiliNonAssegnati.length === 0 && (
                             <div className="text-center p-4 bg-emerald-900/20 border border-emerald-900/30 rounded-lg">
                                 <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2 opacity-50"/>
                                 <p className="text-[10px] text-emerald-400 font-black tracking-widest uppercase opacity-70">Tutti operativi</p>
                             </div>
                         )}
                     </div>
                 </div>

             </div>
          </div>

          {/* MAIN OPERATIONAL BOARDS */}
          <div className="flex-1 overflow-x-auto flex flex-col bg-slate-900 relative">
             <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-800 to-transparent opacity-50 pointer-events-none"></div>
             
             <div className="flex flex-1 gap-1 p-2 md:p-3 overflow-x-auto h-full items-stretch">
                {renderFaseBlocco("Turno Mattina", ["M"])}
                {renderFaseBlocco("Turno Pomeriggio", ["P"])}
             </div>
          </div>

        </div>
      )}
    </div>
  )
}

function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
}
