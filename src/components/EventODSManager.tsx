"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2, Pencil, X, Check, Download, Star, Users, CalendarDays, GripVertical, Sun, Moon, Save, ArrowLeft, Car, MapPin, DownloadCloud, Link2 } from "lucide-react"

interface Agent { id: string; name: string; squadra: string | null; qualifica?: string }
interface Vehicle { id: string; name: string; targa?: string }
interface EventAssignment {
  id?: string; userId: string; serviceType: string; shiftPeriod: string; zone: string
  patrolGroupId?: string; vehicleId?: string
  timeRange: string; ordinaryHours: number; overtimeHours: number; projectHours: number
  user?: { id: string; name: string; squadra: string | null; qualifica?: string }
  vehicle?: { id: string; name: string; targa?: string } | null
}
interface SpecialEvent {
  id: string; name: string; description: string | null
  startDate: string; endDate: string; ordinanza: string | null; odsNotes: string | null
  assignments: EventAssignment[]
}

interface Props { tenantSlug: string; tenantName: string }

const SERVICE_TYPES = ["Pattuglia", "Viabilità", "Presidio Fisso", "Antinfortunistica", "Rappresentanza", "Polizia Giudiziaria", "Altro"]

export default function EventODSManager({ tenantSlug, tenantName }: Props) {
  const [events, setEvents] = useState<SpecialEvent[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [zones, setZones] = useState<string[]>(["Zona 1"])

  // Aggiorna le zone e le salva in localStorage per l'evento attivo
  const updateEventZones = (newZones: string[]) => {
    setZones(newZones)
    if (selectedEvent) {
      localStorage.setItem(`event_zones_${selectedEvent.id}`, JSON.stringify(newZones))
    }
  }

  // Carica le zone specifiche per l'evento selezionato
  useEffect(() => {
    if (!selectedEvent) return
    
    // 1. Estrai zone già assegnate
    const activeAssignmentsZones = selectedEvent.assignments
      .map(a => a.zone)
      .filter(Boolean) as string[]
      
    // 2. Carica zone salvate da localStorage
    let savedZones: string[] = []
    try {
      const stored = localStorage.getItem(`event_zones_${selectedEvent.id}`)
      if (stored) savedZones = JSON.parse(stored)
    } catch {}
    
    // 3. Unisci e rimuovi duplicati
    const merged = Array.from(new Set([...activeAssignmentsZones, ...savedZones]))
    
    // 4. Default se vuoto
    if (merged.length === 0) {
      merged.push("Zona 1")
    }
    
    setZones(merged)
  }, [selectedEvent?.id])

  // Create/Edit event modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", description: "", startDate: "", endDate: "", ordinanza: "", odsNotes: "" })

  // Edit assignment modal
  const [editingAssignment, setEditingAssignment] = useState<{ userId: string; shiftPeriod: string } | null>(null)
  const [editForm, setEditForm] = useState({ serviceType: "Pattuglia", zone: "", timeRange: "", ordinaryHours: 6, overtimeHours: 0, projectHours: 0, vehicleId: "" })

  // Patrol selection
  const [patrolSelection, setPatrolSelection] = useState<Set<string>>(new Set()) // selected userIds

  // Zone management
  const [showZoneInput, setShowZoneInput] = useState(false)
  const [newZoneName, setNewZoneName] = useState("")

  const fetchEvents = useCallback(async () => {
    try { const res = await fetch("/api/admin/events"); if (res.ok) setEvents(await res.json()) } catch {} finally { setLoading(false) }
  }, [])

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        const users = Array.isArray(data) ? data : (data.users || [])
        setAgents(users.map((u: any) => ({ id: u.id, name: u.name, squadra: u.squadra, qualifica: u.qualifica })))
      }
    } catch {}
  }, [])

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vehicles")
      if (res.ok) {
        const data = await res.json()
        setVehicles((Array.isArray(data) ? data : (data.vehicles || [])).map((v: any) => ({ id: v.id, name: v.name, targa: v.targa })))
      }
    } catch {}
  }, [])

  useEffect(() => { fetchEvents(); fetchAgents(); fetchVehicles() }, [fetchEvents, fetchAgents, fetchVehicles])

  // ─── Sync assignments to server ───
  const saveAssignments = async (eventId: string, assignments: EventAssignment[]) => {
    try {
      await fetch(`/api/admin/events/${eventId}/assignments`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: assignments.map(a => ({
          userId: a.userId, serviceType: a.serviceType, shiftPeriod: a.shiftPeriod,
          zone: a.zone, patrolGroupId: a.patrolGroupId, vehicleId: a.vehicleId || null,
          timeRange: a.timeRange, ordinaryHours: a.ordinaryHours, overtimeHours: a.overtimeHours, projectHours: a.projectHours
        })) })
      })
    } catch {}
  }

  // ─── Import from Planning ───
  const handleImportFromPlanning = async () => {
    if (!selectedEvent) return
    const start = new Date(selectedEvent.startDate)
    const end = new Date(selectedEvent.endDate)
    const dates: string[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0])
    }
    try {
      const importedAssignments: EventAssignment[] = []
      const seenAbsences = new Set<string>()
      for (const dateStr of dates) {
        const res = await fetch(`/api/admin/shifts/daily?date=${dateStr}`)
        if (!res.ok) continue
        const data = await res.json()
        const shifts = data.shifts || []
        const users = data.users || []
        const absences = data.absences || []
        // Track absent user IDs
        for (const a of absences) { if (a.userId) seenAbsences.add(a.userId) }
        for (const s of shifts) {
          if (!s.userId) continue
          // Classify shift period from type: "M7","M8","M9"→M, "P14","P15","P16"→P, "N22"→N
          const firstChar = (s.type || "").charAt(0).toUpperCase()
          const period = firstChar === "M" ? "M" : firstChar === "P" ? "P" : null
          if (!period) continue
          // Use timeRange from shift, or default
          const timeRange = s.timeRange || (period === "M" ? "07:00 - 13:00" : "14:00 - 20:00")
          const existing = importedAssignments.find(a => a.userId === s.userId && a.shiftPeriod === period)
          if (!existing) {
            importedAssignments.push({
              userId: s.userId,
              serviceType: s.serviceType?.name || s.serviceCategory?.name || "Pattuglia",
              shiftPeriod: period,
              zone: s.serviceCategory?.name || "",
              timeRange,
              ordinaryHours: 6, overtimeHours: 0, projectHours: 0,
              vehicleId: s.vehicleId || s.vehicle?.id || undefined
            })
          }
        }
        // Add unassigned agents (present in users but not in shifts with M/P)
        for (const u of users) {
          const alreadyAssigned = importedAssignments.some(a => a.userId === u.id)
          if (!alreadyAssigned && !seenAbsences.has(u.id)) {
            // Agent is available but not scheduled - add to both M and P as available
          }
        }
      }
      const updated = { ...selectedEvent, assignments: importedAssignments }
      setSelectedEvent(updated)
      await saveAssignments(selectedEvent.id, importedAssignments)
    } catch { alert("Errore importazione dalla pianificazione") }
  }

  // ─── Drag & Drop ───
  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("text/plain", userId)
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }

  const handleDropToBoard = async (e: React.DragEvent, shiftPeriod: string, zone?: string) => {
    e.preventDefault()
    if (!selectedEvent) return
    const userId = e.dataTransfer.getData("text/plain")
    if (!userId) return
    const existing = selectedEvent.assignments.find(a => a.userId === userId)
    const defaultTimeRange = shiftPeriod === "M" ? "07:00 - 13:00" : "14:00 - 20:00"
    const assignments = existing
      ? selectedEvent.assignments.map(a => a.userId === userId ? { ...a, shiftPeriod, zone: zone || a.zone, timeRange: a.timeRange || defaultTimeRange } : a)
      : [...selectedEvent.assignments, { userId, serviceType: "Pattuglia", shiftPeriod, zone: zone || "", timeRange: defaultTimeRange, ordinaryHours: 6, overtimeHours: 0, projectHours: 0 }]
    const updated = { ...selectedEvent, assignments }
    setSelectedEvent(updated)
    await saveAssignments(selectedEvent.id, assignments)
  }

  const handleRemoveFromBoard = async (userId: string) => {
    if (!selectedEvent) return
    const assignments = selectedEvent.assignments.filter(a => a.userId !== userId)
    setSelectedEvent({ ...selectedEvent, assignments })
    await saveAssignments(selectedEvent.id, assignments)
  }

  // ─── Patrol ───
  const handleCreatePatrol = async (shiftPeriod: string) => {
    if (!selectedEvent || patrolSelection.size < 2) return
    const patrolId = crypto.randomUUID()
    const assignments = selectedEvent.assignments.map(a => {
      if (patrolSelection.has(a.userId) && a.shiftPeriod === shiftPeriod) {
        return { ...a, patrolGroupId: patrolId }
      }
      return a
    })
    const updated = { ...selectedEvent, assignments }
    setSelectedEvent(updated)
    setPatrolSelection(new Set())
    await saveAssignments(selectedEvent.id, assignments)
  }

  const togglePatrolSelection = (userId: string) => {
    const next = new Set(patrolSelection)
    next.has(userId) ? next.delete(userId) : next.add(userId)
    setPatrolSelection(next)
  }

  // ─── Zone ───
  const addZone = (zoneName: string) => {
    const name = zoneName.trim()
    if (name && !zones.includes(name)) {
      updateEventZones([...zones, name])
    }
    setNewZoneName("")
    setShowZoneInput(false)
  }

  // ─── Edit Assignment ───
  const openEditAssignment = (a: EventAssignment) => {
    setEditingAssignment({ userId: a.userId, shiftPeriod: a.shiftPeriod })
    setEditForm({ serviceType: a.serviceType || "Pattuglia", zone: a.zone || "", timeRange: a.timeRange, ordinaryHours: a.ordinaryHours, overtimeHours: a.overtimeHours, projectHours: a.projectHours, vehicleId: a.vehicleId || "" })
  }

  const saveEditAssignment = async () => {
    if (!selectedEvent || !editingAssignment) return
    const assignments = selectedEvent.assignments.map(a =>
      a.userId === editingAssignment.userId && a.shiftPeriod === editingAssignment.shiftPeriod
        ? { ...a, ...editForm } : a
    )
    setSelectedEvent({ ...selectedEvent, assignments })
    setEditingAssignment(null)
    await saveAssignments(selectedEvent.id, assignments)
  }

  // ─── Event CRUD ───
  const handleSaveEvent = async () => {
    if (!form.name || !form.startDate || !form.endDate) return
    const body = { ...form, startDate: form.startDate, endDate: form.endDate }
    try {
      const url = editingId ? `/api/admin/events/${editingId}` : "/api/admin/events"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (res.ok) { setShowModal(false); setEditingId(null); setForm({ name: "", description: "", startDate: "", endDate: "", ordinanza: "", odsNotes: "" }); fetchEvents() }
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo evento?")) return
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" })
    if (selectedEvent?.id === id) setSelectedEvent(null)
    fetchEvents()
  }

  const openEdit = (ev: SpecialEvent) => {
    setEditingId(ev.id)
    setForm({ name: ev.name, description: ev.description || "", startDate: ev.startDate.split("T")[0], endDate: ev.endDate.split("T")[0], ordinanza: ev.ordinanza || "", odsNotes: ev.odsNotes || "" })
    setShowModal(true)
  }

  // ─── Helpers ───
  const getAssignedFor = (period: string) => selectedEvent?.assignments.filter(a => a.shiftPeriod === period) || []
  const getUnassignedAgents = () => {
    if (!selectedEvent) return []
    const assignedIds = new Set(selectedEvent.assignments.map(a => a.userId))
    return agents.filter(a => !assignedIds.has(a.id))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Star size={20} className="text-white" />
            </div>
            Eventi Speciali
          </h1>
          <p className="text-sm text-slate-400 mt-1">Crea evento, importa dalla pianificazione, assegna con drag & drop, genera ODS</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ name: "", description: "", startDate: "", endDate: "", ordinanza: "", odsNotes: "" }); setShowModal(true) }}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all">
          <Plus size={16} /> Nuovo Evento
        </button>
      </div>

      {/* Event selector */}
      {!selectedEvent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map(ev => (
            <div key={ev.id} onClick={() => setSelectedEvent(ev)} className="cursor-pointer bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-amber-500/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center"><Star size={14} className="text-white" /></div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase">{ev.name}</h3>
                    {ev.ordinanza && <p className="text-[9px] text-amber-400/60 font-bold uppercase">Ord. {ev.ordinanza}</p>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(ev)} className="p-2 bg-white/10 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl"><Pencil size={12} /></button>
                  <button onClick={() => handleDelete(ev.id)} className="p-2 bg-white/10 hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl"><Trash2 size={12} /></button>
                </div>
              </div>
              {ev.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{ev.description}</p>}
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <CalendarDays size={10} />
                <span>{new Date(ev.startDate).toLocaleDateString("it-IT")} — {new Date(ev.endDate).toLocaleDateString("it-IT")}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase"><Users size={12} /> {ev.assignments.length} Agenti</span>
                <button onClick={e => { e.stopPropagation(); window.open(`/api/admin/events/${ev.id}/ods`, "_blank") }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-blue-600 border border-white/10 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all">
                  <Download size={10} /> ODS PDF
                </button>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 rounded-3xl">
              <CalendarDays size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-400 font-bold text-sm">Nessun evento speciale</p>
              <p className="text-slate-600 text-xs mt-1">Crea un evento per assegnare il personale con drag & drop</p>
            </div>
          )}
        </div>
      ) : (
        /* ─── DRAG & DROP BOARD ─── */
        <div className="space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedEvent(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white"><ArrowLeft size={18} /></button>
              <div>
                <h2 className="text-lg font-black text-white">{selectedEvent.name}</h2>
                <p className="text-xs text-slate-400">
                  {new Date(selectedEvent.startDate).toLocaleDateString("it-IT")} — {new Date(selectedEvent.endDate).toLocaleDateString("it-IT")}
                  {selectedEvent.ordinanza && ` | Ord. ${selectedEvent.ordinanza}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleImportFromPlanning}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl text-xs font-bold transition-all">
                <DownloadCloud size={14} /> Importa da Pianificazione
              </button>
              <button onClick={() => { openEdit(selectedEvent); setSelectedEvent(null) }}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-blue-600 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all">
                <Pencil size={14} /> Modifica
              </button>
              <button onClick={() => window.open(`/api/admin/events/${selectedEvent.id}/ods`, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all">
                <Download size={14} /> ODS PDF
              </button>
            </div>
          </div>

          {/* Zone management */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zone:</span>
            {zones.map(z => (
              <span key={z} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 animate-in fade-in">
                <MapPin size={10} className="text-amber-400" /> {z}
                <button onClick={() => updateEventZones(zones.filter(zz => zz !== z))} className="text-slate-600 hover:text-rose-400 transition-all"><X size={10} /></button>
              </span>
            ))}
            
            {showZoneInput ? (
              <div className="relative z-20 flex flex-col bg-[#0f172a] border border-white/10 rounded-xl p-3 space-y-2 w-64 shadow-xl animate-in zoom-in-95">
                <div className="flex items-center gap-1">
                  <input 
                    value={newZoneName} 
                    onChange={e => setNewZoneName(e.target.value)} 
                    onKeyDown={e => e.key === "Enter" && addZone(newZoneName)}
                    placeholder="Nome zona..." 
                    className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-amber-500/50" 
                    autoFocus 
                  />
                  <button onClick={() => addZone(newZoneName)} className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all"><Check size={12} /></button>
                  <button onClick={() => setShowZoneInput(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><X size={12} /></button>
                </div>
                
                {/* Suggerimenti storici (Database delle zone) */}
                {(() => {
                  const suggestions = Array.from(new Set(
                    events.flatMap(ev => ev.assignments.map(a => a.zone).filter(Boolean) as string[])
                  ))
                  .filter(z => !zones.includes(z))
                  .filter(z => z.toLowerCase().includes(newZoneName.toLowerCase()))
                  .slice(0, 5);
                  
                  if (suggestions.length === 0) return null;
                  
                  return (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Zone suggerite / storiche</p>
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                        {suggestions.map(s => (
                          <button 
                            key={s} 
                            onClick={() => addZone(s)}
                            className="text-left px-2 py-1 hover:bg-white/5 rounded text-[10px] text-slate-300 hover:text-amber-400 font-bold transition-all truncate flex items-center gap-1"
                          >
                            <MapPin size={8} className="text-amber-500/50" /> {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <button onClick={() => setShowZoneInput(true)}
                className="px-3 py-1.5 bg-white/5 hover:bg-amber-500/20 border border-dashed border-white/10 hover:border-amber-500/30 rounded-lg text-[10px] font-bold text-slate-500 hover:text-amber-400 transition-all">
                + Nuova Zona
              </button>
            )}
          </div>

          {/* Patrol bar */}
          {patrolSelection.size >= 2 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
              <Link2 size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{patrolSelection.size} agenti selezionati</span>
              <button onClick={() => { handleCreatePatrol("M"); handleCreatePatrol("P") }}
                className="ml-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase">Crea Pattuglia</button>
              <button onClick={() => setPatrolSelection(new Set())} className="px-2 py-1.5 text-slate-500 hover:text-white"><X size={12} /></button>
            </div>
          )}

          {/* Main layout: Sidebar + Boards */}
          <div className="flex gap-4">
            {/* SIDEBAR: Agenti disponibili */}
            <div className="w-56 shrink-0">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 min-h-[400px]" onDragOver={handleDragOver}
                onDrop={async e => { const userId = e.dataTransfer.getData("text/plain"); if (userId) await handleRemoveFromBoard(userId) }}>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <GripVertical size={12} /> Disponibili ({getUnassignedAgents().length})
                </h3>
                <div className="space-y-1 max-h-[480px] overflow-y-auto">
                  {getUnassignedAgents().map(agent => (
                    <div key={agent.id} draggable onDragStart={e => handleDragStart(e, agent.id)}
                      className="flex items-center gap-2 px-2.5 py-2 bg-white/5 hover:bg-amber-500/20 border border-white/5 hover:border-amber-500/30 rounded-lg cursor-grab active:cursor-grabbing text-[11px] font-bold text-white">
                      <GripVertical size={10} className="text-slate-600 shrink-0" />
                      <span className="truncate">{agent.name}</span>
                      {agent.squadra && <span className="text-[8px] text-slate-500 ml-auto shrink-0">{agent.squadra}</span>}
                    </div>
                  ))}
                  {getUnassignedAgents().length === 0 && <p className="text-[10px] text-slate-600 text-center py-4">Tutti assegnati</p>}
                </div>
              </div>
            </div>

            {/* BOARDS: Mattina + Pomeriggio */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              {[{ period: "M", label: "Mattina", Icon: Sun, timeDefault: "07:00 - 13:00", color: "amber" },
                { period: "P", label: "Pomeriggio", Icon: Moon, timeDefault: "14:00 - 20:00", color: "blue" },
              ].map(board => {
                const assigned = getAssignedFor(board.period)
                const Icon = board.Icon
                return (
                  <div key={board.period}>
                    <div className={`flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r ${board.period === "M" ? "from-amber-500/10 to-yellow-500/5" : "from-blue-500/10 to-indigo-500/5"} rounded-xl border border-white/5`}>
                      <Icon size={16} className="text-white" />
                      <h3 className="text-sm font-black text-white uppercase">{board.label}</h3>
                      <span className="text-[10px] text-slate-400 ml-auto">{board.timeDefault}</span>
                    </div>

                    {/* Zone groups */}
                    {zones.map(zone => {
                      const zoneAssigned = assigned.filter(a => a.zone === zone)
                      return (
                        <div key={zone} className="mb-3">
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <MapPin size={10} className="text-amber-400" />
                            <span className="text-[9px] font-black text-amber-400/80 uppercase tracking-wider">{zone}</span>
                            {zoneAssigned.length > 0 && <span className="text-[8px] text-slate-500">({zoneAssigned.length})</span>}
                          </div>
                          <div className="bg-white/5 border border-dashed border-white/10 hover:border-amber-500/30 rounded-xl p-2 min-h-[40px]"
                            onDragOver={handleDragOver}
                            onDrop={e => handleDropToBoard(e, board.period, zone)}>
                            {zoneAssigned.map(a => {
                              const agent = agents.find(ag => ag.id === a.userId)
                              const vehicle = a.vehicleId ? vehicles.find(v => v.id === a.vehicleId) : null
                              const selected = patrolSelection.has(a.userId)
                              return (
                                <div key={a.id || (a.userId + a.shiftPeriod + (a.zone || ''))}
                                  draggable
                                  onDragStart={e => handleDragStart(e, a.userId)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all mb-1.5 group cursor-grab active:cursor-grabbing ${a.patrolGroupId ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'} hover:border-amber-500/30 ${selected ? 'ring-1 ring-amber-500/50 bg-amber-500/10' : ''}`}>
                                  <input type="checkbox" checked={selected}
                                    onChange={() => togglePatrolSelection(a.userId)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-3 h-3 rounded accent-amber-500" />
                                  <GripVertical size={12} className="text-slate-600 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white truncate">{agent?.name || a.userId}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap text-[8px] text-slate-400">
                                      {a.serviceType && <span className="text-amber-400">{a.serviceType}</span>}
                                      {a.timeRange && <span>{a.timeRange}</span>}
                                      {vehicle && <span className="flex items-center gap-0.5"><Car size={8} />{vehicle.name}</span>}
                                      {a.patrolGroupId && <span className="text-blue-400 flex items-center gap-0.5"><Link2 size={8} /> Pattuglia</span>}
                                    </div>
                                  </div>
                                  <button onClick={() => openEditAssignment(a)} className="p-1.5 bg-white/10 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Pencil size={11} /></button>
                                  <button onClick={() => handleRemoveFromBoard(a.userId)} className="p-1.5 bg-white/10 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                                </div>
                              )
                            })}
                            {zoneAssigned.length === 0 && <p className="text-[8px] text-slate-600 text-center py-2">Trascina qui</p>}
                          </div>
                        </div>
                      )
                    })}

                    {/* Unzoned assignments */}
                    {(() => {
                      const unzoned = assigned.filter(a => !a.zone)
                      if (unzoned.length === 0 && zones.length > 0) return null
                      return (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Senza Zona</span>
                          </div>
                          <div className="bg-white/5 border border-dashed border-white/10 hover:border-amber-500/30 rounded-xl p-2 min-h-[40px]"
                            onDragOver={handleDragOver}
                            onDrop={e => handleDropToBoard(e, board.period)}>
                            {unzoned.map(a => {
                              const agent = agents.find(ag => ag.id === a.userId)
                              const vehicle = a.vehicleId ? vehicles.find(v => v.id === a.vehicleId) : null
                              const selected = patrolSelection.has(a.userId)
                              return (
                                <div key={a.id || (a.userId + a.shiftPeriod + (a.zone || ''))}
                                  draggable
                                  onDragStart={e => handleDragStart(e, a.userId)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all mb-1.5 group cursor-grab active:cursor-grabbing ${a.patrolGroupId ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/10'} hover:border-amber-500/30 ${selected ? 'ring-1 ring-amber-500/50 bg-amber-500/10' : ''}`}>
                                  <input type="checkbox" checked={selected}
                                    onChange={() => togglePatrolSelection(a.userId)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-3 h-3 rounded accent-amber-500" />
                                  <GripVertical size={12} className="text-slate-600 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white truncate">{agent?.name || a.userId}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap text-[8px] text-slate-400">
                                      {a.serviceType && <span className="text-amber-400">{a.serviceType}</span>}
                                      {a.timeRange && <span>{a.timeRange}</span>}
                                      {vehicle && <span className="flex items-center gap-0.5"><Car size={8} />{vehicle.name}</span>}
                                      {a.patrolGroupId && <span className="text-blue-400 flex items-center gap-0.5"><Link2 size={8} /> Pattuglia</span>}
                                    </div>
                                  </div>
                                  <button onClick={() => openEditAssignment(a)} className="p-1.5 bg-white/10 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Pencil size={11} /></button>
                                  <button onClick={() => handleRemoveFromBoard(a.userId)} className="p-1.5 bg-white/10 hover:bg-rose-600 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"><X size={11} /></button>
                                </div>
                              )
                            })}
                            {unzoned.length === 0 && assigned.length === 0 && <p className="text-[8px] text-slate-600 text-center py-2">Trascina qui gli agenti</p>}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>

          {selectedEvent.odsNotes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest mb-1">Note ODS</p>
              <p className="text-xs text-slate-300">{selectedEvent.odsNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{editingId ? "Modifica Evento" : "Nuovo Evento Speciale"}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nome Evento *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="es. Concerto in Piazza" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Data Inizio *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50" /></div>
                <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Data Fine *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50" /></div>
              </div>
              <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Ordinanza / Rif.</label>
                <input value={form.ordinanza} onChange={e => setForm({ ...form, ordinanza: e.target.value })} placeholder="es. Ord. n. 123/2026" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50" /></div>
              <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Descrizione</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none" /></div>
              <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Note ODS (stampate nel PDF)</label>
                <textarea value={form.odsNotes} onChange={e => setForm({ ...form, odsNotes: e.target.value })} rows={2} placeholder="Disposizioni specifiche..." className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none" /></div>
            </div>
            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-2xl text-xs font-black uppercase tracking-widest">Annulla</button>
              <button onClick={handleSaveEvent} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg"><Check size={14} /> {editingId ? "Aggiorna" : "Crea Evento"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingAssignment(null)}>
          <div className="bg-[#0a0f1a] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">Modifica Assegnazione</h2>
              <button onClick={() => setEditingAssignment(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tipo Servizio</label>
                <select value={editForm.serviceType} onChange={e => setEditForm({ ...editForm, serviceType: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50">
                  {SERVICE_TYPES.map(t => <option className="text-slate-900 bg-white" key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Zona</label>
                <select value={editForm.zone} onChange={e => setEditForm({ ...editForm, zone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50">
                  <option className="text-slate-900 bg-white" value="">— Nessuna zona —</option>
                  {zones.map(z => <option className="text-slate-900 bg-white" key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Veicolo</label>
                <select value={editForm.vehicleId} onChange={e => setEditForm({ ...editForm, vehicleId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50">
                  <option className="text-slate-900 bg-white" value="">— Nessun veicolo —</option>
                  {vehicles.map(v => <option className="text-slate-900 bg-white" key={v.id} value={v.id}>{v.name}{v.targa ? ` (${v.targa})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Fascia Oraria</label>
                <input value={editForm.timeRange} onChange={e => setEditForm({ ...editForm, timeRange: e.target.value })} placeholder="07:00 - 13:00"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500/50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest mb-1 block">Ordinarie</label>
                  <input type="number" step="0.5" value={editForm.ordinaryHours} onChange={e => setEditForm({ ...editForm, ordinaryHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold text-center" /></div>
                <div><label className="text-[8px] font-black text-amber-400/60 uppercase tracking-widest mb-1 block">Straord.</label>
                  <input type="number" step="0.5" value={editForm.overtimeHours} onChange={e => setEditForm({ ...editForm, overtimeHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold text-center" /></div>
                <div><label className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest mb-1 block">Progetto</label>
                  <input type="number" step="0.5" value={editForm.projectHours} onChange={e => setEditForm({ ...editForm, projectHours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold text-center" /></div>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setEditingAssignment(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-xl text-xs font-bold">Annulla</button>
              <button onClick={saveEditAssignment} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"><Save size={14} /> Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

