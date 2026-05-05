"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, X, Layers, Car, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface QuickServiceManagerProps {
  onClose: () => void
}

export default function QuickServiceManager({ onClose }: QuickServiceManagerProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newCatName, setNewCatName] = useState("")
  const [newTypeName, setNewTypeName] = useState("")
  const [selectedCatId, setSelectedCatId] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/services")
      const data = await res.json()
      if (data.categories) setCategories(data.categories)
    } catch { toast.error("Errore caricamento") }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const addCategory = async () => {
    if (!newCatName) return
    await fetch("/api/admin/services", {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createCategory", name: newCatName })
    })
    setNewCatName("")
    loadData()
  }

  const addType = async () => {
    if (!newTypeName || !selectedCatId) return
    await fetch("/api/admin/services", {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createType", name: newTypeName, categoryId: selectedCatId })
    })
    setNewTypeName("")
    loadData()
  }

  const deleteItem = async (type: "category" | "serviceType", id: string) => {
    await fetch(`/api/admin/services?type=${type}&id=${id}`, { method: "DELETE" })
    loadData()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <Layers size={20} />
              </div>
              Gestione Rapida Servizi
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Aggiungi o modifica macro-servizi e specialità al volo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Macro Categorie */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Macro Categorie</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Nuova categoria..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all"
              />
              <button onClick={addCategory} className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">
                <Plus size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-center cursor-pointer ${selectedCatId === c.id ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-100 hover:border-slate-200"}`} onClick={() => setSelectedCatId(c.id)}>
                  <span className="font-black text-sm text-slate-800">{c.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem("category", c.id); }} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sottocategorie / Tipi */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Specialità {selectedCatId && `per ${categories.find(c => c.id === selectedCatId)?.name}`}</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                disabled={!selectedCatId}
                value={newTypeName} 
                onChange={e => setNewTypeName(e.target.value)}
                placeholder={selectedCatId ? "Nuova specialità..." : "Seleziona categoria..."}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
              />
              <button disabled={!selectedCatId} onClick={addType} className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-2">
              {selectedCatId && categories.find(c => c.id === selectedCatId)?.types.map((t: any) => (
                <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-700">{t.name}</span>
                  <button onClick={() => deleteItem("serviceType", t.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {!selectedCatId && (
                <div className="h-40 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <Layers size={32} className="mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Seleziona una categoria</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  )
}
