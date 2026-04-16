"use client"

import { useState, useEffect } from "react"
import { Loader2, User, Users, ChevronLeft, GripVertical, Settings2, Check, X, Info } from "lucide-react"
import toast from "react-hot-toast"
import Link from "next/link"

interface SyncPreview {
  userId: string;
  userName: string;
  excelLabel: string;
  matchedCategoryId: string;
  matchedCategoryName: string;
  currentCategoryId?: string;
}

export default function SezioniManager() {
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<{ id: string; name: string; types?: { id: string; name: string }[] }[]>([])
  const [users, setUsers] = useState<{ id: string; name: string; isUfficiale?: boolean; servizio?: string; defaultServiceCategoryId?: string; defaultServiceTypeId?: string }[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncPreview, setSyncPreview] = useState<SyncPreview[] | null>(null)
  
  // STATO SELEZIONE MULTIPLA
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkMoving, setIsBulkMoving] = useState(false)

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
    setSelectedIds([]) // Reset selezione al caricamento
  }

  const toggleSelection = (userId: string) => {
    setSelectedIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const clearSelection = () => setSelectedIds([])

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

  const bulkAssign = async (categoryId: string | null, label: string | null) => {
    if (selectedIds.length === 0) return
    setIsBulkMoving(true)
    try {
      const matchedCat = categories.find(c => c.id === categoryId)
      const res = await fetch("/api/admin/users/bulk-assign-default-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignments: selectedIds.map(id => ({
            userId: id,
            categoryId: categoryId,
            label: label,
            typeId: matchedCat?.types?.[0]?.id || null
          }))
        }),
      })

      if (res.ok) {
        toast.success(`${selectedIds.length} agenti spostati con successo!`)
        setSelectedIds([])
        loadData()
      } else throw new Error()
    } catch {
      toast.error("Errore durante lo spostamento di gruppo")
    } finally {
      setIsBulkMoving(false)
    }
  }

  const handleDropOnCategory = (e: React.DragEvent, cat: { id: string; name: string }) => {
    e.preventDefault()
    const userId = e.dataTransfer.getData("userId")
    if (userId) {
      assignService(userId, cat.id, null, cat.name)
    }
  }

  const handleAutoSync = () => {
    const preview: SyncPreview[] = []
    
    const superClean = (s: string) => s.toUpperCase()
      .replace(/['’]/g, "")
      .replace(/\s+/g, " ")
      .replace("POLIZIA ", "")
      .replace("PRONTO ", "")
      .trim();

    for (const u of users) {
      if (!u.servizio) continue
      
      const sClean = superClean(u.servizio)
      const matched = categories.find(c => {
        const cClean = superClean(c.name)
        return sClean.includes(cClean) || cClean.includes(sClean)
      })

      if (matched && matched.id !== u.defaultServiceCategoryId) {
        preview.push({
          userId: u.id,
          userName: u.name,
          excelLabel: u.servizio,
          matchedCategoryId: matched.id,
          matchedCategoryName: matched.name,
          currentCategoryId: u.defaultServiceCategoryId
        })
      }
    }

    if (preview.length === 0) {
      toast.error("Nessun nuovo abbinamento trovato rispetto a quelli esistenti.")
      return
    }

    setSyncPreview(preview)
  }

  const confirmBulkSync = async () => {
    if (!syncPreview) return
    setIsSyncing(true)
    try {
      const res = await fetch("/api/admin/users/bulk-assign-default-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          assignments: syncPreview.map(p => ({
            userId: p.userId,
            categoryId: p.matchedCategoryId,
            label: p.matchedCategoryName,
            typeId: categories.find(c => c.id === p.matchedCategoryId)?.types?.[0]?.id || null
          }))
        }),
      })

      if (res.ok) {
        toast.success(`Sincronizzazione completata: ${syncPreview.length} agenti aggiornati!`)
        setSyncPreview(null)
        loadData()
      } else throw new Error()
    } catch {
      toast.error("Errore durante il salvataggio massivo")
    } finally {
      setIsSyncing(false)
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
          <button 
            onClick={handleAutoSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-black flex items-center gap-2 border border-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} 
            Sincronizza da Excel
          </button>
          <Link href="/" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 border border-slate-600 text-slate-200">
            <ChevronLeft size={16} /> Dashboard
          </Link>
        </div>
      </div>
      
      {/* Notice */}
      <div className="bg-blue-50 border-b border-blue-200 p-3 text-sm text-blue-800 font-medium">
        Questa schermata gestisce il <b>Servizio di Default</b> dell&apos;agente. Queste informazioni verranno utilizzate per compilare automaticamente la colonna corretta quando si clicca &quot;Auto-Genera&quot; nel tabellone OdS giornaliero.
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
            {unassignedUsers.map((u) => {
              const isSelected = selectedIds.includes(u.id)
              return (
                <div
                  key={u.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, u.id)}
                  onClick={() => toggleSelection(u.id)}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all mb-2 relative group select-none
                    ${isSelected ? "bg-blue-600 border-blue-400 text-white shadow-md scale-[1.02]" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"}`}
                >
                  <GripVertical size={14} className={isSelected ? "text-blue-300" : "text-slate-400"} />
                  {u.isUfficiale && <span className={`text-[9px] px-1 py-0.5 rounded font-black border self-start mt-0.5 ${isSelected ? "bg-white text-blue-700 border-white" : "bg-blue-100 text-blue-700 border-blue-200"}`}>UFF</span>}
                  <div className="flex flex-col flex-1">
                    <span className="text-xs font-bold uppercase leading-tight">{u.name}</span>
                    {u.servizio && (
                      <span className={`text-[9px] font-black uppercase tracking-tighter opacity-80 ${isSelected ? "text-blue-200" : "text-amber-600"}`}>
                        Excel: {u.servizio}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={14} className="text-white shrink-0" />}
                </div>
              )
            })}
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
                  {assignedUsers.map((u) => {
                    const isSelected = selectedIds.includes(u.id)
                    return (
                      <div
                        key={u.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, u.id)}
                        onClick={() => toggleSelection(u.id)}
                        className={`flex flex-col border rounded-lg p-2 cursor-pointer transition-all shadow-sm relative group select-none
                          ${isSelected ? "bg-blue-600 border-blue-400 text-white shadow-lg scale-[1.02]" : "bg-slate-50 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50"}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical size={14} className={isSelected ? "text-blue-300" : "text-slate-300"} />
                          <User size={14} className={isSelected ? "text-blue-200" : "text-emerald-600"} />
                          <div className="flex flex-col flex-1">
                            <span className="text-xs font-bold uppercase line-clamp-1 leading-tight">{u.name}</span>
                            {u.servizio && (
                              <span className={`text-[9px] font-bold uppercase tracking-tighter line-clamp-1 ${isSelected ? "text-blue-200" : "text-slate-400"}`}>
                                {u.servizio}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check size={14} className="text-white shrink-0" />}
                        </div>
                        
                        {/* Select Sotto-Incarico (ServiceType) se la categoria ne ha */}
                        {cat.types && cat.types.length > 0 && (
                          <div className="pl-6 w-full relative" onClick={(e) => e.stopPropagation()}>
                            <select
                              title="Seleziona la specifica funzione"
                              className={`w-full text-[10px] py-1 px-2 pr-4 border rounded-md shadow-inner font-semibold outline-none appearance-none
                                ${isSelected ? "bg-blue-700 border-blue-500 text-white" : "bg-white border-slate-300 text-slate-700 focus:border-emerald-500"}`}
                              value={u.defaultServiceTypeId || ""}
                              onChange={(e) => assignService(u.id, cat.id, e.target.value || null, cat.name)}
                            >
                              <option value="">{isSelected ? "Incarico..." : "Nessun Incarico (Generico)"}</option>
                              {cat.types.map((t: { id: string; name: string }) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BARRA DELLE AZIONI MASSIVE (FLOAT) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-3 px-6 shadow-2xl flex items-center gap-6">
            <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30">
                {selectedIds.length}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-xs font-black uppercase tracking-tighter">Selezionati</span>
                <button onClick={clearSelection} className="text-blue-400 text-[10px] font-bold uppercase tracking-widest hover:text-blue-300 text-left">Annulla</button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sposta in:</span>
              <div className="flex gap-2">
                {/* Sposta a Disposizione */}
                <button 
                  onClick={() => bulkAssign(null, null)}
                  disabled={isBulkMoving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-tight border border-slate-700 active:scale-95 transition-all flex items-center gap-2"
                >
                  <X size={12} /> A Disposizione
                </button>

                {/* Sposta in Categoria */}
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => bulkAssign(cat.id, cat.name)}
                    disabled={isBulkMoving}
                    className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-tight border border-emerald-500/30 transition-all active:scale-95 whitespace-nowrap"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {isBulkMoving && (
              <div className="pl-4 flex items-center gap-2 text-blue-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[10px] font-bold uppercase animate-pulse">Salvataggio...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE DI ANTEPRIMA SINCRONIZZAZIONE */}
      {syncPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            {/* Header Modale */}
            <div className="bg-emerald-600 p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Check size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Verifica Sincronizzazione</h3>
                  <p className="text-emerald-100 text-sm font-medium">Controlla gli abbinamenti trovati prima di salvare</p>
                </div>
              </div>
              <button onClick={() => setSyncPreview(null)} className="p-3 hover:bg-black/20 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content Modale */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex gap-3 text-amber-800 text-sm italic">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>Abbiamo trovato <b>{syncPreview.length}</b> corrispondenze tra l&apos;Excel e le sezioni del portale. Gli agenti verranno spostati nelle sezioni indicate qui sotto.</p>
              </div>

              <div className="space-y-3">
                {syncPreview.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-300 transition-all group">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.userName}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Excel: {p.excelLabel}</span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-end">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Destinazione</span>
                         <span className="px-4 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-xl uppercase border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                           {p.matchedCategoryName}
                         </span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modale */}
            <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
               <button 
                  onClick={() => setSyncPreview(null)}
                  className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase text-sm tracking-widest"
               >
                 Annulla
               </button>
               <button 
                  disabled={isSyncing}
                  onClick={confirmBulkSync}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-tighter"
               >
                 {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                 {isSyncing ? "Salvataggio..." : "Conferma e Salva Tutto"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
