"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, User, Shield, Car, Printer, RefreshCw, GripVertical, Info, Clock, AlertTriangle, Wand2, Radio, Copy, ClipboardPaste, ChevronDown, ChevronUp, CalendarCheck, RotateCcw, PanelLeftClose, PanelLeft, Users, Link2 } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { isAssenza, formatShiftCode } from "../utils/shift-logic"

interface CopiedAgentData {
  serviceCategoryId: string | null
  serviceTypeId: string | null
  vehicleId: string | null
  timeRange: string | null
  serviceDetails: string | null
}

export default function ServiceManagerPanel({ onClose }: { onClose?: () => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  
  const [users, setUsers] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [absences, setAbsences] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])

  // Collapsible state
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({})
  const [collapsedFuoriServizio, setCollapsedFuoriServizio] = useState(false)
  const [collapsedADisposizione, setCollapsedADisposizione] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Copy/Paste: intera giornata
  const [copiedDay, setCopiedDay] = useState<{ date: string; assignments: any[] } | null>(null)
  // Copy/Paste: singolo agente
  const [copiedAgent, setCopiedAgent] = useState<CopiedAgentData | null>(null)

  // Patrol creation: multi-select
  const [patrolSelection, setPatrolSelection] = useState<Set<string>>(new Set())
  
  const togglePatrolSelect = (shiftId: string) => {
    setPatrolSelection(prev => {
      const n = new Set(prev)
      if (n.has(shiftId)) n.delete(shiftId)
      else n.add(shiftId)
      return n
    })
  }

  const createPatrolFromSelection = async () => {
    if (patrolSelection.size < 2) {
      toast.error("Seleziona almeno 2 agenti per formare una pattuglia")
      return
    }
    const groupId = `patrol_${Date.now()}`
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${d}`
    
    for (const shiftId of patrolSelection) {
      const s = shifts.find(sh => sh.id === shiftId)
      if (!s) continue
      await fetch("/api/admin/shifts/daily", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: s.userId,
          date: dateStr,
          patrolGroupId: groupId
        })
      })
    }
    toast.success(`Pattuglia formata con ${patrolSelection.size} agenti!`)
    setPatrolSelection(new Set())
    loadData()
  }

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

  // Keyboard shortcuts: ← → per navigare i giorni
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/select/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        changeDate(-1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        changeDate(1)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [currentDate])

  const changeDate = (days: number) => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + days)
    setCurrentDate(next)
  }

  const goToToday = () => setCurrentDate(new Date())

  const isToday = () => {
    const now = new Date()
    return currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth() && currentDate.getDate() === now.getDate()
  }

  const assignService = async (userId: string, targetTypeString: string, categoryId: string | null = null, typeId: string | null = null, vehicleId: string | null = null, timeRange: string | null = null, serviceDetails: string | null = null) => {
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")

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
      
      if (userShift && userShift.type.startsWith(shiftTypeRange) && userShift.type !== "M" && userShift.type !== "P") {
          finalType = userShift.type;
      }

      assignService(userId, finalType, catId, typeId)
      toast.success("Agente riassegnato al servizio")
    }
  }
  
  const handleDropToSidebar = (e: React.DragEvent) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      const userShift = shifts.find(s => s.userId === userId)
      if (userShift && userShift.serviceCategoryId) {
        handleRemoveService(userId, userShift.type)
        toast.success("Agente rimosso dal servizio")
      }
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

  // Ripristina OdS — rimuove tutte le assegnazioni servizio
  const resetOds = async () => {
    if (!confirm("ATTENZIONE: Questo rimuoverà TUTTE le assegnazioni servizio per la data selezionata. I turni base (M/P/RP) resteranno intatti. Procedere?")) return
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${d}`
    
    let count = 0
    const assignedShifts = shifts.filter(s => 
      (s.serviceTypeId || s.serviceCategoryId || s.vehicleId || s.serviceDetails || s.patrolGroupId) && 
      !isAssenza(s.type)
    )
    for (const s of assignedShifts) {
      try {
        await fetch("/api/admin/shifts/daily", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: s.userId,
            date: dateStr,
            type: s.type,
            serviceCategoryId: null,
            serviceTypeId: null,
            vehicleId: null,
            timeRange: s.timeRange,
            serviceDetails: null,
            patrolGroupId: null
          })
        })
        count++
      } catch {}
    }
    toast.success(`Ripristinato! ${count} assegnazioni rimosse.`)
    loadData()
  }

  const handleRemoveService = (userId: string, originalTimeRange: string) => {
    assignService(userId, originalTimeRange, null, null, null)
  }

  const toggleLink = async (shiftId: string, currentGroupId: string | null) => {
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

  // ===== COPY/PASTE GIORNATA =====
  const copyDay = () => {
    const assignedShifts = shifts.filter(s => s.serviceTypeId && !isAssenza(s.type))
    if (assignedShifts.length === 0) {
      toast.error("Nessuna assegnazione da copiare")
      return
    }
    setCopiedDay({
      date: currentDate.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" }),
      assignments: assignedShifts.map(s => ({
        userId: s.userId,
        type: s.type,
        serviceCategoryId: s.serviceCategoryId,
        serviceTypeId: s.serviceTypeId,
        vehicleId: s.vehicleId,
        timeRange: s.timeRange,
        serviceDetails: s.serviceDetails
      }))
    })
    toast.success(`OdS copiato! (${assignedShifts.length} assegnazioni)`)
  }

  const pasteDay = async () => {
    if (!copiedDay) return
    if (!confirm(`Incollare l'OdS copiato da "${copiedDay.date}" sulla data attuale? Gli agenti assenti saranno ignorati.`)) return
    setLoading(true)
    
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${d}`

    let count = 0
    for (const assignment of copiedDay.assignments) {
      // Check if the user is available today (has a working shift, not absent)
      const todayShift = shifts.find(s => s.userId === assignment.userId)
      if (!todayShift || isAssenza(todayShift.type)) continue

      try {
        await fetch("/api/admin/shifts/daily", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: assignment.userId,
            date: dateStr,
            type: todayShift.type, // Keep today's actual shift type (M7/P14 etc.)
            serviceCategoryId: assignment.serviceCategoryId,
            serviceTypeId: assignment.serviceTypeId,
            vehicleId: assignment.vehicleId,
            timeRange: assignment.timeRange,
            serviceDetails: assignment.serviceDetails
          })
        })
        count++
      } catch {}
    }
    
    toast.success(`Incollate ${count} assegnazioni!`)
    loadData()
  }

  // ===== COPY/PASTE SINGOLO AGENTE =====
  const copyAgentConfig = (shift: any) => {
    setCopiedAgent({
      serviceCategoryId: shift.serviceCategoryId,
      serviceTypeId: shift.serviceTypeId,
      vehicleId: shift.vehicleId,
      timeRange: shift.timeRange,
      serviceDetails: shift.serviceDetails
    })
    toast.success("Configurazione agente copiata!")
  }

  const pasteAgentConfig = (agentId: string, shiftType: string) => {
    if (!copiedAgent) return
    assignService(agentId, shiftType, copiedAgent.serviceCategoryId, copiedAgent.serviceTypeId, copiedAgent.vehicleId, copiedAgent.timeRange, copiedAgent.serviceDetails)
    toast.success("Configurazione incollata!")
  }

  // ===== TOGGLE COLLAPSE =====
  const toggleCatCollapse = (catId: string) => {
    setCollapsedCats(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  // Identificazione stati agenti
  const indisponibili = users.filter(u => 
    shifts.some(s => s.userId === u.id && isAssenza(s.type))
  )

  const disponibiliNonAssegnati = users.filter(u => {
    if (indisponibili.includes(u)) return false
    const shift = shifts.find(s => s.userId === u.id)
    if (!shift) return true
    if (shift.serviceTypeId || shift.serviceCategoryId) return false
    return true
  }).sort((a,b) => {
      const sa = shifts.find(s => s.userId === a.id)?.type || ""
      const sb = shifts.find(s => s.userId === b.id)?.type || ""
      return sa.localeCompare(sb)
  })

  // Funzione Rendering Blocco Fase (Mattino / Pomeriggio)
  const renderFaseBlocco = (titolo: string, filtroTurni: string[]) => {
      const agentiFase = shifts.filter(s => {
          if (indisponibili.some(indisp => indisp.id === s.userId)) return false;
          return filtroTurni.some(t => s.type.startsWith(t)) && s.serviceCategoryId; // Fix! Check category, not type.
      });

      const ufficialiInServizio = agentiFase.filter(s => {
          const u = users.find(user => user.id === s.userId);
          return u?.isUfficiale;
      });

      return (
        <div className="flex-1 flex flex-col min-w-[380px]">
            <div className="bg-slate-900 border-b-2 border-blue-600 px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-lg">
                <span className="font-black text-white tracking-widest text-sm uppercase">{titolo}</span>
                <span className="text-[11px] text-blue-300 font-black bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                   {agentiFase.length} In Servizio
                </span>
            </div>
            
            <div className="flex-1 bg-slate-100 p-3 space-y-4 overflow-y-auto custom-scrollbar relative">
                
                {/* SEZIONE UFFICIALI DI TURNO */}
                <div className="bg-blue-900/10 border-2 border-blue-600/20 rounded-2xl overflow-hidden mb-4">
                    <div className="bg-blue-700 text-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Shield size={14} /> Ufficiali di Servizio ({ufficialiInServizio.length})
                    </div>
                    <div className="p-2 space-y-2">
                        {ufficialiInServizio.map(shiftAssegnato => {
                            const agente = users.find(u => u.id === shiftAssegnato.userId)
                            if(!agente) return null
                            return renderAgentCard(agente, shiftAssegnato)
                        })}
                        {ufficialiInServizio.length === 0 && (
                            <div className="py-4 text-center text-slate-500 text-[11px] font-bold uppercase italic">Nessun Ufficiale Assegnato</div>
                        )}
                    </div>
                </div>

                {categories.length === 0 && <div className="text-center text-slate-500 text-xs font-bold italic mt-10">Nessuna Categoria Servizio Rilevata</div>}
                
                {categories.map(cat => {
                    const agentiInCategoria = agentiFase.filter(s => {
                      const u = users.find(user => user.id === s.userId);
                      return s.serviceCategoryId === cat.id && !u?.isUfficiale;
                    });
                    const isCollapsed = collapsedCats[cat.id] || false
                    const isEmpty = agentiInCategoria.length === 0

                    return (
                    <div key={cat.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isEmpty ? 'border-red-200' : 'border-slate-200'}`}>
                        <div 
                            onDragOver={handleDragOver}
                            onDrop={e => handleDropToCategory(e, filtroTurni[0], cat.id)}
                            onClick={() => toggleCatCollapse(cat.id)}
                            className={`px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer transition-colors group ${isEmpty ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">
                                {isEmpty && <AlertTriangle size={14} className="animate-pulse" />}
                                {cat.name}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isEmpty ? 'bg-red-900/50 text-red-200' : 'bg-slate-700 text-slate-300'}`}>
                                  {agentiInCategoria.length} agenti
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 text-[8px] bg-blue-600 px-1 inline-block rounded transition-opacity">Rilascia qui</span>
                            </span>
                            <span className="text-slate-400">
                              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                            </span>
                        </div>
                        
                        {!isCollapsed && (
                        <div className="p-2 space-y-2">
                            
                            {/* Generico (Limbo) */}
                            {(() => {
                                const agentiGen = agentiInCategoria.filter(s => !s.serviceTypeId)
                                if (agentiGen.length === 0) return null
                                return (
                                <div className="border border-red-200 rounded-lg overflow-hidden transition-all bg-red-50">
                                    <div className="bg-red-100 px-3 py-2 text-xs font-black text-red-800 border-b border-red-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-red-600" />
                                            GENERICO (Assegna Sotto-Servizio)
                                            <span className="text-[10px] font-bold text-red-500">({agentiGen.length})</span>
                                        </div>
                                    </div>
                                    <div className="bg-white divide-y divide-red-100">
                                        {agentiGen.map(shiftAssegnato => {
                                            const agente = users.find(u => u.id === shiftAssegnato.userId)
                                            if(!agente) return null
                                            return renderAgentCard(agente, shiftAssegnato)
                                        })}
                                    </div>
                                </div>
                                )
                            })()}
                            {cat.types.map((tipo: any) => {
                                const agentiInQuestoServizio = agentiFase.filter(s => {
                                    const u = users.find(user => user.id === s.userId);
                                    return s.serviceTypeId === tipo.id && !u?.isUfficiale;
                                });
                                
                                return (
                                <div key={tipo.id} className="border border-slate-200 rounded-lg overflow-hidden transition-all">
                                    <div 
                                        onDragOver={handleDragOver} 
                                        onDrop={e => handleDropToService(e, filtroTurni[0], cat.id, tipo.id)}
                                        className="bg-slate-50 px-3 py-2 text-xs font-black text-slate-800 border-b border-slate-200 flex justify-between items-center"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-blue-600" />
                                            {tipo.name}
                                            <span className="text-[10px] font-bold text-slate-500">({agentiInQuestoServizio.length})</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 italic font-bold">Trascina Agente Qui</span>
                                    </div>
                                    
                                    <div className="bg-white divide-y divide-slate-100">
                                        {agentiInQuestoServizio.map(shiftAssegnato => {
                                            const agente = users.find(u => u.id === shiftAssegnato.userId)
                                            if(!agente) return null
                                            return renderAgentCard(agente, shiftAssegnato)
                                        })}
                                        {agentiInQuestoServizio.length === 0 && (
                                            <div className="p-3 text-center text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-50 border-t border-dashed border-slate-200">
                                                Nessun equipaggio
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                        )}
                    </div>
                  )
                })}
            </div>
        </div>
      )
  }

  // Refactoring card agente
  const renderAgentCard = (agente: any, shiftAssegnato: any) => {
    const timeRangeStr = shiftAssegnato.timeRange || (shiftAssegnato.type==="M7" ? "07:00-13:00" : shiftAssegnato.type==="M8" ? "08:00-14:00" : "14:00-20:00")

    return (
        <div key={agente.id} draggable onDragStart={e => handleDragStart(e, agente.id)} className={`p-2 flex flex-col hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing group/card ${patrolSelection.has(shiftAssegnato.id) ? 'bg-indigo-50 ring-2 ring-indigo-400' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2 mb-2">
                <div className="flex items-center gap-3">
                   <input 
                     type="checkbox"
                     checked={patrolSelection.has(shiftAssegnato.id)}
                     onChange={() => togglePatrolSelect(shiftAssegnato.id)}
                     onClick={(e) => e.stopPropagation()}
                     className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer shrink-0"
                     title="Seleziona per pattuglia"
                   />
                   <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)] ${agente.isUfficiale ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                   <div className="flex flex-col">
                       <span className="text-[12px] font-black text-slate-900 tracking-wide uppercase">
                           {agente.isUfficiale && <span className="text-[10px] text-blue-700 font-black mr-1">[UFF]</span>}
                           {agente.name}
                       </span>
                       <div className="flex items-center gap-2">
                         <input 
                            title="Orario Turno (Modificabile)"
                            type="text" 
                            defaultValue={timeRangeStr}
                            onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, e.target.value, shiftAssegnato.serviceDetails)}
                            className="text-[11px] font-black text-slate-700 bg-transparent border-none p-0 focus:ring-0 w-[70px] hover:bg-slate-100 rounded focus:bg-white"
                            placeholder="hh:mm-hh:mm"
                         />
                         <input
                            title="Dettaglio / Note Servizio"
                            type="text"
                            defaultValue={shiftAssegnato.serviceDetails || agente.servizio || ""}
                            onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, timeRangeStr, e.target.value)}
                            className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded focus:ring-0 w-[120px] focus:bg-white hover:border-blue-400"
                            placeholder="Es. Fiera, Piantone..."
                         />
                       </div>
                   </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Copia config agente */}
                    <button
                      onClick={() => copyAgentConfig(shiftAssegnato)}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Copia configurazione agente"
                    >
                      <Copy size={12} />
                    </button>
                    {/* Incolla config agente */}
                    {copiedAgent && (
                      <button
                        onClick={() => pasteAgentConfig(agente.id, shiftAssegnato.type)}
                        className="p-1 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors animate-pulse"
                        title="Incolla configurazione copiata"
                      >
                        <ClipboardPaste size={12} />
                      </button>
                    )}

                    <select 
                        value={shiftAssegnato.vehicleId || ""}
                        onChange={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, e.target.value, timeRangeStr, shiftAssegnato.serviceDetails)}
                        className="text-[10px] bg-slate-100 font-black px-2 py-1.5 rounded-md border border-slate-200 focus:border-blue-500 transition-all text-slate-800 max-w-[120px] truncate"
                    >
                        <option value="">+ Veicolo</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>

                    <button 
                        onClick={() => toggleLink(shiftAssegnato.id, shiftAssegnato.patrolGroupId)}
                        className={`p-1.5 rounded-md transition-colors ${shiftAssegnato.patrolGroupId ? 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        title={shiftAssegnato.patrolGroupId ? "Separa Pattuglia" : "Abbina ad altro membro (Crea Pattuglia)"}
                    >
                        <Radio size={14} className={shiftAssegnato.patrolGroupId ? 'rotate-90' : ''} />
                    </button>

                    <button 
                        onClick={() => handleRemoveService(agente.id, shiftAssegnato.type)} 
                        className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-50 hover:bg-red-50 rounded-md transition-colors font-black"
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
                className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
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
            <p className="text-[10px] sm:text-xs text-slate-300 font-bold tracking-widest uppercase">Pianificazione OdS e Pattuglie
              {copiedDay && <span className="ml-2 text-indigo-400">• OdS copiato da {copiedDay.date}</span>}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-inner">
                <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white" title="← Giorno precedente"><ChevronLeft size={20}/></button>
                <div className="px-4 font-black tracking-widest uppercase text-white text-sm">
                    {currentDate.toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
                </div>
                <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white" title="→ Giorno successivo"><ChevronRight size={20}/></button>
            </div>

            {/* VAI A OGGI */}
            {!isToday() && (
              <button
                onClick={goToToday}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                title="Torna alla data odierna"
              >
                <CalendarCheck size={14} /> Oggi
              </button>
            )}

            {/* COPIA ODS */}
            <button 
                onClick={copyDay}
                className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                title="Copia tutte le assegnazioni del giorno"
            >
                <Copy size={14}/> Copia OdS
            </button>

            {/* INCOLLA ODS */}
            {copiedDay && (
              <button 
                  onClick={pasteDay}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all animate-pulse shadow-lg shadow-indigo-500/20"
                  title={`Incolla OdS da ${copiedDay.date}`}
              >
                  <ClipboardPaste size={14}/> Incolla OdS
              </button>
            )}

            <button 
                onClick={autoGenerate}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 text-xs tracking-wider"
                title="Autocompila Ordine di Servizio basato sui Template"
            >
                <Wand2 size={16}/> {loading ? "..." : "AUTOCONFIGURA"}
            </button>

            {/* RIPRISTINA ODS */}
            <button 
                onClick={resetOds}
                disabled={loading}
                className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white border border-rose-600 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                title="Rimuovi tutte le assegnazioni servizio per oggi"
            >
                <RotateCcw size={14}/> Ripristina
            </button>

            {patrolSelection.size >= 2 && (
              <button 
                onClick={createPatrolFromSelection}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all animate-pulse shadow-lg shadow-indigo-500/20"
              >
                <Link2 size={14}/> Pattuglia ({patrolSelection.size})
              </button>
            )}

            <Link href="/admin/stampa-ods" className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm">
               <Printer size={14}/> Stampa
            </Link>

            {onClose && (
                <button onClick={onClose} className="hidden sm:flex px-3 py-2 bg-slate-800 hover:bg-rose-900 border border-slate-700 text-slate-200 hover:text-rose-200 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm">
                    Chiudi
                </button>
            )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900"></div>
            <Loader2 size={48} className="animate-spin text-blue-500 mb-4 relative z-10" />
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs relative z-10 animate-pulse">Sincronizzazione Database...</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR FORZE A DISPOSIZIONE */}
          <div 
            className={`${sidebarCollapsed ? 'w-[48px]' : 'w-[280px]'} bg-slate-800/50 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300`}
            onDragOver={handleDragOver}
            onDrop={handleDropToSidebar}
          >
             <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                 <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white shrink-0" title={sidebarCollapsed ? 'Espandi sidebar' : 'Riduci sidebar'}>
                   {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                 </button>
                 {!sidebarCollapsed && (
                   <div className="overflow-hidden">
                     <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                         Forze in Campo
                     </h3>
                     <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Trascina • ← → naviga</p>
                   </div>
                 )}
             </div>
             
             {!sidebarCollapsed && (
             <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">
                 
                 {/* Fuori Servizio (Collassabile) */}
                 <div>
                     <button 
                       onClick={() => setCollapsedFuoriServizio(!collapsedFuoriServizio)}
                       className="flex items-center gap-2 px-2 mb-2 w-full hover:bg-slate-700/30 rounded py-1 transition-colors"
                     >
                         <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                         <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider flex-1 text-left">Fuori Servizio ({indisponibili.length})</span>
                         {collapsedFuoriServizio ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronUp size={12} className="text-slate-500" />}
                     </button>
                     {!collapsedFuoriServizio && (
                     <div className="space-y-1">
                         {indisponibili.map(u => {
                            const motive = absences.find(a => a.userId === u.id)?.code || shifts.find(s => s.userId === u.id)?.type || "NON DISP."
                            return (
                                <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2 flex justify-between items-center opacity-80">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-slate-300 uppercase">{u.name}</span>
                                      {u.servizio && <span className="text-[9px] font-bold text-rose-400 uppercase">{u.servizio}</span>}
                                    </div>
                                    <span className="text-[10px] font-black text-rose-300 bg-rose-400/20 px-1.5 rounded border border-rose-500/30">{motive}</span>
                                </div>
                            )
                         })}
                     </div>
                     )}
                 </div>

                 {/* Disponibili Da Piazzare */}
                 <div>
                     <button 
                       onClick={() => setCollapsedADisposizione(!collapsedADisposizione)}
                       className="flex items-center gap-2 px-2 mb-2 w-full hover:bg-slate-700/30 rounded py-1 transition-colors"
                     >
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                         <span className="text-[11px] text-white font-black uppercase tracking-wider flex-1 text-left">A Disposizione ({disponibiliNonAssegnati.length})</span>
                         {collapsedADisposizione ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronUp size={12} className="text-slate-500" />}
                     </button>
                     {!collapsedADisposizione && (
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
                                          <span className="text-xs font-black text-white uppercase">{u.name}</span>
                                          {u.servizio && <span className="text-[9px] font-bold text-blue-300 uppercase">{u.servizio}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {/* Incolla su singolo dalla sidebar */}
                                      {copiedAgent && (
                                        <button
                                          onClick={() => {
                                            const shift = shifts.find(s => s.userId === u.id)
                                            if (shift) pasteAgentConfig(u.id, shift.type)
                                          }}
                                          className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded transition-colors"
                                          title="Incolla configurazione"
                                        >
                                          <ClipboardPaste size={12} />
                                        </button>
                                      )}
                                      <span className={`text-[10px] font-black px-1.5 rounded ${baseShift.startsWith("M") ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : baseShift.startsWith("P") ? 'bg-yellow-900/50 text-yellow-200 border border-yellow-800' : 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                                          {baseShift}
                                      </span>
                                    </div>
                                </div>
                            )
                         })}
                         {disponibiliNonAssegnati.length === 0 && (
                             <div className="text-center p-4 bg-emerald-900/20 border border-emerald-900/30 rounded-lg">
                                 <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2 opacity-60"/>
                                 <p className="text-[11px] text-emerald-300 font-black tracking-widest uppercase">Tutti operativi</p>
                             </div>
                         )}
                     </div>
                     )}
                 </div>

             </div>
             )}
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
