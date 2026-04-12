"use client"

import { useState, useEffect, useCallback } from "react"
import { Trash2, Plus, Loader2, Car, Layers, X } from "lucide-react"

type ServiceType = { id: string; name: string; categoryId: string }
type ServiceCategory = { id: string; name: string; types: ServiceType[] }
type Vehicle = { id: string; name: string }

export default function ServicesSettings() {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  const [newCatName, setNewCatName] = useState("")
  const [newTypeName, setNewTypeName] = useState("")
  const [selectedCatForType, setSelectedCatForType] = useState("")
  const [newVehicleName, setNewVehicleName] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [resCat, resVeh] = await Promise.all([
        fetch("/api/admin/services"),
        fetch("/api/admin/vehicles")
      ])
      const dataCat = await resCat.json()
      const dataVeh = await resVeh.json()
      if (dataCat.categories) setCategories(dataCat.categories)
      if (dataVeh.vehicles) setVehicles(dataVeh.vehicles)
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadData(), 0);
    return () => clearTimeout(t);
  }, [loadData])

  const addCategory = async () => {
    if (!newCatName) return
    await fetch("/api/admin/services", {
      method: "POST", body: JSON.stringify({ action: "createCategory", name: newCatName })
    })
    setNewCatName("")
    loadData()
  }

  const addType = async () => {
    if (!newTypeName || !selectedCatForType) return
    await fetch("/api/admin/services", {
      method: "POST", body: JSON.stringify({ action: "createType", name: newTypeName, categoryId: selectedCatForType })
    })
    setNewTypeName("")
    setSelectedCatForType("")
    loadData()
  }

  const deleteItem = async (type: string, id: string) => {
    if (type === "category" || type === "serviceType") {
      await fetch(`/api/admin/services?type=${type}&id=${id}`, { method: "DELETE" })
    } else {
      await fetch(`/api/admin/vehicles?id=${id}`, { method: "DELETE" })
    }
    loadData()
  }

  const addVehicle = async () => {
    if (!newVehicleName) return
    await fetch("/api/admin/vehicles", {
      method: "POST", body: JSON.stringify({ name: newVehicleName })
    })
    setNewVehicleName("")
    loadData()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl">
      {/* Header Sezione Servizi */}
      <div className="relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600 rounded-full"></div>
        <h3 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Layers size={24}/>
          </div>
          Servizi Operativi
        </h3>
        <p className="text-sm text-slate-500 font-medium ml-12">Configura le Macro-Categorie e i Tipi di Servizio (es. Viabilità → Pattuglia Estramurale)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Macro-Categorie Card */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col h-full group transition-all hover:shadow-2xl hover:shadow-blue-100/50">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Macro-Categorie</h4>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-full">{categories.length} Totali</span>
          </div>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
              placeholder="Aggiungi categoria (es. Giudiziaria)" 
              className="flex-1 rounded-2xl border-slate-200 text-sm px-4 py-3 border-2 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium placeholder:text-slate-300"
            />
            <button 
              onClick={addCategory} 
              className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all"
              title="Aggiungi Categoria"
            >
              <Plus size={20}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar" style={{ maxHeight: '300px' }}>
            <ul className="space-y-3">
              {categories.map(c => (
                <li key={c.id} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-sm font-black text-slate-800 group/item hover:bg-white hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    {c.name}
                  </div>
                  <button 
                    onClick={() => deleteItem("category", c.id)} 
                    className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                </li>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Nessuna categoria</p>
                </div>
              )}
            </ul>
          </div>
        </div>

        {/* Tipi di Servizio Card */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col h-full group transition-all hover:shadow-2xl hover:shadow-indigo-100/50">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">Tipi di Servizio</h4>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-full">
              {categories.reduce((acc, c) => acc + c.types.length, 0)} Specialità
            </span>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <select 
              value={selectedCatForType} 
              onChange={e => setSelectedCatForType(e.target.value)} 
              className="rounded-2xl border-slate-200 border-2 text-sm px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-black text-slate-700 cursor-pointer appearance-none bg-slate-50"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="">-- Seleziona Categoria --</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newTypeName} 
                onChange={e => setNewTypeName(e.target.value)} 
                placeholder="Es. Piantone Principale" 
                className="flex-1 rounded-2xl border-slate-200 text-sm px-4 py-3 border-2 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-300"
              />
              <button 
                onClick={addType} 
                className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                title="Aggiungi Specialità"
              >
                <Plus size={20}/>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar" style={{ maxHeight: '300px' }}>
            <ul className="space-y-3">
              {categories.flatMap(c => c.types.map(t => (
                <li key={t.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-sm group/item hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800">{t.name}</span>
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{c.name}</span>
                  </div>
                  <button 
                    onClick={() => deleteItem("serviceType", t.id)} 
                    className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                </li>
              )))}
              {categories.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Nessun servizio definito</p>
                </div>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Parco Veicoli Section */}
      <div className="pt-10 border-t-2 border-slate-100">
        <div className="relative mb-6">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-emerald-500 rounded-full"></div>
          <h3 className="text-2xl font-black text-slate-900 mb-1 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Car size={24}/>
            </div>
            Parco Veicoli
          </h3>
          <p className="text-sm text-slate-500 font-medium ml-12">Aggiungi i mezzi a disposizione per il servizio</p>
        </div>
        
        <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
          <div className="flex flex-wrap gap-2 mb-8 max-w-sm">
            <input 
              type="text" 
              value={newVehicleName} 
              onChange={e => setNewVehicleName(e.target.value)} 
              placeholder="Es. Beta 101 Renault" 
              className="flex-1 rounded-2xl border-slate-200 text-sm px-4 py-3 border-2 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium shadow-sm bg-white"
            />
            <button 
              onClick={addVehicle} 
              className="bg-emerald-600 text-white p-3 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all"
            >
              <Plus size={20}/>
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {vehicles.map(v => (
              <div 
                key={v.id} 
                className="group inline-flex items-center gap-3 bg-white text-slate-800 text-sm font-black px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all"
              >
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                  <Car size={16}/>
                </div>
                {v.name}
                <button 
                  onClick={() => deleteItem("vehicle", v.id)} 
                  className="text-slate-300 hover:text-red-500 ml-1 p-1 hover:bg-red-50 rounded-lg transition-all"
                >
                  <X size={16}/>
                </button>
              </div>
            ))}
            {vehicles.length === 0 && (
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest py-4">Nessun veicolo registrato</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
