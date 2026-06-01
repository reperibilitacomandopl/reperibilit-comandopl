"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, Edit3, ChevronLeft, User, Users, Calendar, GripVertical, X, Check, Activity } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

const DAYS_OF_WEEK = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]

// Catalogo completo dei codici turno disponibili
const SHIFT_CODES: { code: string; label: string; category: "mattina" | "pomeriggio" | "notte" | "riposo" }[] = [
  // Mattina
  { code: "M7", label: "Mattina 07:00", category: "mattina" },
  { code: "M8", label: "Mattina 08:00", category: "mattina" },
  // Pomeriggio
  { code: "P12", label: "Pomeriggio 12:00", category: "pomeriggio" },
  { code: "P14", label: "Pomeriggio 14:00", category: "pomeriggio" },
  { code: "P15", label: "Pomeriggio 15:00", category: "pomeriggio" },
  { code: "P16", label: "Pomeriggio 16:00", category: "pomeriggio" },
  { code: "P18", label: "Serale 18:00", category: "pomeriggio" },
  // Notte
  { code: "N", label: "Notte", category: "notte" },
  { code: "N20", label: "Notte 20:00", category: "notte" },
  { code: "N22", label: "Notte 22:00", category: "notte" },
  // Riposo
  { code: "RP", label: "Riposo Programmato", category: "riposo" },
  { code: "RR", label: "Riposo Recupero", category: "riposo" },
]

const SHIFT_COLORS: Record<string, string> = {
  mattina: "bg-blue-50 border-blue-200 text-blue-700",
  pomeriggio: "bg-indigo-50 border-indigo-200 text-indigo-700",
  notte: "bg-slate-800 border-slate-700 text-white",
  riposo: "bg-rose-50 border-rose-200 text-rose-700",
}

const DEFAULT_SPECIFIC_TIMES: Record<string, { start: string, end: string }> = {
  "M7": { start: "07:00", end: "13:00" },
  "M8": { start: "08:00", end: "14:00" },
  "P12": { start: "12:00", end: "18:00" },
  "P13": { start: "13:00", end: "19:00" },
  "P14": { start: "14:00", end: "20:00" },
  "P15": { start: "15:00", end: "21:00" },
  "P16": { start: "16:00", end: "22:00" },
  "P17": { start: "17:00", end: "23:00" },
  "P18": { start: "18:00", end: "00:00" },
  "N": { start: "22:00", end: "06:00" },
  "N20": { start: "20:00", end: "02:00" },
  "N22": { start: "22:00", end: "06:00" },
}

// This will be populated dynamically to include custom codes
let _allCodes = [...SHIFT_CODES]

const getCodeColor = (code: string): string => {
  const entry = _allCodes.find(s => s.code === code)
  if (entry) return SHIFT_COLORS[entry.category]
  if (code === "M" || code.startsWith("M")) return SHIFT_COLORS.mattina
  if (code === "P" || code.startsWith("P")) return SHIFT_COLORS.pomeriggio
  if (code.startsWith("N")) return SHIFT_COLORS.notte
  if (code === "RP" || code === "RR") return SHIFT_COLORS.riposo
  return "bg-emerald-50 border-emerald-200 text-emerald-700"
}

// Codici base abilitati di default (M generico e P generico + riposi)
const DEFAULT_ENABLED_CODES = ["M7", "M8", "P14", "P15", "RP", "RR"]

interface RotationGroup {
  id: string
  name: string
  pattern: string // JSON string
  mStartTime: string
  mEndTime: string
  pStartTime: string
  pEndTime: string
  startDate: string
  users: { id: string; name: string; fixedRestDay: number | null; dynamicRestStartDay?: number | null; isActive?: boolean }[]
}

