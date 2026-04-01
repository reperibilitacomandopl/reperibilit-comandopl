"use client"

import { useState, useEffect } from "react"
import { Loader2, ChevronLeft, ChevronRight, Save } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { formatShiftCode } from "@/utils/shift-logic"

export default function MonthlyShiftPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [users, setUsers] = useState<any[]>([])
  // Map of userId -> "YYYY-MM-DD" -> type
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>({})
  const [originalGrid, setOriginalGrid] = useState<Record<string, Record<string, string>>>({})

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/shifts/monthly?year=${year}&month=${month}`)
      const data = await res.json()
      if (data.users) setUsers(data.users)
      
      if (data.shifts) {
        const initialGrid: Record<string, Record<string, string>> = {}
        data.shifts.forEach((s: any) => {
          const dStr = s.date.split("T")[0] // YYYY-MM-DD
          if (!initialGrid[s.userId]) initialGrid[s.userId] = {}
          initialGrid[s.userId][dStr] = s.type
        })
        setGrid(initialGrid)
        setOriginalGrid(JSON.parse(JSON.stringify(initialGrid))) // Deep copy
      }
    } catch {
      toast.error("Errore caricamento dati")
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [year, month])

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth() + delta, 1))
  }

  const handleCellChange = (userId: string, day: number, value: string) => {
    const dStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setGrid(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [dStr]: value
      }
    }))
  }

  const saveChanges = async () => {
    setSaving(true)
    const updates: {userId: string, date: string, type: string, timeRange?: string}[] = []
    
    Object.keys(grid).forEach(userId => {
      const u = users.find(u => u.id === userId)
      const group = rotationGroups.find(g => g.id === u?.rotationGroupId)
      
      Object.keys(grid[userId]).forEach(dateStr => {
        const newVal = grid[userId][dateStr]
        const oldVal = originalGrid[userId]?.[dateStr]
        if (newVal !== oldVal) {
          let timeRange: string | undefined = undefined
          if (newVal.startsWith("M") && group) timeRange = `${group.mStartTime || "07:00"}-${group.mEndTime || "13:00"}`
          else if (newVal.startsWith("P") && group) timeRange = `${group.pStartTime || "13:00"}-${group.pEndTime || "19:00"}`
          
          updates.push({ userId, date: dateStr, type: newVal, timeRange })
        }
      })
    })

    if (updates.length === 0) {
      toast("Nessuna modifica da salvare", { icon: "👍" })
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/admin/shifts/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      })
      if (!res.ok) throw new Error()
      toast.success(`Salvati ${updates.length} turni!`)
      loadData()
    } catch {
      toast.error("Errore salvataggio")
    }
    setSaving(false)
  }

  // --- WIZARD AUTOMAZIONE TURNI (DINAMICO DA DB) ---
  const [showWizard, setShowWizard] = useState(false)
  const [wizardTarget, setWizardTarget] = useState("ALL")
  const [wizardGroupId, setWizardGroupId] = useState("")
  const [wizardStartDay, setWizardStartDay] = useState(0) // 0-27: quale giorno del ciclo corrisponde al 1° del mese
  const [rotationGroups, setRotationGroups] = useState<any[]>([])
  const [filterText, setFilterText] = useState("")

  // Carica i gruppi di rotazione dal database
  const loadGroups = async () => {
    try {
      const res = await fetch("/api/admin/rotation-groups")
      const data = await res.json()
      if (Array.isArray(data)) {
        setRotationGroups(data)
        if (data.length > 0 && !wizardGroupId) setWizardGroupId(data[0].id)
      }
    } catch {}
  }
  useEffect(() => { loadGroups() }, [])
  
  // Automazione calcolo offset quando cambiano gruppo o data
  useEffect(() => {
    if (wizardGroupId && rotationGroups.length > 0) {
      const g = rotationGroups.find(rg => rg.id === wizardGroupId)
      if (g && g.startDate) {
        const sDate = new Date(g.startDate)
        const firstOfMonth = new Date(year, month - 1, 1)
        const diffTime = firstOfMonth.getTime() - sDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        const autoOffset = ((diffDays % 28) + 28) % 28
        setWizardStartDay(autoOffset)
      }
    }
  }, [wizardGroupId, year, month, rotationGroups])

  const applyAutomation = () => {
    const group = rotationGroups.find(g => g.id === wizardGroupId)
    if (!group) {
      toast.error("Seleziona un turno valido.")
      return
    }

    let pattern: string[] = []
    try { pattern = JSON.parse(group.pattern) } catch { toast.error("Pattern non valido"); return }
    if (pattern.length === 0) { toast.error("Il pattern del turno è vuoto. Vai in Gestione Squadre per configurarlo."); return }

    // Trova i bersagli
    const targetUsers = users.filter(u => {
      if (wizardTarget === "ALL") return true
      if (wizardTarget.startsWith("GROUP_")) return u.rotationGroupId === wizardTarget.replace("GROUP_", "")
      return u.id === wizardTarget
    })

    if (targetUsers.length === 0) {
      toast.error("Nessun agente trovato per questo target.")
      return
    }

    // CALCOLO OFFSET: L'utente sceglie "Da quale giorno del ciclo (1-28) parte il 1° del mese".
    // wizardStartDay è 0-based (0 = giorno 1 del ciclo)
    const startIndex = wizardStartDay

    setGrid(prev => {
      const nextGrid = { ...prev }
      targetUsers.forEach(u => {
        if (!nextGrid[u.id]) nextGrid[u.id] = {}
        
        daysArray.forEach((day, index) => {
          const dStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          
          // Non sovrascriviamo ferie, malattie e permessi
          const existing = nextGrid[u.id][dStr]
          if (existing && ["F", "MAL", "104", "Permesso", "RR"].includes(existing)) return

          // LOGICA RIPOSO DINAMICO (Legato alla domenica lavorativa)
          // Se l'agente ha un giorno di riposo fisso (es. Lunedì = 1)
          // verifichiamo la domenica precedente. Se ha lavorato (M o P), allora questo è il suo RP.
          const dateObj = new Date(year, month - 1, day)
          if (u.fixedRestDay !== null && u.fixedRestDay !== undefined && dateObj.getDay() === u.fixedRestDay) {
            // Trova la domenica precedente
            const prevSunday = new Date(dateObj)
            prevSunday.setDate(dateObj.getDate() - (dateObj.getDay() || 7)) // Torna alla domenica (0)
            
            // Calcola l'indice del pattern per quella domenica
            const diffSun = prevSunday.getTime() - new Date(year, month - 1, 1).getTime()
            const daysDiffSun = Math.floor(diffSun / (1000 * 60 * 60 * 24))
            const sunPatternIdx = ((startIndex + daysDiffSun) % pattern.length + pattern.length) % pattern.length
            const sunType = pattern[sunPatternIdx]

            // Se la domenica precedente era lavorativa, metti riposo oggi
            if (sunType === "M" || sunType === "P") {
              nextGrid[u.id][dStr] = "RP"
              return
            }
            // Altrimenti (domenica era RP), proseguiamo col pattern standard per oggi
          }
          
          // Usa l'offset calcolato per allineare il pattern
          const patternIndex = (startIndex + index) % pattern.length
          const pVal = pattern[patternIndex]
          
          if (pVal === "M") {
            nextGrid[u.id][dStr] = formatShiftCode("M", group.mStartTime)
          } else if (pVal === "P") {
            nextGrid[u.id][dStr] = formatShiftCode("P", group.pStartTime)
          } else {
            nextGrid[u.id][dStr] = pVal
          }
        })
      })
      return nextGrid
    })
    
    toast.success(`Pattern "${group.name}" applicato a ${targetUsers.length} agenti! (Ricordati di salvare)`)
    setShowWizard(false)
  }

  // Estrai squadre uniche (ora basate sui gruppi dal DB)
  const squadreFromGroups = rotationGroups.map(g => ({ id: g.id, name: g.name, count: g.users?.length || 0 }))
  
  // Filtra utenti per ricerca
  const filteredUsers = filterText 
    ? users.filter(u => u.name.toLowerCase().includes(filterText.toLowerCase()))
    : users

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#1e293b] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-md">
        <h2 className="text-xl font-bold uppercase tracking-wide">Pianificatore Mensile Turni Ordinari</h2>
        
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-inner my-2 sm:my-0">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded transition-colors"><ChevronLeft size={20}/></button>
          <div className="px-6 font-bold tracking-wide uppercase text-sm sm:text-base">
            {currentDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded transition-colors"><ChevronRight size={20}/></button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowWizard(!showWizard)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            ✨ Auto-Compila Turni
          </button>
          <button 
            onClick={saveChanges} disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salva Modifiche
          </button>
          <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600">
            <ChevronLeft size={16}/> Esci
          </Link>
        </div>
      </div>

      {/* --- PANNELLO WIZARD --- */}
      {showWizard && (
        <div className="bg-blue-50 border-b-2 border-blue-300 p-4 shadow-md">
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900 uppercase">1. Applica a</label>
              <select 
                value={wizardTarget} onChange={(e) => setWizardTarget(e.target.value)}
                className="p-2 rounded border-2 border-blue-300 bg-white text-sm font-bold shadow-sm text-slate-800 outline-none min-w-[200px]"
              >
                <option value="ALL">👥 Tutto il Personale</option>
                <optgroup label="SQUADRE (Turni dal DB)">
                  {squadreFromGroups.map(sq => <option key={sq.id} value={`GROUP_${sq.id}`}>{sq.name} ({sq.count} ag.)</option>)}
                </optgroup>
                <optgroup label="SINGOLO AGENTE">
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900 uppercase">2. Usa il Pattern di</label>
              <select 
                value={wizardGroupId} onChange={(e) => setWizardGroupId(e.target.value)}
                className="p-2 rounded border-2 border-blue-300 bg-white text-sm font-bold shadow-sm text-slate-800 outline-none min-w-[180px]"
              >
                {rotationGroups.length === 0 && <option value="">⚠ Nessun turno configurato</option>}
                {rotationGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-blue-900 uppercase">3. Il 1° del mese corrisponde al giorno N° del ciclo</label>
              <select 
                value={wizardStartDay} onChange={(e) => setWizardStartDay(parseInt(e.target.value))}
                className="p-2 rounded border-2 border-blue-300 bg-white text-sm font-bold shadow-sm text-slate-800 outline-none min-w-[220px]"
              >
                {Array.from({length: 28}, (_, i) => {
                  const selectedGroup = rotationGroups.find(g => g.id === wizardGroupId)
                  let patternVal = ""
                  if (selectedGroup) {
                    try { const p = JSON.parse(selectedGroup.pattern); patternVal = ` → ${p[i] || "?"}` } catch {}
                  }
                  const weekNum = Math.floor(i / 7) + 1
                  const dayInWeek = (i % 7) + 1
                  return <option key={i} value={i}>Giorno {i + 1} (S{weekNum}.G{dayInWeek}{patternVal})</option>
                })}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <button 
              onClick={applyAutomation}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 text-sm"
            >
              ▶ COMPILA GRIGLIA
            </button>
            
            <Link href="/squadre" className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm">
              ⚙ Gestisci Squadre
            </Link>
            
            <span className="text-xs text-blue-700 ml-2 italic">
              Il pattern si allinea automaticamente al giorno della settimana del 1° del mese.
            </span>
          </div>
        </div>
      )}


      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
          {/* Barra filtro agenti */}
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="🔍 Filtra per nome agente..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="px-3 py-1.5 border-2 border-slate-300 rounded-lg text-sm font-semibold outline-none focus:border-blue-500 w-64 bg-white shadow-sm"
            />
            {filterText && (
              <button onClick={() => setFilterText("")} className="text-xs text-slate-500 hover:text-slate-800 font-bold">✕ Reset</button>
            )}
            <span className="text-xs text-slate-500 ml-2">{filteredUsers.length} agenti</span>
          </div>

          <div className="bg-white rounded-lg shadow-lg border-2 border-slate-300 inline-block min-w-full">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#1e293b] text-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-2 font-bold border-b-2 border-r-2 border-[#0f172a] sticky left-0 z-20 bg-[#1e293b] w-56 text-xs uppercase tracking-wider">Agente</th>
                  {daysArray.map(day => {
                    const d = new Date(year, month - 1, day)
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    return (
                      <th key={day} className={`p-1.5 text-center border-b-2 border-r border-[#0f172a] min-w-[44px] ${isWeekend ? 'bg-red-900' : ''}`}>
                        <div className="text-[9px] uppercase opacity-80">{d.toLocaleDateString('it-IT', {weekday:'short'})}</div>
                        <div className="text-sm font-bold">{day}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id} className={`${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="p-1.5 border-b border-r-2 border-slate-300 sticky left-0 z-10 font-bold text-slate-900 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] bg-inherit uppercase">
                      {u.name}
                    </td>
                    {daysArray.map(day => {
                      const dStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                      const val = grid[u.id]?.[dStr] || ""
                      const oldVal = originalGrid[u.id]?.[dStr] || ""
                      const isEdited = val !== oldVal
                      const d = new Date(year, month - 1, day)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      
                      let colorClass = "text-slate-800"
                      let bgClass = ""
                      if (val === "RP") { colorClass = "text-red-700 font-black"; bgClass = "bg-red-100" }
                      else if (val === "F" || val === "RR" || val === "MAL" || val === "104") { colorClass = "text-red-600 font-black"; bgClass = "bg-red-50" }
                      else if (val.startsWith("M")) { colorClass = "text-blue-800 font-black"; bgClass = "bg-blue-50" }
                      else if (val.startsWith("P")) { colorClass = "text-purple-800 font-black"; bgClass = "bg-purple-50" }

                      return (
                        <td key={day} className={`border-b border-r border-slate-200 relative p-0 m-0 ${isEdited ? 'ring-2 ring-inset ring-yellow-400' : ''} ${bgClass} ${isWeekend && !bgClass ? 'bg-red-50/30' : ''}`}>
                          <input 
                            type="text"
                            value={val}
                            onChange={(e) => handleCellChange(u.id, day, e.target.value)}
                            className={`w-full h-full p-1.5 text-center text-xs outline-none bg-transparent uppercase focus:bg-blue-100 focus:ring-2 focus:ring-blue-400 ${colorClass}`}
                            maxLength={4}
                            placeholder="-"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
