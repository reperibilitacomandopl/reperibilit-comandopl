"use client"

import { useState, useEffect } from "react"
import { Shield, Plus, Trash2, Loader2, Users } from "lucide-react"
import toast from "react-hot-toast"

export default function PatrolSettingsPanel() {
  const [patrols, setPatrols] = useState<any[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [name, setName] = useState("")
  const [selectedAgent1, setSelectedAgent1] = useState("")
  const [selectedAgent2, setSelectedAgent2] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedType, setSelectedType] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [preferredShift, setPreferredShift] = useState("ALL")

  const loadData = async () => {
    setLoading(true)
    try {
      const [resPatrols, resUsers, resCats, resVehicles] = await Promise.all([
        fetch("/api/admin/patrols"),
        fetch("/api/admin/users"),
        fetch("/api/admin/services"),
        fetch("/api/admin/vehicles")
      ])
      const dataPatrols = await resPatrols.json()
      const dataUsers = await resUsers.json()
      const dataCats = await resCats.json()
      const dataVehicles = await resVehicles.json()

      if (dataPatrols.patrols) setPatrols(dataPatrols.patrols)
      if (dataUsers.users) setAgents(dataUsers.users)
      if (dataCats.categories) setCategories(dataCats.categories)
      if (dataVehicles.vehicles) setVehicles(dataVehicles.vehicles)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const addPatrol = async () => {
    if (!name || !selectedAgent1 || !selectedAgent2) return toast.error("Nome e almeno 2 agenti obbligatori")
    if (selectedAgent1 === selectedAgent2) return toast.error("Seleziona agenti diversi")

    const memberIds = [selectedAgent1, selectedAgent2]
    
    await fetch("/api/admin/patrols", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        serviceCategoryId: selectedCategory,
        serviceTypeId: selectedType,
        vehicleId: selectedVehicle,
        preferredShift,
        memberIds
      })
    })

    toast.success("Pattuglia creata!")
    setName(""); setSelectedAgent1(""); setSelectedAgent2(""); setSelectedCategory(""); setSelectedType(""); setSelectedVehicle(""); setPreferredShift("ALL")
    loadData()
  }

  const deletePatrol = async (id: string) => {
    await fetch(`/api/admin/patrols?id=${id}`, { method: "DELETE" })
    toast.success("Pattuglia eliminata")
    loadData()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>

  return (
    <div className="space-y-10 animate-in fade-in max-w-5xl">
      <div className="relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-indigo-600 rounded-full"></div>
        <h3 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Shield size={24}/>
          </div>
          Pattuglie Fisse (Modelli)
        </h3>
        <p className="text-sm text-slate-500 font-medium ml-12">Associa operatori fissi per generare automaticamente l'OdS quando lavorano insieme</p>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="col-span-full lg:col-span-2">
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide mb-2">Nome Pattuglia</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Viabilità Centro 1" className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 font-bold outline-none"/>
          </div>
          
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide mb-2">Agente 1</label>
            <select value={selectedAgent1} onChange={e => setSelectedAgent1(e.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 font-bold outline-none bg-white">
              <option value="">-- Seleziona --</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide mb-2">Agente 2</label>
            <select value={selectedAgent2} onChange={e => setSelectedAgent2(e.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 font-bold outline-none bg-white">
              <option value="">-- Seleziona --</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide mb-2">Servizio Predefinito</label>
            <div className="flex gap-2">
              <select value={selectedCategory} onChange={e => {setSelectedCategory(e.target.value); setSelectedType("")}} className="flex-1 rounded-2xl border-2 border-slate-200 px-3 py-3 text-xs focus:border-indigo-500 font-bold outline-none bg-white">
                <option value="">Nessuno</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {selectedCategory && (
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="flex-1 rounded-2xl border-2 border-slate-200 px-3 py-3 text-xs focus:border-indigo-500 font-bold text-indigo-700 outline-none bg-white">
                  <option value="">Generico</option>
                  {categories.find(c => c.id === selectedCategory)?.types.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide mb-2">Veicolo Fisso</label>
            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 font-bold outline-none bg-white">
              <option value="">Nessuno</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wide mb-2">Turno Preferito</label>
            <select value={preferredShift} onChange={e => setPreferredShift(e.target.value)} className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 font-bold outline-none bg-white">
              <option value="ALL">Qualsiasi Turno</option>
              <option value="M">Mattina (es. M7, M8)</option>
              <option value="P">Pomeriggio (es. P14)</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button onClick={addPatrol} className="bg-indigo-600 text-white px-6 py-3 border border-indigo-700 rounded-2xl flex items-center gap-2 font-black text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95">
            <Plus size={18} /> Crea Modello Pattuglia
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patrols.map(p => (
          <div key={p.id} className="bg-white border rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all border-slate-200 group flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
            
            <div className="flex justify-between items-start mt-2 border-b border-slate-100 pb-4 mb-4">
              <h4 className="font-black text-slate-800 text-base leading-tight pr-6">{p.name}</h4>
              <button onClick={() => deletePatrol(p.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 shrink-0">
                <Trash2 size={16}/>
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-400" />
                <div className="flex flex-col">
                  {p.members.map((m:any) => (
                    <span key={m.id} className="text-xs font-bold text-slate-700">{m.name} <span className="text-[10px] text-slate-400 font-mono ml-1">({m.matricola})</span></span>
                  ))}
                </div>
              </div>

              {p.serviceCategory && (
                <div className="mt-3">
                  <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg inline-block">
                    Servizio: {p.serviceCategory.name} {p.serviceType ? ` > ${p.serviceType.name}` : ""}
                  </span>
                </div>
              )}

              {p.vehicle && (
                <div className="mt-2">
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg inline-block">
                    Auto: {p.vehicle.name}
                  </span>
                </div>
              )}
              
              <div className="mt-2 text-[10px] font-bold text-slate-500">
                Periodo: {p.preferredShift === 'ALL' ? 'Sempre' : p.preferredShift === 'M' ? 'Mattina' : 'Pomeriggio'}
              </div>
            </div>
          </div>
        ))}
        {patrols.length === 0 && (
          <div className="col-span-full py-10 flex flex-col items-center justify-center text-center opacity-50">
            <Shield size={48} className="text-slate-300 mb-3" />
            <p className="font-bold text-slate-500 text-lg">Nessuna pattuglia fissa configurata</p>
            <p className="text-sm text-slate-400 max-w-sm mt-1">Crea dei modelli qui sopra per velocizzare la generazione dell'Ordine di Servizio automatico.</p>
          </div>
        )}
      </div>
    </div>
  )
}
