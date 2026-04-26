"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, 
  Shield, Printer, GripVertical, AlertTriangle, 
  Wand2, Radio, Copy, ClipboardPaste, ChevronDown, ChevronUp, 
  CalendarCheck, RotateCcw, PanelLeftClose, PanelLeft, 
  Link2, GraduationCap, Sparkles, CheckCircle 
} from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"
import { isAssenza } from "../utils/shift-logic"
import ConfirmModal from "./ui/ConfirmModal"
import { showUndoToast } from "./ui/UndoToast"
import ServiceManagerToolbar from "./service-manager/ServiceManagerToolbar"
import ServiceManagerSidebar from "./service-manager/ServiceManagerSidebar"
import ServiceBoard from "./service-manager/ServiceBoard"
import { useRef } from "react"

interface CopiedAgentData {
  userId?: string
  type?: string
  serviceCategoryId: string | null | undefined
  serviceTypeId: string | null | undefined
  vehicleId: string | null | undefined
  radioId?: string | null | undefined
  timeRange: string | null | undefined
  serviceDetails: string | null | undefined
}

export default function ServiceManagerPanel({ onClose, tenantSlug }: { onClose?: () => void, tenantSlug?: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  
  const [users, setUsers] = useState<{ id: string; name: string; qualifica?: string; isUfficiale?: boolean; servizio?: string }[]>([])
  const [shifts, setShifts] = useState<{ id: string; userId: string; type: string; serviceCategoryId?: string | null; serviceTypeId?: string | null; vehicleId?: string | null; radioId?: string | null; timeRange?: string | null; serviceDetails?: string | null; patrolGroupId?: string | null }[]>([])
  const [absences, setAbsences] = useState<{ id: string; userId: string; type: string; date: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; types?: { id: string; name: string }[] }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([])
  const [radios, setRadios] = useState<{ id: string; name: string }[]>([])
  const [schools, setSchools] = useState<{ id: string; name: string; schedules: { dayOfWeek: number; entranceTime?: string; exitTime?: string; afternoonExitTime?: string }[] }[]>([])

  // Collapsible state
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({})
  const [collapsedFuoriServizio, setCollapsedFuoriServizio] = useState(false)
  const [collapsedADisposizione, setCollapsedADisposizione] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Copy/Paste: intera giornata
  const [copiedDay, setCopiedDay] = useState<{ date: string; assignments: CopiedAgentData[] } | null>(null)
  // Copy/Paste: singolo agente
  const [copiedAgent, setCopiedAgent] = useState<CopiedAgentData | null>(null)

  // Patrol creation: multi-select
  const [patrolSelection, setPatrolSelection] = useState<Set<string>>(new Set())
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // Undo Logic
  const lastShiftsState = useRef<typeof shifts | null>(null)
  const saveStateForUndo = () => {
    lastShiftsState.current = JSON.parse(JSON.stringify(shifts))
  }

  const undoAction = async () => {
    if (!lastShiftsState.current) return
    
    setLoading(true)
    try {
      const previous = lastShiftsState.current
      const dateStr = currentDate.toISOString().split("T")[0]
      
      for (const s of previous) {
        await fetch("/api/admin/shifts/daily", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: s.userId,
            date: dateStr,
            type: s.type,
            serviceCategoryId: s.serviceCategoryId || null,
            serviceTypeId: s.serviceTypeId || null,
            vehicleId: s.vehicleId || null,
            timeRange: s.timeRange || null,
            serviceDetails: s.serviceDetails || null,
            patrolGroupId: s.patrolGroupId || null
          })
        })
      }
      
      toast.success("Azione annullata!")
      loadData()
    } catch {
      toast.error("Errore durante l'annullamento")
    }
    setLoading(false)
  }
  
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

  const loadData = useCallback(async () => {
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
      if (data.radios) setRadios(data.radios)
      
      const schoolsRes = await fetch("/api/admin/schools")
      const schoolsData = await schoolsRes.json()
      setSchools(schoolsData)
    } catch { toast.error("Errore caricamento dati operativi") }
    setLoading(false)
  }, [currentDate])

  useEffect(() => { loadData() }, [loadData])

  const changeDate = useCallback((days: number) => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + days)
    setCurrentDate(next)
  }, [currentDate])

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
  }, [changeDate])

  const goToToday = () => setCurrentDate(new Date())

  const isToday = () => {
    const now = new Date()
    return currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() === now.getMonth() && currentDate.getDate() === now.getDate()
  }

  const assignService = async (userId: string, targetTypeString: string, categoryId: string | null = null, typeId: string | null = null, vehicleId: string | null = null, radioId: string | null = null, timeRange: string | null = null, serviceDetails: string | null = null) => {
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")

    const existingObj = shifts.find(s => s.userId === userId)
    let newVehicleId = vehicleId;
    if(vehicleId === undefined && existingObj?.vehicleId) {
        newVehicleId = existingObj.vehicleId;
    }
    let newRadioId = radioId;
    if(radioId === undefined && existingObj?.radioId) {
        newRadioId = existingObj.radioId;
    }

    try {
      saveStateForUndo()
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
          radioId: newRadioId,
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

      assignService(userId, finalType, catId, typeId, undefined, undefined)
      showUndoToast("Agente assegnato al servizio", undoAction)
    }
  }
  
  const handleDropToSidebar = (e: React.DragEvent) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      const userShift = shifts.find(s => s.userId === userId)
      if (userShift && userShift.serviceCategoryId) {
        saveStateForUndo()
        handleRemoveService(userId, userShift.type)
        showUndoToast("Agente rimosso dal servizio", undoAction)
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

  const handleAutoSchools = async () => {
    setIsAutoAssigning(true)
    try {
      const y = currentDate.getFullYear()
      const m = String(currentDate.getMonth() + 1).padStart(2, "0")
      const d = String(currentDate.getDate()).padStart(2, "0")
      const dateStr = `${y}-${m}-${d}`

      const res = await fetch("/api/admin/shifts/auto-scuole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        loadData()
      } else {
        toast.error(data.error || "Nessun potenziale assegnamento trovato")
      }
    } catch {
      toast.error("Errore durante l'automazione")
    }
    setIsAutoAssigning(false)
  }

  const handleAIResolve = async () => {
    if (!confirm("L'Assistente AI analizzerà l'intero mese per identificare e coprire i 'buchi' nelle reperibilità, rispettando i riposi e l'equità dei weekend. Procedere?")) return
    
    setLoading(true)
    try {
      const res = await fetch("/api/admin/resolve-holes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`AI: Risolti ${data.holesResolved} buchi di copertura!`, {
          icon: '🛡️',
          duration: 4000
        })
        loadData()
      } else {
        toast.error(data.error || "L'AI non ha trovato soluzioni ottimali")
      }
    } catch {
      toast.error("Errore di connessione con il modulo AI")
    }
    setLoading(false)
  }

  // Ripristina OdS — rimuove tutte le assegnazioni servizio
  const resetOds = async () => {
    setShowResetConfirm(false)
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
            radioId: null,
            timeRange: s.timeRange,
            serviceDetails: null,
            patrolGroupId: null
          })
        })
        count++
      } catch { toast.error("Errore rimozione assegnazione") }
    }
    toast.success(`Ripristinato! ${count} assegnazioni rimosse.`)
    showUndoToast("OdS Ripristinato", undoAction)
    loadData()
  }

  const handleRemoveService = (userId: string, originalTimeRange: string) => {
    assignService(userId, originalTimeRange, null, null, null, null, null, null)
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
    } catch { toast.error("Errore aggiornamento pattuglia") }
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
        radioId: s.radioId,
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
            radioId: assignment.radioId,
            timeRange: assignment.timeRange,
            serviceDetails: assignment.serviceDetails
          })
        })
        count++
      } catch { toast.error("Errore nell'incollare l'assegnazione") }
    }
    
    toast.success(`Incollate ${count} assegnazioni!`)
    loadData()
  }

  // ===== COPY/PASTE SINGOLO AGENTE =====
  const copyAgentConfig = (shift: { serviceCategoryId?: string | null; serviceTypeId?: string | null; vehicleId?: string | null; radioId?: string | null; timeRange?: string | null; serviceDetails?: string | null }) => {
    setCopiedAgent({
      serviceCategoryId: shift.serviceCategoryId,
      serviceTypeId: shift.serviceTypeId,
      vehicleId: shift.vehicleId,
      radioId: shift.radioId,
      timeRange: shift.timeRange,
      serviceDetails: shift.serviceDetails
    })
    toast.success("Configurazione agente copiata!")
  }

  const pasteAgentConfig = (agentId: string, shiftType: string) => {
    if (!copiedAgent) return
    assignService(agentId, shiftType, copiedAgent.serviceCategoryId, copiedAgent.serviceTypeId, copiedAgent.vehicleId, copiedAgent.radioId, copiedAgent.timeRange, copiedAgent.serviceDetails)
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

  // Funzione Rendering Blocco Fase (Mattino / Pomeriggio) rimossa e sostituita con ServiceBoard



  return (
    <>
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative font-sans">
      
      <ServiceManagerToolbar 
        currentDate={currentDate}
        changeDate={changeDate}
        goToToday={goToToday}
        isToday={isToday}
        loading={loading}
        isAutoAssigning={isAutoAssigning}
        autoGenerate={autoGenerate}
        handleAutoSchools={handleAutoSchools}
        handleAIResolve={handleAIResolve}
        setShowResetConfirm={setShowResetConfirm}
        copiedDay={copiedDay}
        copyDay={copyDay}
        pasteDay={pasteDay}
        onClose={onClose}
        patrolSelectionSize={patrolSelection.size}
        createPatrolFromSelection={createPatrolFromSelection}
        tenantSlug={tenantSlug || ""}
      />

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="font-black uppercase tracking-widest text-xs animate-pulse">Caricamento Sala Operativa...</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          
          <ServiceManagerSidebar 
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            disponibiliNonAssegnati={disponibiliNonAssegnati}
            indisponibili={indisponibili}
            collapsedADisposizione={collapsedADisposizione}
            setCollapsedADisposizione={setCollapsedADisposizione}
            collapsedFuoriServizio={collapsedFuoriServizio}
            setCollapsedFuoriServizio={setCollapsedFuoriServizio}
            handleDropToSidebar={handleDropToSidebar}
            handleDragOver={handleDragOver}
            shifts={shifts}
            patrolSelection={patrolSelection}
            togglePatrolSelect={togglePatrolSelect}
            assignService={assignService}
            copyAgentConfig={copyAgentConfig}
            pasteAgentConfig={pasteAgentConfig}
            copiedAgent={copiedAgent}
            vehicles={vehicles}
            radios={radios}
            toggleLink={toggleLink}
            handleRemoveService={handleRemoveService}
            schools={schools}
            currentDate={currentDate}
            users={users}
            handleDragStart={handleDragStart}
          />

          {/* MAIN OPERATIONAL BOARDS */}
          <div className="flex-1 overflow-x-auto flex flex-col bg-slate-900 relative">
             <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-800 to-transparent opacity-50 pointer-events-none"></div>
             
             <div className="flex-1 flex gap-1 p-2 md:p-3 overflow-x-auto h-full items-stretch">
                <ServiceBoard 
                  titolo="Turno Mattina"
                  filtroTurni={["M"]}
                  shifts={shifts}
                  indisponibili={indisponibili}
                  users={users}
                  categories={categories}
                  collapsedCats={collapsedCats}
                  toggleCatCollapse={toggleCatCollapse}
                  handleDragOver={handleDragOver}
                  handleDropToCategory={handleDropToCategory}
                  handleDropToService={handleDropToService}
                  vehicles={vehicles}
                  radios={radios}
                  schools={schools}
                  currentDate={currentDate}
                  patrolSelection={patrolSelection}
                  togglePatrolSelect={togglePatrolSelect}
                  assignService={assignService}
                  copyAgentConfig={copyAgentConfig}
                  pasteAgentConfig={pasteAgentConfig}
                  copiedAgent={copiedAgent}
                  toggleLink={toggleLink}
                  handleRemoveService={handleRemoveService}
                  handleDragStart={handleDragStart}
                />
                <ServiceBoard 
                  titolo="Turno Pomeriggio"
                  filtroTurni={["P"]}
                  shifts={shifts}
                  indisponibili={indisponibili}
                  users={users}
                  categories={categories}
                  collapsedCats={collapsedCats}
                  toggleCatCollapse={toggleCatCollapse}
                  handleDragOver={handleDragOver}
                  handleDropToCategory={handleDropToCategory}
                  handleDropToService={handleDropToService}
                  vehicles={vehicles}
                  radios={radios}
                  schools={schools}
                  currentDate={currentDate}
                  patrolSelection={patrolSelection}
                  togglePatrolSelect={togglePatrolSelect}
                  assignService={assignService}
                  copyAgentConfig={copyAgentConfig}
                  pasteAgentConfig={pasteAgentConfig}
                  copiedAgent={copiedAgent}
                  toggleLink={toggleLink}
                  handleRemoveService={handleRemoveService}
                  handleDragStart={handleDragStart}
                />
             </div>
          </div>

        </div>
      )}
    </div>

    <ConfirmModal
      isOpen={showResetConfirm}
      onClose={() => setShowResetConfirm(false)}
      onConfirm={resetOds}
      title="Ripristina OdS"
      message="Questo rimuoverà TUTTE le assegnazioni servizio per la data selezionata. I turni base (M/P/RP) resteranno intatti."
      destructive
      delaySeconds={3}
      confirmLabel="Ripristina Tutto"
    />
    </>
  )
}

