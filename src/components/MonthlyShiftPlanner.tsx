"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Loader2, ChevronLeft, ChevronRight, Save, Trash2, CalendarClock, RotateCcw, Wand2, FilterX, Calendar as CalendarIcon, Clock, X, RefreshCcw } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { formatShiftCode, isAssenza, isMalattia, isMattina, isPomeriggio } from "@/utils/shift-logic"
import ShiftCodeLegend from "@/components/ui/ShiftCodeLegend"
import ConfirmModal from "@/components/ui/ConfirmModal"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"

const CAT_THEME: Record<string, { border: string; bg: string; text: string; btnBg: string; btnText: string; btnHover: string }> = {
  amber:  { border: "border-yellow-300", bg: "bg-yellow-50",  text: "text-yellow-800", btnBg: "bg-yellow-500",  btnText: "text-white", btnHover: "hover:bg-yellow-600" },
  rose:   { border: "border-pink-300",   bg: "bg-pink-50",    text: "text-pink-800",   btnBg: "bg-pink-500",    btnText: "text-white", btnHover: "hover:bg-pink-600" },
  blue:   { border: "border-sky-300",    bg: "bg-sky-50",     text: "text-sky-800",    btnBg: "bg-sky-500",     btnText: "text-white", btnHover: "hover:bg-sky-600" },
  red:    { border: "border-red-300",    bg: "bg-red-50",     text: "text-red-800",    btnBg: "bg-red-500",     btnText: "text-white", btnHover: "hover:bg-red-600" },
  teal:   { border: "border-teal-300",   bg: "bg-teal-50",    text: "text-teal-800",   btnBg: "bg-teal-500",    btnText: "text-white", btnHover: "hover:bg-teal-600" },
  indigo: { border: "border-indigo-300", bg: "bg-indigo-50",  text: "text-indigo-800", btnBg: "bg-indigo-500",  btnText: "text-white", btnHover: "hover:bg-indigo-600" },
}

