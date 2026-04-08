"use client"

import { useState } from "react"
import { Save, Loader2, Edit2, X } from "lucide-react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface Props {
  agent: {
    id: string
    name: string
    rotationGroupId: string | null
    squadra: string | null
    defaultServiceCategoryId: string | null
    defaultServiceTypeId: string | null
    servizio: string | null
    rotationGroup: any
    defaultServiceCategory: any
  }
  rotationGroups: any[]
  categories: any[]
}

export default function OperativeAssignmentEditor({ agent, rotationGroups, categories }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form states
  const [groupId, setGroupId] = useState(agent.rotationGroupId || "")
  const [catId, setCatId] = useState(agent.defaultServiceCategoryId || "")
  const [typeId, setTypeId] = useState(agent.defaultServiceTypeId || "")
  const [servizio, setServizio] = useState(agent.servizio || "")

  // Automatically adjust selected type if category changes
  const handleCatChange = (newCatId: string) => {
    setCatId(newCatId)
    setTypeId("") // Reset type when category changes
    const targetCat = categories.find(c => c.id === newCatId)
    if (targetCat) {
      setServizio(targetCat.name)
    } else {
      setServizio("")
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // Endpoint that already exists for saving profile details could be used, or the specific ones:
      // We have /api/admin/users/assign-group (for RotationGroup)
      // And /api/admin/users/assign-service-default (for category/type)

      // We can do two parallel requests, or better, we can just make one custom request to update all.
      // Wait, let's just create a unified API call or use the existing ones.
      
      const res1 = await fetch("/api/admin/users/assign-group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agent.id, groupId: groupId || null })
      })

      const res2 = await fetch("/api/admin/users/assign-service-default", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: agent.id, 
          serviceCategoryId: catId || null, 
          serviceTypeId: typeId || null, 
          servizioLabel: servizio 
        })
      })

      if (!res1.ok || !res2.ok) throw new Error("Errore durante il salvataggio")

      toast.success("Assegnazione aggiornata con successo")
      setIsEditing(false)
      router.refresh()
    } catch {
      toast.error("Errore di connessione")
    }
    setLoading(false)
  }

  if (isEditing) {
    return (
      <div className="premium-card p-6 flex flex-col md:flex-row gap-6 mt-4 md:mt-0 shadow-2xl shadow-indigo-500/10 ring-2 ring-indigo-500/20 relative min-w-[320px] animate-fade-up">
        <div className="flex-1 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-[0.1em] mb-2 font-sans">Turnazione / Squadra</label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className="w-full text-sm border-2 border-slate-100 bg-slate-50 rounded-xl py-2 px-4 focus:border-indigo-500 focus:bg-white outline-none text-slate-800 font-bold transition-all"
            >
              <option value="">Nessuna Squadra Fissa</option>
              {rotationGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-4">
             <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-[0.1em] mb-2 font-sans">Sezione OdS e Note</label>
             <div className="grid grid-cols-1 gap-2">
                <select
                  value={catId}
                  onChange={e => handleCatChange(e.target.value)}
                  className="w-full text-sm border-2 border-slate-100 bg-slate-50 rounded-xl py-2 px-4 focus:border-indigo-500 focus:bg-white outline-none text-slate-800 font-bold transition-all"
                >
                  <option value="">Nessuna Sezione Default</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                {catId && (
                  <select
                    value={typeId}
                    onChange={e => setTypeId(e.target.value)}
                    className="w-full text-xs border border-slate-200 bg-white rounded-xl py-2 px-4 focus:border-indigo-500 outline-none text-slate-700 font-bold transition-all"
                  >
                    <option value="">Incarico Generico (Nessun Default)</option>
                    {categories.find(c => c.id === catId)?.types.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}

                <input 
                  type="text" 
                  value={servizio} 
                  onChange={e => setServizio(e.target.value)} 
                  placeholder="Dicitura testuale personalizzata..."
                  className="w-full text-xs border border-slate-200 bg-white rounded-xl py-2 px-4 focus:border-indigo-500 outline-none text-slate-700 transition-all"
                />
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 justify-center border-l border-slate-100 pl-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            SALVA
          </button>
          <button
            onClick={() => setIsEditing(false)}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            <X size={16} />
            ANNULLA
          </button>
        </div>
      </div>
    )
  }

  // View Mode
  return (
    <div className="bg-white/60 backdrop-blur-sm border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-6 mt-4 md:mt-0 group hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
      <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Motore Ciclico (Squadra)
          </p>
          <p className="text-[13px] font-black text-slate-800 font-sans tracking-tight">{agent.rotationGroup?.name || agent.squadra || "Non Assegnata"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
             Sezione OdS di Default
          </p>
          <p className="text-[13px] font-black text-slate-800 font-sans tracking-tight">
            {agent.defaultServiceCategory?.name || agent.servizio || "Nessuna Sezione Base"} 
          </p>
        </div>
      </div>
      <button 
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-2 px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest ring-1 ring-indigo-100 group-hover:shadow-md"
        title="Modifica Assegnazione Operativa"
      >
        <Edit2 size={14} />
        MODIFICA
      </button>
    </div>
  )
}