export default function SquadreManager() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<RotationGroup[]>([])
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; isActive?: boolean }[]>([])

  // Creazione nuovo gruppo
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")

  // Editing pattern
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null)
  const [editPattern, setEditPattern] = useState<string[]>([])
  const [editMStart, setEditMStart] = useState("07:00")
  const [editMEnd, setEditMEnd] = useState("13:00")
  const [editPStart, setEditPStart] = useState("13:00")
  const [editPEnd, setEditPEnd] = useState("19:00")
  const [editStartDate, setEditStartDate] = useState(new Date().toISOString().split('T')[0])
  const [editName, setEditName] = useState("")
  const [enabledCodes, setEnabledCodes] = useState<string[]>(DEFAULT_ENABLED_CODES)
  const [editShiftTimes, setEditShiftTimes] = useState<Record<string, { start: string, end: string }>>({})
  const [customCodes, setCustomCodes] = useState<{ code: string; label: string; category: "mattina" | "pomeriggio" | "notte" | "riposo" }[]>([])
  const [newCustomCode, setNewCustomCode] = useState("")
  const [newCustomLabel, setNewCustomLabel] = useState("")
  const [newCustomCategory, setNewCustomCategory] = useState<"mattina" | "pomeriggio" | "notte" | "riposo">("mattina")

  // Modale riposo dinamico
  const [dynamicRestTarget, setDynamicRestTarget] = useState<string | null>(null)
  const [dynamicRestDay, setDynamicRestDay] = useState(1) // default Lunedì

  // Keep _allCodes in sync with custom codes
  const allCodes = [...SHIFT_CODES, ...customCodes]
  _allCodes = allCodes

  const loadData = async () => {
    setLoading(true)
    try {
      const [gRes, uRes] = await Promise.all([
        fetch("/api/admin/rotation-groups"),
        fetch("/api/admin/users")
      ])
      const gData = await gRes.json()
      const uData = await uRes.json()
      if (Array.isArray(gData)) setGroups(gData)
      if (uData.users) setAllUsers(uData.users)
    } catch {
      toast.error("Errore caricamento")
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // Utenti non ancora assegnati a nessun gruppo (filtra solo gli attivi)
  const assignedUserIds = new Set(groups.flatMap(g => (g.users || []).filter(u => u.isActive !== false).map(u => u.id)))
  const unassignedUsers = allUsers.filter(u => u.isActive !== false && !assignedUserIds.has(u.id))

  // --- CRUD Gruppi ---
  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const defaultPattern = Array(28).fill("M").map((_, i) => i % 2 === 0 ? "M" : "P")
      const res = await fetch("/api/admin/rotation-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          pattern: defaultPattern,
          startDate: new Date().toISOString()
        })
      })
      if (!res.ok) throw new Error()
      toast.success(`Turno "${newGroupName}" creato!`)
      setNewGroupName("")
      setShowCreate(false)
      loadData()
    } catch { toast.error("Errore creazione") }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm("Eliminare questo turno? Gli agenti verranno sganciati.")) return
    try {
      await fetch(`/api/admin/rotation-groups?id=${id}`, { method: "DELETE" })
      toast.success("Turno eliminato")
      loadData()
    } catch { toast.error("Errore eliminazione") }
  }

  const savePattern = async () => {
    if (!editingPatternId) return
    try {
      const res = await fetch("/api/admin/rotation-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPatternId,
          name: editName,
          pattern: {
            sequence: editPattern,
            shiftTimes: editShiftTimes,
            enabledCodes: enabledCodes,
            customCodes: customCodes
          },
          mStartTime: editMStart,
          mEndTime: editMEnd,
          pStartTime: editPStart,
          pEndTime: editPEnd,
          startDate: editStartDate
        })
      })
      if (!res.ok) throw new Error()
      toast.success("Sequenza e orari salvati!")
      setEditingPatternId(null)
      loadData()
    } catch { toast.error("Errore salvataggio: verifica i dati e i permessi") }
  }

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("userId", userId)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDropOnGroup = async (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (!userId) return
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rotationGroupId: groupId })
      })
      toast.success("Agente assegnato!")
      loadData()
    } catch { toast.error("Errore assegnazione") }
  }

  const handleDropOnUnassigned = async (e: React.DragEvent) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (!userId) return
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rotationGroupId: null })
      })
      toast.success("Agente rimosso dal turno")
      loadData()
    } catch { toast.error("Errore") }
  }

  const setRestDay = async (userId: string, day: number | null, dynamicStartDay?: number | null) => {
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fixedRestDay: day, dynamicRestStartDay: dynamicStartDay })
      })
      toast.success("Riposo impostato!")
      loadData()
    } catch { toast.error("Errore") }
  }

  const openDynamicRestModal = (userId: string, currentStartDay?: number | null) => {
    setDynamicRestTarget(userId)
    setDynamicRestDay(currentStartDay ?? 1) // default Lunedì
  }

  const confirmDynamicRest = async () => {
    if (!dynamicRestTarget) return
    await setRestDay(dynamicRestTarget, null, dynamicRestDay)
    setDynamicRestTarget(null)
  }

  const openPatternEditor = (group: RotationGroup) => {
    setEditingPatternId(group.id)
    let parsed: string[] = []
    let times: Record<string, { start: string, end: string }> = {}

    try {
      const data = JSON.parse(group.pattern)
      if (Array.isArray(data)) {
        parsed = data
      } else {
        parsed = data.sequence || []
        times = data.shiftTimes || {}
        
        // Load enabled and custom codes if they exist in the metadata
        if (data.enabledCodes) {
          setEnabledCodes(data.enabledCodes)
        }
        if (data.customCodes) {
          setCustomCodes(data.customCodes)
        }
      }

      // Seed default times for known codes if not present
      parsed.forEach(c => {
        if (!times[c] && DEFAULT_SPECIFIC_TIMES[c]) {
          times[c] = DEFAULT_SPECIFIC_TIMES[c]
        }
      })

      setEditPattern(parsed)
      setEditShiftTimes(times)
    } catch {
      parsed = Array(28).fill("M7")
      setEditPattern(parsed)
      setEditShiftTimes({})
    }
    setEditMStart(group.mStartTime || "07:00")
    setEditMEnd(group.mEndTime || "13:00")
    setEditPStart(group.pStartTime || "13:00")
    setEditPEnd(group.pEndTime || "19:00")
    setEditStartDate(group.startDate ? new Date(group.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    setEditName(group.name)
    // Auto-detect enabled codes and custom codes from existing pattern
    const usedCodes = new Set(parsed)
    const newCustoms: { code: string; label: string; category: "mattina" | "pomeriggio" | "notte" | "riposo" }[] = []

    usedCodes.forEach(code => {
      const isKnown = SHIFT_CODES.some(sc => sc.code === code)
      const isAlreadyCustom = customCodes.some(cc => cc.code === code)
      if (!isKnown && !isAlreadyCustom) {
        // Guess category from prefix
        let cat: "mattina" | "pomeriggio" | "notte" | "riposo" = "mattina"
        if (code.startsWith("P")) cat = "pomeriggio"
        else if (code.startsWith("N")) cat = "notte"
        else if (code === "RP" || code === "RR") cat = "riposo"

        newCustoms.push({ code, label: code, category: cat })
      }
    })

    if (newCustoms.length > 0) {
      setCustomCodes(prev => [...prev, ...newCustoms])
    }

    const autoEnabled = new Set([...DEFAULT_ENABLED_CODES, ...usedCodes])
    setEnabledCodes(Array.from(autoEnabled))
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative animate-in fade-in duration-700">
      {/* Page Header Premium */}
      <div className="bg-slate-900 text-white p-8 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-2xl z-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none"></div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users width={28} height={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Gestione <span className="text-blue-400">Squadre</span></h1>
            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mt-1">Sentinel Personnel Rotation System</p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 mt-6 sm:mt-0">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus size={18} /> Nuovo Turno
          </button>
          <Link href="/" className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/10 transition-all active:scale-95">
            <ChevronLeft size={18} /> Dashboard
          </Link>
        </div>
      </div>

      {/* Creazione rapida nuovo gruppo Premium */}
      {showCreate && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-6 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
          <div className="relative flex-1 max-w-md">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={18} />
            <input
              type="text" placeholder="Identificativo Turno (es. ALPHA / BRAVO)"
              value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-emerald-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
              onKeyDown={e => e.key === "Enter" && createGroup()}
            />
          </div>
          <button onClick={createGroup} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95">Inizializza</button>
          <button onClick={() => setShowCreate(false)} className="w-12 h-12 flex items-center justify-center bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all"><X size={20} /></button>
        </div>
      )}

      {/* Body: 2 colonne Premium */}
      <div className="flex-1 flex overflow-hidden p-6 gap-8 bg-slate-50">

        {/* Colonna Sinistra: Personale in Attesa */}
        <div
          className="w-[320px] min-w-[320px] flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-left duration-700"
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDrop={handleDropOnUnassigned}
        >
          <div className="bg-slate-900 text-white px-8 py-6 font-black flex items-center justify-between shrink-0 text-[10px] uppercase tracking-[0.2em]">
            <div className="flex items-center gap-3">
              <User size={16} className="text-blue-400" />
              <span>Pool Agenti Liberi</span>
            </div>
            <span className="bg-blue-600 px-2 py-0.5 rounded-lg">{unassignedUsers.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-slate-50/30">
            {unassignedUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Check className="text-slate-300" /></div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">Tutto il personale è stato assegnato alle unità operative.</p>
              </div>
            )}
            {unassignedUsers.map(u => (
              <div
                key={u.id}
                draggable
                onDragStart={e => handleDragStart(e, u.id)}
                className="group flex items-center gap-4 px-6 py-4 bg-white hover:bg-blue-50 border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:border-blue-200"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight block">{u.name}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">In Attesa</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 bg-blue-50 border-t border-blue-100">
            <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest leading-relaxed text-center">
              Trascina un agente su una squadra per assegnarlo alla rotazione.
            </p>
          </div>
        </div>

        {/* Colonna Destra: Hub delle Unità Operative */}
        <div className="flex-1 overflow-y-auto px-2 space-y-8 custom-scrollbar">
          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-[3rem] flex items-center justify-center mb-6 text-slate-200">
                <Users size={48} />
              </div>
              <p className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Nessuna unità rilevata</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2">Crea il primo turno per iniziare la distribuzione del personale.</p>
            </div>
          )}

          {groups.map(group => {
            let data: any = []
            try { data = JSON.parse(group.pattern) } catch { }
            const parsedPattern = Array.isArray(data) ? data : (data.sequence || [])

            return (
              <div
                key={group.id}
                className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden group/card hover:shadow-2xl hover:border-blue-200 transition-all duration-500 animate-in slide-in-from-right duration-700"
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDrop={e => handleDropOnGroup(e, group.id)}
              >
                {/* Header Unità Premium */}
                <div className="bg-slate-900 text-white p-6 px-10 flex items-center justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                      <span className="text-xl font-black text-blue-400">{group.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">{group.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-500/20">{group.users.length} Agenti Operativi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                    <button
                      onClick={() => openPatternEditor(group)}
                      className="px-5 py-2.5 bg-white/5 hover:bg-blue-600 text-white/70 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 transition-all active:scale-95"
                    >
                      <Edit3 size={14} /> Configurazione
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="w-10 h-10 bg-white/5 hover:bg-rose-600 text-rose-400 hover:text-white rounded-xl flex items-center justify-center border border-white/10 transition-all active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Engine Preview Premium */}
                <div className="bg-slate-50/50 border-b border-slate-100 px-10 py-5 flex items-center gap-3 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1.5 grayscale group-hover/card:grayscale-0 transition-all duration-500">
                    {parsedPattern.slice(0, 21).map((p: string, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{i + 1}</span>
                        <span
                          className={`w-8 h-8 flex items-center justify-center text-[8px] font-black rounded-lg shadow-sm border ${getCodeColor(p)}`}
                        >
                          {p}
                        </span>
                      </div>
                    ))}
                    {parsedPattern.length > 21 && (
                      <span className="text-[9px] font-black text-slate-400 ml-1">+{parsedPattern.length - 21}</span>
                    )}
                  </div>
                  <div className="w-px h-10 bg-slate-200 mx-4 shrink-0"></div>
                  <div className="flex gap-4 shrink-0">
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">Ciclo</p>
                      <p className="text-[11px] font-black text-slate-700">{Math.ceil(parsedPattern.length / 7)} Sett. / {parsedPattern.length}gg</p>
                    </div>
                  </div>
                </div>

                {/* Agenti Dashboard Inside Cards */}
                <div className="p-8 px-10">
                  {group.users.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Settore Vacante</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.users.map((u, i) => (
                      <div
                        key={u.id}
                        draggable
                        onDragStart={e => handleDragStart(e, u.id)}
                        className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:bg-slate-50 hover:shadow-xl hover:border-blue-200 transition-all group/agent cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover/agent:bg-blue-600 group-hover/agent:text-white transition-all shadow-inner">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{u.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rotazione Attiva</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <select
                              value={u.fixedRestDay ?? ""}
                              onChange={e => {
                                const val = e.target.value
                                if (val === "") {
                                  openDynamicRestModal(u.id, u.dynamicRestStartDay)
                                } else {
                                  setRestDay(u.id, parseInt(val), null)
                                }
                              }}
                              className="appearance-none pr-8 pl-4 py-2 bg-slate-100/50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest focus:bg-white focus:border-blue-500 transition-all outline-none"
                            >
                              <option value="">{u.dynamicRestStartDay != null ? `Riposo Dinamico (dal ${DAYS_OF_WEEK[u.dynamicRestStartDay]})` : "Riposo Dinamico"}</option>
                              {DAYS_OF_WEEK.map((d, idx) => (
                                <option key={idx} value={idx}>{d}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <Calendar size={12} />
                            </div>
                          </div>
                          <button className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-rose-500 transition-colors">
                            <GripVertical size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* --- MODAL EDITOR PATTERN PREMIUM --- */}
      {editingPatternId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
            {/* Modal Header Premium */}
            <div className="bg-slate-900 text-white p-8 px-10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Calendar width={24} height={24} />
                </div>
                <div className="flex-1 max-w-xl">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mb-1">Motore di Pianificazione</p>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xl font-black text-white outline-none focus:border-blue-500 transition-all uppercase tracking-tight"
                    placeholder="Nome Unità"
                  />
                </div>
              </div>
              <button onClick={() => setEditingPatternId(null)} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10">
              <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Activity size={14} /> Protocollo di Sequenza ({Math.ceil(editPattern.length / 7)} Settimane)
                  </p>
                  <p className="text-sm text-blue-900/60 font-medium leading-relaxed">
                    Definisci il ciclo operativo. Il sistema calcolerà automaticamente le rotazioni basandosi sulla data di ancoraggio.
                    Puoi aggiungere o rimuovere settimane per creare cicli più lunghi (es. 8 settimane per un riposo a scalare).
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => setEditPattern([...editPattern, ...Array(7).fill("M")])}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                  >
                    + Aggiungi Settimana
                  </button>
                  <button
                    onClick={() => {
                      if (editPattern.length > 7) setEditPattern(editPattern.slice(0, -7))
                    }}
                    disabled={editPattern.length <= 7}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    - Rimuovi Settimana
                  </button>
                </div>
              </div>

              {/* ORARI M e P e TURNI SPECIALI Premium Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3">Mattina Base (M)</p>
                  <div className="flex items-center gap-2">
                    <input type="time" value={editMStart} onChange={e => setEditMStart(e.target.value)} className="flex-1 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-blue-500" />
                    <span className="text-slate-300">→</span>
                    <input type="time" value={editMEnd} onChange={e => setEditMEnd(e.target.value)} className="flex-1 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3">Pomeriggio Base (P)</p>
                  <div className="flex items-center gap-2">
                    <input type="time" value={editPStart} onChange={e => setEditPStart(e.target.value)} className="flex-1 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500" />
                    <span className="text-slate-300">→</span>
                    <input type="time" value={editPEnd} onChange={e => setEditPEnd(e.target.value)} className="flex-1 px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500" />
                  </div>
                </div>

                {/* Turni Abilitati con orari personalizzabili */}
                {enabledCodes.filter(c => !["M", "P", "RP", "RR"].includes(c)).map(code => {
                  const info = allCodes.find(s => s.code === code)
                  const colorClass = info ? SHIFT_COLORS[info.category] : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  const times = editShiftTimes[code] || DEFAULT_SPECIFIC_TIMES[code] || { start: "07:00", end: "13:00" }

                  return (
                    <div key={code} className={`border rounded-[2rem] p-4 shadow-sm transition-all ${colorClass}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-3 flex justify-between">
                        <span>Turno {code}</span>
                        <span className="opacity-60 text-[8px] font-medium truncate ml-2">{info?.label}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={times.start}
                          onChange={e => {
                            setEditShiftTimes(prev => ({ ...prev, [code]: { ...times, start: e.target.value } }))
                          }}
                          className="flex-1 px-2 py-2 bg-white/50 border border-white/20 rounded-xl text-xs font-black outline-none focus:border-white"
                        />
                        <span className="opacity-30">→</span>
                        <input
                          type="time"
                          value={times.end}
                          onChange={e => {
                            setEditShiftTimes(prev => ({ ...prev, [code]: { ...times, end: e.target.value } }))
                          }}
                          className="flex-1 px-2 py-2 bg-white/50 border border-white/20 rounded-xl text-xs font-black outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  )
                })}

                <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3">Ancoraggio Giorno 1</p>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="w-full px-2 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-emerald-500" />
                </div>
              </div>

              {/* Pannello Selezione Codici Turno Abilitati */}
              <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Check size={14} /> Codici Turno Abilitati per questo Comando
                </p>
                <p className="text-xs text-slate-400 mb-4">Spunta i turni che il tuo comando utilizza. Solo i turni selezionati appariranno nel menù a tendina della griglia.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {allCodes.map(sc => {
                    const isEnabled = enabledCodes.includes(sc.code)
                    const catColors = SHIFT_COLORS[sc.category]
                    const isCustom = customCodes.some(c => c.code === sc.code)
                    return (
                      <label
                        key={sc.code}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all relative ${isEnabled
                            ? `${catColors} shadow-sm`
                            : "bg-slate-50 border-slate-100 text-slate-400"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => {
                            setEnabledCodes(prev =>
                              prev.includes(sc.code)
                                ? prev.filter(c => c !== sc.code)
                                : [...prev, sc.code]
                            )
                          }}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-black block">{sc.code}</span>
                          <span className="text-[9px] font-medium opacity-70 truncate block">{sc.label}</span>
                        </div>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setCustomCodes(prev => prev.filter(c => c.code !== sc.code))
                              setEnabledCodes(prev => prev.filter(c => c !== sc.code))
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center hover:bg-rose-600 shadow-md"
                            title="Rimuovi turno personalizzato"
                          >
                            ×
                          </button>
                        )}
                      </label>
                    )
                  })}
                </div>

                {/* Aggiungi Turno Personalizzato */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Plus size={14} /> Aggiungi Turno Personalizzato
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Codice</label>
                      <input
                        type="text"
                        placeholder="Es: M6, P17, N21"
                        value={newCustomCode}
                        onChange={e => setNewCustomCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                        className="px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none focus:border-emerald-400 w-32 bg-slate-50"
                        maxLength={8}
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Descrizione</label>
                      <input
                        type="text"
                        placeholder="Es: Mattina 06:00"
                        value={newCustomLabel}
                        onChange={e => setNewCustomLabel(e.target.value)}
                        className="px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 bg-slate-50"
                        maxLength={30}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Fascia</label>
                      <select
                        value={newCustomCategory}
                        onChange={e => setNewCustomCategory(e.target.value as "mattina" | "pomeriggio" | "notte" | "riposo")}
                        className="px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-emerald-400 bg-slate-50"
                      >
                        <option value="mattina">☀️ Mattina</option>
                        <option value="pomeriggio">🌤️ Pomeriggio</option>
                        <option value="notte">🌙 Notte</option>
                        <option value="riposo">🛑 Riposo</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (!newCustomCode.trim()) { toast.error('Inserisci un codice'); return }
                        if (allCodes.some(c => c.code === newCustomCode.trim())) { toast.error('Codice già esistente'); return }
                        const code = newCustomCode.trim()
                        const newCode = { code, label: newCustomLabel.trim() || code, category: newCustomCategory }
                        setCustomCodes(prev => [...prev, newCode])
                        setEnabledCodes(prev => [...prev, code])
                        
                        // Aggiungi subito agli orari con default basato sulla fascia
                        setEditShiftTimes(prev => ({
                          ...prev,
                          [code]: newCustomCategory === 'notte' 
                            ? { start: '22:00', end: '06:00' }
                            : newCustomCategory === 'pomeriggio'
                              ? { start: '14:00', end: '20:00' }
                              : { start: '07:00', end: '13:00' }
                        }))

                        setNewCustomCode('')
                        setNewCustomLabel('')
                        toast.success(`Turno ${code} aggiunto!`)
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                    >
                      + Aggiungi
                    </button>
                  </div>
                </div>
              </div>

              {/* Griglia Settimane Dinamiche Premium */}
              <div className="space-y-8">
                {Array.from({ length: Math.max(1, Math.ceil(editPattern.length / 7)) }).map((_, week) => (
                  <div key={week} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 relative group">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Week {String(week + 1).padStart(2, '0')}</span>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                      {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((dayLabel, dayIdx) => {
                        const idx = week * 7 + dayIdx
                        const val = editPattern[idx] || enabledCodes[0] || "M7"
                        return (
                          <div key={idx} className="flex flex-col gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest text-center ${dayIdx >= 5 ? 'text-rose-400' : 'text-slate-400'}`}>{dayLabel}</span>
                            <div className="relative">
                              <select
                                value={val}
                                onChange={e => {
                                  const next = [...editPattern]
                                  next[idx] = e.target.value
                                  setEditPattern(next)
                                }}
                                className={`w-full appearance-none p-4 text-center text-xs font-black rounded-2xl border outline-none transition-all cursor-pointer ${getCodeColor(val)}`}
                              >
                                {enabledCodes.map(code => {
                                  const info = allCodes.find(s => s.code === code)
                                  return <option key={code} value={code}>{code}{info ? ` (${info.label})` : ''}</option>
                                })}
                              </select>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 px-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
              <button onClick={() => setEditingPatternId(null)} className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Annulla Modifiche</button>
              <button onClick={() => savePattern()} className="px-12 py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-3">
                <Check size={18} /> Sincronizza Motore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE RIPOSO DINAMICO --- */}
      {dynamicRestTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[60] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-8 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Riposo Dinamico</h3>
              <p className="text-indigo-200 text-sm font-medium mt-2">
                Il riposo ruoterà ogni settimana: inizia il giorno scelto, la settimana successiva slitta al giorno dopo, e così via.
              </p>
            </div>

            <div className="p-8">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">
                Giorno di partenza
              </label>
              <div className="grid grid-cols-7 gap-2 mb-8">
                {DAYS_OF_WEEK.map((d, idx) => (
                  <button
                    key={idx}
                    onClick={() => setDynamicRestDay(idx)}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                      dynamicRestDay === idx
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                        : "bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50"
                    }`}
                  >
                    {d.substring(0, 3)}
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-8">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Anteprima rotazione</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 8 }).map((_, week) => {
                    const restDay = (dynamicRestDay + week) % 7
                    return (
                      <span key={week} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">
                        S{week + 1}: {DAYS_OF_WEEK[restDay].substring(0, 3)}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDynamicRestTarget(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs uppercase tracking-widest transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDynamicRest}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Conferma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