export default function MonthlyShiftPlanner({ tenantSlug }: { tenantSlug?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)



  const [users, setUsers] = useState<{ id: string; name: string; rotationGroupId?: string; fixedRestDay?: number | null }[]>([])
  // Map of userId -> "YYYY-MM-DD" -> type
  const [grid, setGrid] = useState<Record<string, Record<string, string>>>({})
  const [syncedGrid, setSyncedGrid] = useState<Record<string, Record<string, boolean>>>({})
  const [originalGrid, setOriginalGrid] = useState<Record<string, Record<string, string>>>({})
  const [isGeneratingAnnual, setIsGeneratingAnnual] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // --- STATO RESET GENERALE ---
  const [isGeneralResetOpen, setIsGeneralResetOpen] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [isExecutingGeneralReset, setIsExecutingGeneralReset] = useState(false)

  // --- STATO MODALE DETTAGLIO GIORNATA ---
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{userId: string, dateStr: string, day: number} | null>(null)
  const [detailData, setDetailData] = useState<{type: string, overtimeHours: string | number, note: string}>({type: "", overtimeHours: 0, note: ""})

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/shifts/monthly?year=${year}&month=${month}&t=${Date.now()}`)
      const data = await res.json()
      if (data.users) setUsers(data.users)
      
      if (data.shifts) {
        const initialGrid: Record<string, Record<string, string>> = {}
        const initialSynced: Record<string, Record<string, boolean>> = {}
        data.shifts.forEach((s: { date: string; userId: string; type: string; isSyncedToVerbatel?: boolean }) => {
          const dStr = s.date.split("T")[0] // YYYY-MM-DD
          if (!initialGrid[s.userId]) {
            initialGrid[s.userId] = {}
            initialSynced[s.userId] = {}
          }
          initialGrid[s.userId][dStr] = s.type
          initialSynced[s.userId][dStr] = !!s.isSyncedToVerbatel
        })
        setGrid(initialGrid)
        setSyncedGrid(initialSynced)
        setOriginalGrid(JSON.parse(JSON.stringify(initialGrid))) // Deep copy
      }
    } catch {
      toast.error("Errore caricamento dati")
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { 
    const t = setTimeout(() => loadData(), 0);
    return () => clearTimeout(t);
  }, [loadData])

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
          if (group) {
            let times: Record<string, { start: string, end: string }> = {}
            try {
              const parsed = JSON.parse(group.pattern)
              if (!Array.isArray(parsed) && parsed.shiftTimes) {
                times = parsed.shiftTimes
              }
            } catch {}

            if (times[newVal]) {
               timeRange = `${times[newVal].start}-${times[newVal].end}`
            } else if (newVal.startsWith("M")) {
               timeRange = `${group.mStartTime || "07:00"}-${group.mEndTime || "13:00"}`
            } else if (newVal.startsWith("P")) {
               timeRange = `${group.pStartTime || "13:00"}-${group.pEndTime || "19:00"}`
            }
          }
          
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

  const openDetailModal = (userId: string, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    setSelectedCell({ userId, dateStr, day })
    const val = grid[userId]?.[dateStr] || ""
    setDetailData({ type: val, overtimeHours: 0, note: "" })
    setDetailModalOpen(true)
  }

  const saveDetailModal = async () => {
    if (!selectedCell) return
    const { userId, dateStr } = selectedCell
    
    // First update local grid
    setGrid(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [dateStr]: detailData.type
      }
    }))
    
    // If there is overtime or note, we should ideally save it to the DB immediately.
    // For now, we update the type in the grid, and if they click Save Modifiche it will save the type.
    // To properly save overtime, we should call the API directly here.
    // Calcolo timeRange
    let timeRange: string | undefined = undefined
    const u = users.find(u => u.id === userId)
    const group = rotationGroups.find(g => g.id === u?.rotationGroupId)
    if (group && detailData.type) {
      let times: Record<string, { start: string, end: string }> = {}
      try {
        const parsed = JSON.parse(group.pattern)
        if (!Array.isArray(parsed) && parsed.shiftTimes) {
          times = parsed.shiftTimes
        }
      } catch {}

      if (times[detailData.type]) {
         timeRange = `${times[detailData.type].start}-${times[detailData.type].end}`
      } else if (detailData.type.startsWith("M")) {
         timeRange = `${group.mStartTime || "07:00"}-${group.mEndTime || "13:00"}`
      } else if (detailData.type.startsWith("P")) {
         timeRange = `${group.pStartTime || "13:00"}-${group.pEndTime || "19:00"}`
      }
    }

    try {
      await fetch("/api/admin/shifts/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           updates: [{ 
              userId, 
              date: dateStr, 
              type: detailData.type,
              timeRange,
              overtimeHours: detailData.overtimeHours,
              serviceDetails: detailData.note
           }] 
        })
      })
      toast.success("Dettaglio salvato!")
      setDetailModalOpen(false)
      loadData()
    } catch {
      toast.error("Errore salvataggio dettaglio")
    }
  }

  const [confirmResetTarget, setConfirmResetTarget] = useState<string | null | 'all'>(null)

  const handleResetMonth = async (specificUserId?: string) => {
    setConfirmResetTarget(null)
    
    setIsResetting(true)
    try {
      const res = await fetch("/api/admin/shifts/monthly", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, userId: specificUserId })
      })
      if (!res.ok) throw new Error()
      toast.success("Reset completato!")
      loadData()
    } catch {
      toast.error("Errore durante il reset")
    }
    setIsResetting(false)
  }

  const [isPublishing, setIsPublishing] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const publishToTelegram = async () => {
    setShowPublishConfirm(false)
    
    setIsPublishing(true)
    try {
      const res = await fetch("/api/telegram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Notifiche inviate: ${data.count}`)
      } else {
        toast.error(data.error || "Errore durante l'invio delle notifiche")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setIsPublishing(false)
  }

  const [showBulkResetConfirm, setShowBulkResetConfirm] = useState(false)

  const handleGeneralReset = async () => {
    setShowBulkResetConfirm(false)

    setIsExecutingGeneralReset(true)
    try {
      const res = await fetch("/api/admin/shifts/monthly", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, months: selectedMonths })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Reset completato! Rimossi ${data.count} turni in ${selectedMonths.length} mesi.`, { duration: 5000 })
        setIsGeneralResetOpen(false)
        setSelectedMonths([])
        loadData()
      } else {
        toast.error(data.error || "Errore durante il reset")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setIsExecutingGeneralReset(false)
  }

  const [showAnnualConfirm, setShowAnnualConfirm] = useState(false)

  const applyAnnualGeneration = async () => {
    setShowAnnualConfirm(false)
    
    setIsGeneratingAnnual(true)
    try {
      const res = await fetch("/api/admin/shifts/annual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, groupId: wizardGroupId, target: wizardTarget })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Generazione completata! ${data.count} turni creati/aggiornati per ${data.agentsCount} agenti.`)
        loadData()
        setShowWizard(false)
      } else {
        toast.error(data.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setIsGeneratingAnnual(false)
  }

  // --- WIZARD AUTOMAZIONE TURNI (DINAMICO DA DB) ---
  const [showWizard, setShowWizard] = useState(false)
  const [wizardTarget, setWizardTarget] = useState("ALL")
  const [wizardGroupId, setWizardGroupId] = useState("")
  const [wizardStartDay, setWizardStartDay] = useState(0) // 0-27: quale giorno del ciclo corrisponde al 1° del mese
  const [rotationGroups, setRotationGroups] = useState<{ id: string; name: string; pattern: string; mStartTime?: string; mEndTime?: string; pStartTime?: string; pEndTime?: string; startDate?: string; users?: { id: string }[] }[]>([])
  
  const allAvailableShiftCodes = useMemo(() => {
    const baseCodes = ["M7", "M8", "P12", "P14", "P15", "P16", "R", "RR", "REP", "REP_I"];
    const customCodes = new Set<string>();
    rotationGroups.forEach(g => {
      try {
         const data = JSON.parse(g.pattern);
         if (Array.isArray(data)) {
           data.forEach((c: string) => customCodes.add(c));
         } else {
           const seq = data.sequence || [];
           seq.forEach((c: string) => customCodes.add(c));
           const times = data.shiftTimes || {};
           Object.keys(times).forEach((c: string) => customCodes.add(c));
           const enabled = data.enabledCodes || [];
           enabled.forEach((c: string) => customCodes.add(c));
           const customs = data.customCodes || [];
           customs.forEach((c: any) => customCodes.add(c.code));
         }
      } catch {}
    });
    return Array.from(new Set([...baseCodes, ...Array.from(customCodes)])).sort();
  }, [rotationGroups]);

  const [filterText, setFilterText] = useState("")

  // Carica i gruppi di rotazione dal database
  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rotation-groups")
      const data = await res.json()
      if (Array.isArray(data)) {
        setRotationGroups(data)
        if (data.length > 0 && !wizardGroupId) setWizardGroupId(data[0].id)
      }
    } catch {}
  }, [wizardGroupId])
  useEffect(() => { 
    const t = setTimeout(() => loadGroups(), 0);
    return () => clearTimeout(t);
  }, [loadGroups])
  
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
    let group: { id: string; name: string; pattern: string; mStartTime?: string; mEndTime?: string; pStartTime?: string; pEndTime?: string; startDate?: string } | undefined;
    if (wizardGroupId !== "AUTO") {
      group = rotationGroups.find(g => g.id === wizardGroupId)
      if (!group) {
        toast.error("Seleziona un turno valido.")
        return
      }
    }

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
    // wizardStartDay è 0-based (0 = giorno 1 del ciclo). 
    // Attenzione: se "AUTO", l'offset deve essere calcolato individualmente per ogni utente.
    const startIndex = wizardStartDay

    setGrid(prev => {
      const nextGrid = { ...prev }
      targetUsers.forEach(u => {
        if (!nextGrid[u.id]) nextGrid[u.id] = {}
        
        let uGroup = group;
        let uPattern: string[] = []
        let uStartIndex = startIndex;

        if (wizardGroupId === "AUTO") {
           const grp = rotationGroups.find(g => g.id === u.rotationGroupId)
           if (!grp) return; // Salta agenti senza gruppo assegnato
           uGroup = grp;
           try { 
             const data = JSON.parse(grp.pattern) 
             uPattern = Array.isArray(data) ? data : (data.sequence || [])
           } catch { return }
           
           // Calcola start index automaticamente per il suo gruppo
           if (grp.startDate) {
             const sDate = new Date(grp.startDate)
             const firstOfMonth = new Date(year, month - 1, 1)
             const diffTime = firstOfMonth.getTime() - sDate.getTime()
             const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
             const pLen = uPattern.length > 0 ? uPattern.length : 28
             uStartIndex = ((diffDays % pLen) + pLen) % pLen
           } else {
             uStartIndex = 0
           }
        } else {
           try { 
             const data = JSON.parse(group!.pattern) 
             uPattern = Array.isArray(data) ? data : (data.sequence || [])
           } catch { return }
           if (uPattern.length === 0) return;
        }

        daysArray.forEach((day, index) => {
          const dStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          
          // Non sovrascriviamo ferie, malattie e permessi
          const existing = nextGrid[u.id][dStr]
          if (existing && isAssenza(existing)) return

          // LOGICA RIPOSO DINAMICO
          const dateObj = new Date(year, month - 1, day)
          if (u.fixedRestDay !== null && u.fixedRestDay !== undefined && dateObj.getDay() === u.fixedRestDay) {
            const prevSunday = new Date(dateObj)
            prevSunday.setDate(dateObj.getDate() - (dateObj.getDay() || 7))
            
            const diffSun = prevSunday.getTime() - new Date(year, month - 1, 1).getTime()
            const daysDiffSun = Math.round(diffSun / (1000 * 60 * 60 * 24))
            const sunPatternIdx = ((uStartIndex + daysDiffSun) % uPattern.length + uPattern.length) % uPattern.length
            const sunType = uPattern[sunPatternIdx]

            if (sunType === "M" || isMattina(sunType) || isPomeriggio(sunType)) {
              nextGrid[u.id][dStr] = "RP"
              return
            }
          }
          
          // Usa l'offset calcolato per allineare il pattern
          const patternIndex = (uStartIndex + index) % uPattern.length
          const pVal = uPattern[patternIndex]
          
          if (pVal === "M") {
            // Pattern generico legacy — converti con gli orari del gruppo
            nextGrid[u.id][dStr] = formatShiftCode("M", uGroup?.mStartTime)
          } else if (pVal === "P") {
            // Pattern generico legacy — converti con gli orari del gruppo
            nextGrid[u.id][dStr] = formatShiftCode("P", uGroup?.pStartTime)
          } else {
            // Codice specifico (M7, M8, P14, P15, N, RP, RR, etc.) — scrivi diretto
            nextGrid[u.id][dStr] = pVal
          }
        })
      })
      return nextGrid
    })
    
    toast.success(`Pattern applicato a ${targetUsers.length} agenti! (Ricordati di salvare)`)
    setShowWizard(false)
  }

  // Estrai squadre uniche (ora basate sui gruppi dal DB)
  const squadreFromGroups = rotationGroups.map(g => ({ id: g.id, name: g.name, count: g.users?.length || 0 }))
  
  // Filtra utenti per ricerca
  const filteredUsers = filterText 
    ? users.filter(u => u.name.toLowerCase().includes(filterText.toLowerCase()))
    : users

  return (
    <>
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#1e293b] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-md">
        <h2 className="text-xl font-bold uppercase tracking-wide">Pianificatore Mensile Turni Ordinari</h2>
        
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-inner my-2 sm:my-0">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded transition-colors"><ChevronLeft width={20} height={20}/></button>
          <div className="px-6 font-bold tracking-wide uppercase text-sm sm:text-base">
            {currentDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded transition-colors"><ChevronRight width={20} height={20}/></button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowWizard(!showWizard)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <CalendarClock width={16} height={16}/> Auto-Compila
          </button>
          
          <button 
            onClick={() => setConfirmResetTarget('all')}
            disabled={isResetting}
            className="px-4 py-2 bg-slate-700 hover:bg-rose-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600 transition-colors"
          >
            {isResetting ? <Loader2 className="animate-spin" width={16} height={16}/> : <RotateCcw width={16} height={16}/>} Reset Mese
          </button>
          
          <button 
            onClick={() => {
              setSelectedMonths([month]) // Pre-seleziona il mese corrente
              setIsGeneralResetOpen(true)
            }}
            className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 border border-rose-800"
          >
            <FilterX width={16} height={16}/> Reset Generale
          </button>
          <button 
            onClick={saveChanges} disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" width={16} height={16}/> : <Save width={16} height={16}/>} Salva Modifiche
          </button>
          
          <button 
            onClick={() => setShowPublishConfirm(true)} disabled={isPublishing}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md shadow-sky-500/20"
          >
            {isPublishing ? <Loader2 className="animate-spin" width={16} height={16}/> : <span>🚀 Invia Telegram</span>}
          </button>

          <Link href={`/${tenantSlug || ''}`} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600">
            <ChevronLeft width={16} height={16}/> Esci
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
                <option value="AUTO" className="text-emerald-700 font-black">⚙️ Automatico (Da Anagrafica)</option>
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
                {(() => {
                  const selectedGroup = rotationGroups.find(g => g.id === wizardGroupId)
                  let pLength = 28
                  let parsedPattern: string[] = []
                  if (selectedGroup) {
                    try { 
                      const data = JSON.parse(selectedGroup.pattern)
                      parsedPattern = Array.isArray(data) ? data : (data.sequence || [])
                      pLength = parsedPattern.length > 0 ? parsedPattern.length : 28
                    } catch {}
                  }
                  
                  return Array.from({length: pLength}, (_, i) => {
                    let patternVal = ""
                    if (selectedGroup && parsedPattern.length > 0) {
                      patternVal = ` → ${parsedPattern[i] || "?"}`
                    }
                    const weekNum = Math.floor(i / 7) + 1
                    const dayInWeek = (i % 7) + 1
                    return <option key={i} value={i}>Giorno {i + 1} (S{weekNum}.G{dayInWeek}{patternVal})</option>
                  })
                })()}
              </select>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <button 
              onClick={applyAutomation}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 text-sm flex items-center gap-2"
            >
              <Wand2 width={16} height={16}/> COMPILA GRIGLIA MESE
            </button>

            <button 
              onClick={() => setShowAnnualConfirm(true)}
              disabled={isGeneratingAnnual}
              className="px-8 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 text-sm flex items-center gap-2"
            >
              {isGeneratingAnnual ? <Loader2 className="animate-spin" width={16} height={16}/> : <RotateCcw width={16} height={16}/>} GENERA TUTTO L&apos;ANNO {year}
            </button>
            
            <Link 
              href={`/${tenantSlug || 'admin'}/admin/risorse?tab=cicli`} 
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              ⚙ Gestisci Squadre
            </Link>
            
            <span className="text-xs text-blue-700 ml-2 italic">
              Il pattern si allinea automaticamente al giorno della settimana del 1° del mese.
            </span>
          </div>
        </div>
      )}


      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 width={40} height={40} className="animate-spin text-blue-600" /></div>
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

          {/* Legenda Codici */}
          <div className="mb-2">
            <ShiftCodeLegend />
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
                    <td className="p-1.5 border-b border-r-2 border-slate-300 sticky left-0 z-10 font-bold text-slate-900 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] bg-inherit uppercase flex items-center justify-between group">
                      <span>{u.name}</span>
                      <button 
                        onClick={() => handleResetMonth(u.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all"
                        title="Resetta mese per questo agente"
                      >
                        <Trash2 width={12} height={12} />
                      </button>
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
                      
                      const s = val.toUpperCase()
                      if (isMalattia(s)) { colorClass = "text-amber-700 font-black"; bgClass = "bg-amber-50" }
                      else if (isAssenza(s)) { colorClass = "text-red-600 font-black"; bgClass = "bg-red-50" }
                      else if (isMattina(s)) { colorClass = "text-blue-800 font-black"; bgClass = "bg-blue-50" }
                      else if (isPomeriggio(s)) { colorClass = "text-purple-800 font-black"; bgClass = "bg-purple-50" }
                      else if (s === "RP") { colorClass = "text-red-700 font-black"; bgClass = "bg-red-100" }

                      const isSynced = syncedGrid[u.id]?.[dStr] && val !== "";
                      
                      return (
                        <td key={day} className={`border-b border-r border-slate-200 relative p-0 m-0 ${isEdited ? 'ring-2 ring-inset ring-yellow-400' : ''} ${bgClass} ${isWeekend && !bgClass ? 'bg-red-50/30' : ''}`}>
                          <input 
                            type="text"
                            value={val}
                            onChange={(e) => {
                               handleCellChange(u.id, day, e.target.value);
                               setSyncedGrid(prev => ({ ...prev, [u.id]: { ...prev[u.id], [dStr]: false } }))
                            }}
                            onDoubleClick={() => openDetailModal(u.id, day)}
                            title="Doppio click per Dettagli, Straordinari e Assenze"
                            className={`w-full h-full p-1.5 text-center text-xs outline-none bg-transparent uppercase focus:bg-blue-100 focus:ring-2 focus:ring-blue-400 ${colorClass} cursor-pointer`}
                            maxLength={10}
                            placeholder="-"
                          />
                          {isSynced && !isEdited && (
                            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-sm" title="Sincronizzato in Verbatel"></div>
                          )}
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

      {/* --- MODALE RESET GENERALE --- */}
      {isGeneralResetOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-rose-700 p-6 text-white text-center">
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 width={32} height={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Reset Generale</h3>
              <p className="text-rose-100 text-sm font-medium mt-1 opacity-90 italic">Pulisci i turni di più mesi contemporaneamente</p>
            </div>

            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Seleziona Mesi ({year})</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedMonths(Array.from({length: 12}, (_, i) => i + 1))}
                    className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                  >
                    Tutti
                  </button>
                  <button 
                    onClick={() => setSelectedMonths([])}
                    className="text-[10px] font-black uppercase text-slate-400 hover:underline"
                  >
                    Nessuno
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {Array.from({length: 12}, (_, i) => {
                  const mNum = i + 1
                  const mName = new Date(year, i, 1).toLocaleDateString("it-IT", { month: "short" })
                  const isSelected = selectedMonths.includes(mNum)
                  return (
                    <button
                      key={mNum}
                      onClick={() => {
                        setSelectedMonths(prev => 
                          prev.includes(mNum) ? prev.filter(m => m !== mNum) : [...prev, mNum]
                        )
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                        isSelected 
                          ? "bg-rose-50 border-rose-600 text-rose-700 shadow-sm" 
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {mName}
                    </button>
                  )
                })}
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 rounded-r-xl">
                <div className="flex gap-3">
                  <div className="shrink-0 text-amber-500">⚠</div>
                  <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase">
                    Verranno cancellati solo i turni e i riposi generati (RP, RR). 
                    Le Ferie e le altre assenze giustificate rimarranno intatte.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { if (selectedMonths.length === 0) { toast.error('Seleziona almeno un mese'); return; } setShowBulkResetConfirm(true) }}
                  disabled={isExecutingGeneralReset || selectedMonths.length === 0}
                  className="w-full py-4 bg-rose-700 hover:bg-rose-800 text-white font-black rounded-2xl shadow-xl shadow-rose-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                >
                  {isExecutingGeneralReset ? (
                    <Loader2 width={18} height={18} className="animate-spin" />
                  ) : (
                    <>ESEGUI RESET MASSIVO ({selectedMonths.length})</>
                  )}
                </button>
                
                <button
                  onClick={() => setIsGeneralResetOpen(false)}
                  disabled={isExecutingGeneralReset}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Confirm Modals */}
    <ConfirmModal
      isOpen={!!confirmResetTarget}
      onClose={() => setConfirmResetTarget(null)}
      onConfirm={() => handleResetMonth(confirmResetTarget === 'all' ? undefined : confirmResetTarget || undefined)}
      title="Reset Turni Mese"
      message={`Tutti i turni per ${currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} verranno eliminati. Le assenze (Ferie, Malattia) NON verranno toccate.`}
      destructive
      delaySeconds={3}
      confirmLabel="Reset Turni"
    />

    <ConfirmModal
      isOpen={showPublishConfirm}
      onClose={() => setShowPublishConfirm(false)}
      onConfirm={publishToTelegram}
      title="Pubblica su Telegram"
      message={`Verrà inviata una notifica Push a tutti gli agenti per avvisarli che i turni di ${currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} sono online.`}
      confirmLabel="Invia Notifica"
      isLoading={isPublishing}
    />

    <ConfirmModal
      isOpen={showBulkResetConfirm}
      onClose={() => setShowBulkResetConfirm(false)}
      onConfirm={handleGeneralReset}
      title="Reset Massivo"
      message={`ATTENZIONE: Stai per resettare i turni di ${selectedMonths.length} mesi dell'anno ${year}. Le assenze protette (Ferie, Malattia, 104) VERRANNO PRESERVATE.`}
      count={selectedMonths.length}
      destructive
      delaySeconds={5}
      confirmLabel="Conferma Reset Massivo"
    />

    <ConfirmModal
      isOpen={showAnnualConfirm}
      onClose={() => setShowAnnualConfirm(false)}
      onConfirm={applyAnnualGeneration}
      title="Generazione Annuale"
      message={`Stai per generare i turni per TUTTO L'ANNO ${year}. Le assenze già caricate non verranno sovrascritte.`}
      confirmLabel="Genera Anno"
      isLoading={isGeneratingAnnual}
    />

    {/* ═══════════ MODALE DETTAGLIO GIORNATA (AVANZATA) ═══════════ */}
    {detailModalOpen && selectedCell && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-900 text-white shrink-0 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <CalendarIcon width={16} height={16} className="text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    {users.find(u => u.id === selectedCell.userId)?.name}
                  </h3>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Giorno {selectedCell.day}
                </p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="p-5 space-y-5">
                
                {/* Selezione Codice */}
                <div>
                  <div className="relative flex items-center">
                    <select 
                      value={detailData.type} 
                      onChange={e => setDetailData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl pl-4 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <option value="">Seleziona codice...</option>
                      <optgroup label="Tipi di Turno e Riposo">
                        {allAvailableShiftCodes.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      {AGENDA_CATEGORIES.map(cat => (
                        <optgroup key={cat.group} label={`${cat.emoji} ${cat.group}`}>
                          {cat.items.map(item => (
                            <option key={item.shortCode} value={item.shortCode}>{item.shortCode} - {item.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Turni Rapidi */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Turni Rapidi</p>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
                    {allAvailableShiftCodes.filter(c => !["R", "RR"].includes(c)).slice(0, 12).map(code => (
                      <button 
                        key={code} 
                        onClick={() => setDetailData(prev => ({ ...prev, type: code }))}
                        className={`py-2 rounded-lg text-[10px] font-black transition-all border ${
                          detailData.type === code 
                            ? "ring-2 ring-indigo-500 shadow-md " 
                            : ""
                        } ${
                          code === "REP"
                          ? "bg-violet-600 text-white border-violet-700 hover:bg-violet-700"
                          : code.startsWith("M")
                            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-500 hover:text-white"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white"
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categorie Agenda */}
                <div className="space-y-2.5">
                  {AGENDA_CATEGORIES.map(cat => {
                    const theme = CAT_THEME[cat.color] || CAT_THEME.indigo
                    return (
                      <div key={cat.group} className={`border ${theme.border} rounded-xl overflow-hidden`}>
                        <div className={`${theme.bg} px-3 py-2 flex items-center gap-2`}>
                          <span className="text-sm">{cat.emoji}</span>
                          <span className={`text-[11px] font-bold ${theme.text} uppercase tracking-wide`}>{cat.group}</span>
                        </div>
                        <div className="p-2 bg-white grid grid-cols-2 gap-1.5">
                          {cat.items.map(item => (
                            <button 
                              key={item.shortCode} 
                              onClick={() => setDetailData(prev => ({ ...prev, type: item.shortCode }))}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all border hover:border-slate-300 hover:shadow-sm group/btn ${
                                detailData.type === item.shortCode ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50" : "border-slate-100"
                              }`}
                            >
                              <span className={`${theme.btnBg} ${theme.btnText} text-[8px] font-black rounded px-1.5 py-0.5 min-w-[36px] text-center whitespace-nowrap`}>
                                {item.shortCode.length > 6 ? item.shortCode.substring(0, 6) : item.shortCode}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-700 leading-tight truncate">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <hr className="border-slate-200" />

                {/* Campi Straordinario e Note */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ore di Straordinario</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0" max="12" step="0.5"
                        value={detailData.overtimeHours || ""}
                        onChange={e => setDetailData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2.5 pl-10 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                        placeholder="Es: 2.5"
                      />
                      <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Note / Motivazione</label>
                    <textarea 
                      placeholder="Es: Servizio ordine pubblico"
                      value={detailData.note}
                      onChange={e => setDetailData(prev => ({ ...prev, note: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none text-sm"
                    />
                  </div>
                </div>

              </div>
            </div>
            
            {/* Footer con bottoni */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setDetailData(prev => ({ ...prev, type: "" }))}
                  className="w-1/3 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 bg-white rounded-xl text-[11px] font-bold uppercase border border-slate-200 transition-all"
                >
                  Svuota Turno
                </button>
                <button 
                  onClick={saveDetailModal}
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
    </>
  )
}
