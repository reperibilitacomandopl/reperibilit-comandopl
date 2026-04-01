"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, User, Shield, Car, Save, Settings } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

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

  const assignService = async (userId: string, targetTypeString: string, categoryId: string | null = null, typeId: string | null = null) => {
    // Aggiorna shift per l'utente, preservando eventuali altri dati. 
    // TargetTypeString è il "macro turno" es. M7, P14 o NULL (se si vuole pulire)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")

    try {
      const res = await fetch("/api/admin/shifts/daily", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date: `${y}-${m}-${d}`,
          type: targetTypeString,
          serviceCategoryId: categoryId,
          serviceTypeId: typeId
        })
      })
      if (!res.ok) throw new Error("Errore salvataggio")
      toast.success("Servizio assegnato!")
      loadData()
    } catch (e) {
      console.error(e)
      toast.error("Errore di rete durante l'assegnazione")
    }
  }

  // --- Drag and Drop logic
  const handleDragStart = (e: React.DragEvent, userId: string, sourceGroup: string) => {
    e.dataTransfer.setData("userId", userId)
    e.dataTransfer.setData("source", sourceGroup) // Es. "unassigned", o l'id del box
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = (e: React.DragEvent, targetBaseType: string, targetCatId: string | null, targetTypeId: string | null) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      assignService(userId, targetBaseType, targetCatId, targetTypeId)
    }
  }

  const handleRemoveService = (userId: string) => {
    assignService(userId, "M7", null, null) // Da capire se resettare a un turno base
  }

  // Costruiamo le liste per la UI:
  // 1. Personale Indisponibile (Ferie, Malattia, Riposo) / Assenti
  const indisponibili = users.filter(u => 
    absences.some(a => a.userId === u.id) || 
    shifts.some(s => s.userId === u.id && ["F", "M", "RR", "RP", "104"].includes(s.type))
  )

  // 2. Personale Disponibile (Senza Servizio specifico assegnato ma magari con turno base M7/P14)
  const disponibili = users.filter(u => {
    if (indisponibili.includes(u)) return false
    const shift = shifts.find(s => s.userId === u.id)
    if (!shift) return true // Turno non definito
    if (shift.serviceTypeId) return false // Ha già un servizio assegnato
    return true
  })

  // 3. Servizi Assegnati raggruppati. E.g. per ogni Macro Turno (M7, M8, P14) -> Categorie -> Tipi

  return (
    <div className="flex flex-col h-[calc(100vh-32px)] sm:h-[calc(100vh-2rem)] bg-slate-50 relative animate-in fade-in duration-300">
      {/* Header a contrasto alto */}
      <div className="bg-[#1e293b] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <CalendarIcon className="text-blue-400" />
          <h2 className="text-xl font-bold uppercase tracking-wide">Gestione Operativa</h2>
        </div>
        
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-inner">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-700 rounded transition-colors"><ChevronLeft size={20}/></button>
          <div className="px-6 font-bold tracking-wide text-sm sm:text-base">
            {currentDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-700 rounded transition-colors"><ChevronRight size={20}/></button>
        </div>

        <div className="hidden sm:block">
          {onClose ? (
            <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold border border-slate-600">Chiudi</button>
          ) : (
            <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600">
              <ChevronLeft size={16}/> Torna alla Dashboard
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden p-2 gap-2">
          
          {/* COLONNA 1: PERSONALE (20-25%) */}
          <div className="w-full sm:w-[22%] flex flex-col gap-2 min-w-[280px]">
            {/* Indisponibili */}
            <div className="flex-1 flex flex-col bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#2a4365] text-white p-2 font-bold flex items-center gap-2 shrink-0">
                <User size={16} /> <span>Anagrafica ({disponibili.length})</span>
              </div>
              <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
                
                {/* Gruppo Indisponibili/Assenti - High Contrast */}
                <div className="bg-[#1e293b] text-white text-xs font-bold p-1.5 uppercase mb-1 flex justify-between">
                  <span>Non lavorativo</span>
                </div>
                <div className="space-y-0.5 mb-3">
                  {indisponibili.map(u => {
                    const ass = absences.find(a => a.userId === u.id)?.code
                    const sh = shifts.find(s => s.userId === u.id)?.type
                    const motive = ass || sh || "Assente"
                    return (
                      <div key={u.id} className="flex items-center justify-between px-2 py-1.5 bg-slate-100 border-b border-white opacity-80">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <span className="text-xs font-bold text-slate-700">{u.name.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{motive}</span>
                      </div>
                    )
                  })}
                  {indisponibili.length === 0 && <div className="text-xs text-slate-400 p-2 italic">Nessun assente</div>}
                </div>

                {/* Gruppo Disponibili */}
                <div className="bg-[#2a4365] text-white text-xs font-bold p-1.5 uppercase mb-1 flex justify-between">
                  <span>Personale Disponibile</span>
                  <span className="bg-white text-[#2a4365] px-2 rounded-sm text-[10px]">DA ASSEGNARE</span>
                </div>
                <div className="space-y-0.5">
                  {disponibili.map(u => {
                    const s = shifts.find(sh => sh.userId === u.id)
                    const badge = s?.type || "?"
                    return (
                      <div 
                        key={u.id}
                        draggable 
                        onDragStart={(e) => handleDragStart(e, u.id, "avail")}
                        className="flex items-center justify-between px-2 py-1.5 bg-white hover:bg-blue-50 border-b border-slate-100 cursor-grab active:cursor-grabbing transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-xs font-bold text-slate-800">{u.name.toUpperCase()}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 bg-slate-200 text-slate-700 rounded">{badge}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* COLONNA 2: SERVIZI ASSEGNATI (55%) */}
          <div className="flex-1 bg-white border border-slate-300 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-[#e2e8f0] border-b-2 border-slate-300 p-2 font-bold text-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2"><Shield size={16} className="text-blue-700"/> Riepilogo Servizi Assegnati</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 bg-[#f8fafc] custom-scrollbar">
              {["M7", "M8", "P14"].map(macro => {
                 // Estrai soli i turni di questo macro che hanno un servizio
                 const assignedShifts = shifts.filter(s => s.type === macro && s.serviceTypeId !== null)
                 const title = macro === 'M7' ? 'Mattina 7 - M7' : macro === 'M8' ? 'Mattina 8 - M8' : 'Pomeriggio 14 - P14'
                 
                 // Raggruppa gli assegnati per tipo servizio
                 const groupedByType = categories.flatMap(cat => cat.types).map(type => {
                   return {
                     type,
                     catId: categories.find(c => c.types.some((t: any) => t.id === type.id))?.id,
                     users: assignedShifts.filter(s => s.serviceTypeId === type.id)
                   }
                 }).filter(g => g.users.length > 0) // Mostra solo tipi con utenti!

                 return (
                   <div key={macro} className="mb-4 bg-white border border-slate-300 shadow-sm pb-1">
                     <div className="bg-[#1e293b] text-white p-1.5 text-sm font-bold uppercase tracking-wider pl-3">
                       {title}
                     </div>
                     
                     <div className="p-1 space-y-1">
                       {groupedByType.length === 0 ? (
                         <div className="text-xs text-slate-400 p-3 italic text-center">Nessun servizio assegnato.</div>
                       ) : (
                         groupedByType.map(group => (
                           <div key={group.type.id} className="mb-2">
                             {/* Intestazione del Servizio con onDrop (puoi trascinare altri qui dentro) */}
                             <div 
                               onDragEnter={handleDragOver} onDragOver={handleDragOver} onDrop={e => handleDrop(e, macro, group.catId || null, group.type.id)}
                               className="bg-[#f1f5f9] border-l-4 border-green-500 font-bold px-2 py-1 flex items-center justify-between"
                             >
                               <span className="text-[#2a4365] text-xs uppercase">{group.type.name}</span>
                               <span className="text-[10px] text-slate-400 mr-2 opacity-0 hover:opacity-100 transition-opacity">(Dropzone)</span>
                             </div>
                             
                             {/* Lista Agenti (Stripe Azure) */}
                             {group.users.map((s, i) => (
                               <div key={s.id} className={`flex items-center justify-between px-3 py-1.5 text-xs font-bold ${i % 2 === 0 ? 'bg-[#e0f2fe]' : 'bg-white'} border-b border-sky-100 group`}>
                                 <div className="flex items-center gap-2">
                                   <User size={14} className="text-blue-600" />
                                   <span className="text-slate-800 uppercase">{users.find(u => u.id === s.userId)?.name || "Ignoto"}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <select 
                                      className="text-[10px] py-0.5 px-1 bg-white border border-slate-300 rounded text-slate-700 shadow-sm"
                                      value={s.vehicleId || ""}
                                      onChange={(e) => {
                                        fetch("/api/admin/shifts/daily", {
                                          method: "PUT",
                                          body: JSON.stringify({ userId: s.userId, date: `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,"0")}-${String(currentDate.getDate()).padStart(2,"0")}`, vehicleId: e.target.value })
                                        });
                                        const newShifts = [...shifts];
                                        const idx = newShifts.findIndex(sh => sh.id === s.id);
                                        if(idx > -1) { newShifts[idx] = {...newShifts[idx], vehicleId: e.target.value}; setShifts(newShifts); }
                                      }}
                                    >
                                      <option value="">Nessun Veicolo</option>
                                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                    <button onClick={() => handleRemoveService(s.userId)} className="text-red-500 hover:text-red-700 ml-2" title="Rimuovi dal servizio">✕</button>
                                 </div>
                               </div>
                             ))}
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                 )
              })}
            </div>
          </div>

          {/* COLONNA 3: TIPI SERVIZIO (Tavolozza - 23%) */}
          <div className="w-full sm:w-[23%] flex flex-col bg-slate-100 border-2 border-slate-300 shadow-sm overflow-hidden min-w-[280px]">
            <div className="bg-[#2a4365] text-white p-2 font-bold flex items-center justify-between shrink-0">
              <span className="flex items-center gap-2"><Car size={16}/> Modelli Servizi</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
              
              {categories.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500 italic">
                  Imposta prima Categorie e Tipi nelle Impostazioni.
                </div>
              )}

              {categories.length > 0 && ["M7", "M8", "P14"].map(macro => {
                const title = macro === 'M7' ? 'Mattina 7' : macro === 'M8' ? 'Mattina 8' : 'Pomeriggio'
                const bgColor = macro === 'P14' ? 'bg-[#b91c1c]' : 'bg-[#1e40af]' // Rosso per piaggio, blu per mattina
                return (
                  <div key={macro} className="mb-2">
                    <div className={`${bgColor} text-white font-bold p-1.5 text-xs flex justify-between uppercase`}>
                      <span>{title} - {macro}</span>
                      <ChevronRight size={14}/>
                    </div>
                    <div className="bg-white border-x border-b border-slate-300">
                      {categories.map(cat => (
                         cat.types.map((type: any) => (
                           <div 
                             key={type.id}
                             onDragEnter={handleDragOver} onDragOver={handleDragOver} onDrop={e => handleDrop(e, macro, cat.id, type.id)}
                             className="px-2 py-1.5 flex items-center justify-between border-b border-slate-200 text-xs font-bold text-slate-700 hover:bg-green-50 hover:text-green-800 transition-colors group cursor-pointer"
                             title={`Rilascia agente qui per assegnarlo a ${type.name} per ${macro}`}
                           >
                              <div className="flex items-center gap-1.5"><span className="text-green-500 text-[10px]">»</span> {type.name}</div>
                              <span className="text-[10px] px-1 py-0.5 border border-slate-200 rounded opacity-0 group-hover:opacity-100 bg-white">Trascina qui</span>
                           </div>
                         ))
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
