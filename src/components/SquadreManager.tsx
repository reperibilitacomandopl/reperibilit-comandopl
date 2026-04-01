"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, Edit3, ChevronLeft, User, Users, Calendar, GripVertical, X, Check } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

const DAYS_OF_WEEK = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]

interface RotationGroup {
  id: string
  name: string
  pattern: string // JSON string
  mStartTime: string
  mEndTime: string
  pStartTime: string
  pEndTime: string
  startDate: string
  users: { id: string; name: string; fixedRestDay: number | null }[]
}

export default function SquadreManager() {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<RotationGroup[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])

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

  const loadData = async () => {
    setLoading(true)
    try {
      const [gRes, uRes] = await Promise.all([
        fetch("/api/admin/rotation-groups"),
        fetch("/api/admin/shifts/monthly?year=2026&month=1") // Solo per avere la lista users
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

  // Utenti non ancora assegnati a nessun gruppo
  const assignedUserIds = new Set(groups.flatMap(g => g.users.map(u => u.id)))
  const unassignedUsers = allUsers.filter(u => !assignedUserIds.has(u.id))

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

  const savePattern = async (groupId: string) => {
    try {
      const group = groups.find(g => g.id === groupId)
      await fetch("/api/admin/rotation-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: groupId, 
          name: group?.name, 
          pattern: editPattern,
          mStartTime: editMStart,
          mEndTime: editMEnd,
          pStartTime: editPStart,
          pEndTime: editPEnd,
          startDate: new Date(editStartDate).toISOString()
        })
      })
      toast.success("Sequenza e orari salvati!")
      setEditingPatternId(null)
      loadData()
    } catch { toast.error("Errore salvataggio") }
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

  const setRestDay = async (userId: string, day: number | null) => {
    try {
      await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fixedRestDay: day })
      })
      toast.success("Riposo impostato!")
      loadData()
    } catch { toast.error("Errore") }
  }

  const openPatternEditor = (group: RotationGroup) => {
    setEditingPatternId(group.id)
    try {
      setEditPattern(JSON.parse(group.pattern))
    } catch {
      setEditPattern(Array(28).fill("M").map((_, i) => i % 2 === 0 ? "M" : "P"))
    }
    setEditMStart(group.mStartTime || "07:00")
    setEditMEnd(group.mEndTime || "13:00")
    setEditPStart(group.pStartTime || "13:00")
    setEditPEnd(group.pEndTime || "19:00")
    setEditStartDate(group.startDate ? new Date(group.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-[#1e293b] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <Users className="text-blue-400" />
          <h2 className="text-xl font-bold uppercase tracking-wide">Gestione Squadre e Turni</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Plus size={16} /> Nuovo Turno
          </button>
          <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600">
            <ChevronLeft size={16} /> Dashboard
          </Link>
        </div>
      </div>

      {/* Creazione rapida nuovo gruppo */}
      {showCreate && (
        <div className="bg-green-50 border-b border-green-200 p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
          <input
            type="text" placeholder="Nome del turno (es. Turno A)"
            value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
            className="flex-1 max-w-xs p-2 border border-green-300 rounded-lg text-sm font-semibold outline-none"
            onKeyDown={e => e.key === "Enter" && createGroup()}
          />
          <button onClick={createGroup} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">Crea</button>
          <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-800"><X size={20} /></button>
        </div>
      )}

      {/* Body: 2 colonne */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">

        {/* Colonna Sinistra: Agenti Liberi */}
        <div
          className="w-[250px] min-w-[220px] flex flex-col bg-white border-2 border-slate-200 shadow-sm overflow-hidden"
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDrop={handleDropOnUnassigned}
        >
          <div className="bg-[#2a4365] text-white p-2 font-bold flex items-center gap-2 shrink-0 text-sm">
            <User size={16} /> Personale Libero ({unassignedUsers.length})
          </div>
          <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
            {unassignedUsers.length === 0 && (
              <div className="text-xs text-slate-400 p-3 italic text-center">Tutti gli agenti sono stati assegnati a un turno.</div>
            )}
            {unassignedUsers.map(u => (
              <div
                key={u.id}
                draggable
                onDragStart={e => handleDragStart(e, u.id)}
                className="flex items-center gap-2 px-2 py-1.5 bg-white hover:bg-blue-50 border-b border-slate-100 cursor-grab active:cursor-grabbing transition-colors"
              >
                <GripVertical size={14} className="text-slate-300" />
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                <span className="text-xs font-bold text-slate-800 uppercase">{u.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonna Destra: Le Box dei Turni */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Users size={48} className="mb-4" />
              <p className="text-lg font-bold">Nessun turno configurato</p>
              <p className="text-sm">Clicca "Nuovo Turno" per creare il primo gruppo di rotazione.</p>
            </div>
          )}

          {groups.map(group => {
            let parsedPattern: string[] = []
            try { parsedPattern = JSON.parse(group.pattern) } catch {}

            return (
              <div
                key={group.id}
                className="bg-white border-2 border-slate-300 shadow-md overflow-hidden"
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDrop={e => handleDropOnGroup(e, group.id)}
              >
                {/* Header del Turno */}
                <div className="bg-[#1e293b] text-white p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold uppercase tracking-wider">{group.name}</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">{group.users.length} agenti</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openPatternEditor(group)}
                      className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold flex items-center gap-1"
                      title="Modifica sequenza turni"
                    >
                      <Edit3 size={14} /> Sequenza
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="p-1.5 bg-red-600 hover:bg-red-500 rounded"
                      title="Elimina turno"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Anteprima Pattern + Orari (Compatta) */}
                <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 overflow-x-auto">
                  <span className="text-[10px] font-bold text-slate-500 mr-1 shrink-0">PATTERN:</span>
                  {parsedPattern.slice(0, 14).map((p, i) => {
                    let displayCode = p
                    if (p === "M") {
                      const [h] = (group.mStartTime || "07:00").split(":")
                      const [,,m] = (group.mStartTime || "07:00").split(":") // Just for checking
                      const min = parseInt((group.mStartTime || "07:00").split(":")[1])
                      displayCode = min === 0 ? `M${parseInt(h)}` : `M${parseInt(h)},${min}`
                    } else if (p === "P") {
                      const [h] = (group.pStartTime || "13:00").split(":")
                      const min = parseInt((group.pStartTime || "13:00").split(":")[1])
                      displayCode = min === 0 ? `P${parseInt(h)}` : `P${parseInt(h)},${min}`
                    }
                    return (
                      <span
                        key={i}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          p === "RP" ? "bg-red-100 text-red-700" :
                          p.startsWith("M") || displayCode.startsWith("M") ? "bg-blue-100 text-blue-700" :
                          p.startsWith("P") || displayCode.startsWith("P") ? "bg-purple-100 text-purple-700" :
                          "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {displayCode}
                      </span>
                    )
                  })}
                  {parsedPattern.length > 14 && <span className="text-[10px] text-slate-400">...+{parsedPattern.length - 14}</span>}
                  <span className="text-[10px] text-slate-300 mx-1">|</span>
                  <span className="text-[10px] font-bold text-blue-700 shrink-0">M {(group as any).mStartTime || "07:00"}-{(group as any).mEndTime || "13:00"}</span>
                  <span className="text-[10px] font-bold text-purple-700 shrink-0 ml-1">P {(group as any).pStartTime || "13:00"}-{(group as any).pEndTime || "19:00"}</span>
                </div>

                {/* Agenti dentro la squadra */}
                <div className="p-1">
                  {group.users.length === 0 && (
                    <div className="text-xs text-slate-400 italic p-3 text-center border-2 border-dashed border-slate-200 m-1 rounded">
                      Trascina qui gli agenti per assegnarli a "{group.name}"
                    </div>
                  )}
                  {group.users.map((u, i) => (
                    <div
                      key={u.id}
                      draggable
                      onDragStart={e => handleDragStart(e, u.id)}
                      className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-[#e0f2fe]' : 'bg-white'} border-b border-sky-100 cursor-grab active:cursor-grabbing group`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500" />
                        <User size={14} className="text-blue-600" />
                        <span className="text-xs font-bold text-slate-800 uppercase">{u.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={u.fixedRestDay ?? ""}
                          onChange={e => setRestDay(u.id, e.target.value === "" ? null : parseInt(e.target.value))}
                          className="text-[11px] py-1 px-1 bg-white border border-slate-300 rounded text-slate-700 shadow-sm font-semibold"
                        >
                          <option value="">Nessun Riposo Fisso</option>
                          {DAYS_OF_WEEK.map((d, idx) => (
                            <option key={idx} value={idx}>{d}</option>
                          ))}
                        </select>
                        <Calendar size={14} className="text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* --- MODAL EDITOR PATTERN --- */}
      {editingPatternId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1e293b] text-white p-4 flex justify-between items-center rounded-t-xl">
              <h3 className="text-lg font-bold">
                Editor Sequenza - {groups.find(g => g.id === editingPatternId)?.name}
              </h3>
              <button onClick={() => setEditingPatternId(null)} className="p-1 hover:bg-slate-700 rounded"><X size={20} /></button>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                Modifica la sequenza dei turni e gli orari. Inserisci il codice per ciascun giorno del ciclo (28 giorni = 4 settimane).
                Codici: <b className="text-blue-600">M</b> = Mattina, <b className="text-purple-600">P</b> = Pomeriggio, <b className="text-red-600">RP</b> = Riposo.
              </p>

              {/* ORARI M e P */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">MATTINA (M)</span>
                  <input type="time" value={editMStart} onChange={e => setEditMStart(e.target.value)} className="p-1.5 border-2 border-blue-300 rounded text-sm font-bold text-blue-800 outline-none" />
                  <span className="text-xs text-slate-500">→</span>
                  <input type="time" value={editMEnd} onChange={e => setEditMEnd(e.target.value)} className="p-1.5 border-2 border-blue-300 rounded text-sm font-bold text-blue-800 outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-1 rounded">POMERIGGIO (P)</span>
                  <input type="time" value={editPStart} onChange={e => setEditPStart(e.target.value)} className="p-1.5 border-2 border-purple-300 rounded text-sm font-bold text-purple-800 outline-none" />
                  <span className="text-xs text-slate-500">→</span>
                  <input type="time" value={editPEnd} onChange={e => setEditPEnd(e.target.value)} className="p-1.5 border-2 border-purple-300 rounded text-sm font-bold text-purple-800 outline-none" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-1 rounded">DATA ANCORA (Giorno 1)</span>
                  <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="p-1.5 border-2 border-slate-300 rounded text-sm font-bold text-slate-800 outline-none" />
                  <span className="text-[10px] text-slate-500 italic max-w-[200px]">Data in cui inizia il Giorno 1 della sequenza (28 giorni).</span>
                </div>
              </div>

              {/* Griglia 4 settimane da 7 giorni ciascuna */}
              {[0, 1, 2, 3].map(week => (
                <div key={week} className="mb-4">
                  <div className="text-xs font-bold text-slate-500 mb-1 uppercase">Settimana {week + 1}</div>
                  <div className="grid grid-cols-7 gap-1">
                    {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((dayLabel, dayIdx) => {
                      const idx = week * 7 + dayIdx
                      const val = editPattern[idx] || ""
                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <span className={`text-[10px] font-bold mb-0.5 ${dayIdx >= 5 ? 'text-red-500' : 'text-slate-500'}`}>{dayLabel}</span>
                          <select
                            value={val}
                            onChange={e => {
                              const next = [...editPattern]
                              next[idx] = e.target.value
                              setEditPattern(next)
                            }}
                            className={`w-full p-2 text-center text-sm font-bold rounded border outline-none ${
                              val === "RP" ? "bg-red-50 border-red-300 text-red-700" :
                              val.startsWith("M") ? "bg-blue-50 border-blue-300 text-blue-700" :
                              val.startsWith("P") ? "bg-purple-50 border-purple-300 text-purple-700" :
                              "bg-slate-50 border-slate-300 text-slate-600"
                            }`}
                          >
                            <option value="M">M (Mattina)</option>
                            <option value="P">P (Pomeriggio)</option>
                            <option value="RP">RP (Riposo)</option>
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200">
                <button onClick={() => setEditingPatternId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Annulla</button>
                <button onClick={() => savePattern(editingPatternId)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center gap-2">
                  <Check size={16} /> Salva Sequenza
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
