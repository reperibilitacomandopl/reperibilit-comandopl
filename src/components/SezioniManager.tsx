"use client"

import { useState, useEffect } from "react"
import { Loader2, User, Users, ChevronLeft, GripVertical, Settings2 } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

export default function SezioniManager() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/sezioni-config")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCategories(data.categories || [])
      setUsers(data.users || [])
    } catch {
      toast.error("Errore caricamento dati")
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // Utenti non assegnati (Personale a disposizione)
  const unassignedUsers = users.filter((u) => !u.defaultServiceCategoryId)

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    e.dataTransfer.setData("userId", userId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const assignService = async (userId: string, categoryId: string | null, typeId: string | null, label: string | null) => {
    try {
      await fetch("/api/admin/users/assign-service-default", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, serviceCategoryId: categoryId, serviceTypeId: typeId, servizioLabel: label }),
      })
      toast.success("Sezione aggiornata!")
      loadData()
    } catch {
      toast.error("Errore durante l'assegnazione")
    }
  }

  const handleDropOnUnassigned = (e: React.DragEvent) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      assignService(userId, null, null, null)
    }
  }

  const handleDropOnCategory = (e: React.DragEvent, cat: any) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      assignService(userId, cat.id, null, cat.name)
    }
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
      <div className="bg-[#0b1120] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <Settings2 className="text-emerald-400" />
          <h2 className="text-xl font-bold uppercase tracking-wide">Gestione Sezioni / Servizi (OdS)</h2>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600 text-slate-200">
            <ChevronLeft size={16} /> Dashboard
          </Link>
        </div>
      </div>
      
      {/* Notice */}
      <div className="bg-blue-50 border-b border-blue-200 p-3 text-sm text-blue-800 font-medium">
        Questa schermata gestisce il <b>Servizio di Default</b> dell'agente. Queste informazioni verranno utilizzate per compilare automaticamente la colonna corretta quando si clicca "Auto-Genera" nel tabellone OdS giornaliero.
      </div>

      {/* Body: 2 colonne */}
      <div className="flex-1 flex overflow-hidden p-2 gap-2">
        {/* Colonna Sinistra: Personale a disposizione */}
        <div
          className="w-[280px] min-w-[250px] flex flex-col bg-white border-2 border-slate-200 shadow-sm overflow-hidden"
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDrop={handleDropOnUnassigned}
        >
          <div className="bg-slate-700 text-white p-2 font-bold flex items-center gap-2 shrink-0 text-sm">
            <Users size={16} /> A Disposizione ({unassignedUsers.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {unassignedUsers.length === 0 && (
              <div className="text-xs text-slate-400 p-4 italic text-center text-balance border-2 border-dashed border-slate-200 m-1 rounded-xl">Tutti gli agenti sono stati assegnati ad una macro-sezione.</div>
            )}
            {unassignedUsers.map((u) => (
              <div
                key={u.id}
                draggable
                onDragStart={(e) => handleDragStart(e, u.id)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing transition-colors mb-2"
              >
                <GripVertical size={14} className="text-slate-400" />
                {u.isUfficiale && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-black border border-blue-200 self-start mt-0.5">UFF</span>}
                <span className="text-xs font-bold text-slate-800 uppercase">{u.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonna Destra: Le Sezioni (Categorie OdS) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          {categories.map((cat) => {
            const assignedUsers = users.filter((u) => u.defaultServiceCategoryId === cat.id)

            return (
              <div
                key={cat.id}
                className="bg-white border-2 border-slate-300 shadow-sm overflow-hidden rounded-xl group/cat"
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDrop={(e) => handleDropOnCategory(e, cat)}
              >
                {/* Header Sezione */}
                <div className="bg-emerald-700 text-white p-2 flex items-center justify-between border-b-2 border-emerald-800/50">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-black uppercase tracking-wider pl-2">{cat.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-black/20 text-emerald-100 px-2 py-0.5 rounded">
                    {assignedUsers.length} Agenti
                  </span>
                </div>

                {/* Grid Agenti in questa sezione */}
                <div className="p-2 gap-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-h-[60px]">
                  {assignedUsers.length === 0 && (
                    <div className="col-span-full text-xs text-slate-400 italic p-3 text-center border-2 border-dashed border-slate-200 rounded-lg">
                      Trascina qui gli agenti per assegnarli a {cat.name}
                    </div>
                  )}
                  {assignedUsers.map((u) => (
                    <div
                      key={u.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, u.id)}
                      className="flex flex-col bg-slate-50 border border-emerald-100 hover:border-emerald-300 rounded-lg p-2 cursor-grab active:cursor-grabbing hover:bg-emerald-50/50 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical size={14} className="text-slate-300" />
                        <User size={14} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 uppercase line-clamp-1">{u.name}</span>
                      </div>
                      
                      {/* Select Sotto-Incarico (ServiceType) se la categoria ne ha */}
                      {cat.types && cat.types.length > 0 && (
                        <div className="pl-6 w-full relative">
                          <select
                            title="Seleziona la specifica funzione"
                            className="w-full text-[10px] py-1 px-2 pr-4 bg-white border border-slate-300 rounded-md text-slate-700 shadow-inner font-semibold outline-none focus:border-emerald-500 appearance-none"
                            value={u.defaultServiceTypeId || ""}
                            onChange={(e) => assignService(u.id, cat.id, e.target.value || null, cat.name)}
                          >
                            <option value="">Nessun Incarico (Generico)</option>
                            {cat.types.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
