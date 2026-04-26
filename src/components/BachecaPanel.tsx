"use client"

import { useState, useEffect } from "react"
import { Pin, AlertTriangle, Info, CheckCircle2, Megaphone, Plus, X, Send, Clock, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import ConfirmModal from "./ui/ConfirmModal"

interface Announcement {
  id: string
  title: string
  body: string
  priority: string
  authorName: string
  createdAt: string
  requiresRead: boolean
  isPinned: boolean
  hasRead?: boolean
}

const CATEGORIES = [
  { value: "AVVISO", label: "Avviso Generico", color: "bg-blue-100 text-blue-700" },
  { value: "URGENTE", label: "Urgente", color: "bg-red-100 text-red-700" },
  { value: "ODG", label: "Ordine del Giorno", color: "bg-emerald-100 text-emerald-700" },
  { value: "CIRCOLARE", label: "Circolare Interna", color: "bg-amber-100 text-amber-700" },
]

export default function BachecaPanel({ isAdmin = false, onClose }: { isAdmin?: boolean, onClose?: () => void }) {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Form for new announcement
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newCategory, setNewCategory] = useState("AVVISO")
  const [newPriority, setNewPriority] = useState("NORMAL")
  const [newRequiresRead, setNewRequiresRead] = useState(false)
  const [newIsPinned, setNewIsPinned] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const loadAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements")
      const data = await res.json()
      if (res.ok) {
        setAnnouncements(data)
      } else {
        console.error("Bacheca API Error:", data.error)
        toast.error(`Errore Bacheca: ${data.error || "Riprova più tardi"}`)
      }
    } catch (err) {
      console.error("Bacheca Fetch Exception:", err)
      toast.error("Errore di connessione alla bacheca")
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}/read`, { method: "POST" })
      if (res.ok) {
        setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, hasRead: true } : a))
        toast.success("Letto!")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    setPublishing(true)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          body: newBody,
          category: newCategory,
          priority: newPriority,
          requiresRead: newRequiresRead,
          isPinned: newIsPinned
        })
      })
      if (res.ok) {
        toast.success("Avviso pubblicato")
        setShowConfig(false)
        setNewTitle("")
        setNewBody("")
        setNewCategory("AVVISO")
        loadAnnouncements()
      } else {
         toast.error("Errore salvataggio")
      }
    } catch {
       toast.error("Errore di rete")
    }
    setPublishing(false)
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm font-medium animate-pulse uppercase tracking-widest">Caricamento bacheca...</div>
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" })
      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        toast.success("Avviso eliminato")
      } else {
        toast.error("Errore eliminazione")
      }
    } catch {
      toast.error("Errore di rete")
    }
    setDeleteTarget(null)
  }

  return (
    <>
    <div className="bg-white border-2 border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 border-b-2 border-slate-100 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
             <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">Bacheca Comando</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Avvisi e Ordini del Giorno</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && !showConfig && (
            <button onClick={() => setShowConfig(true)} className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase shadow-md active:scale-95">
              <Plus className="w-4 h-4" /> Nuovo Post
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2.5 hover:bg-slate-200 text-slate-400 rounded-xl transition-colors" title="Chiudi">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {isAdmin && showConfig && (
        <form onSubmit={handlePublish} className="p-6 border-b-2 border-slate-200 bg-blue-50/30 animate-in slide-in-from-top duration-300">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nuova Comunicazione</h3>
             <button type="button" onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          </div>
          <div className="space-y-4 mb-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="Oggetto/Titolo" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 bg-white rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all" />
                <select value={newCategory} onChange={e=>setNewCategory(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 transition-all">
                   {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
             </div>
             <textarea required placeholder="Testo della comunicazione..." value={newBody} onChange={e => setNewBody(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-200 bg-white rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 transition-all min-h-[120px] resize-none" />
             
             <div className="flex flex-wrap items-center gap-6 p-4 bg-white border border-slate-200 rounded-xl">
                <select value={newPriority} onChange={e=>setNewPriority(e.target.value)} className="px-3 py-2 border-2 border-slate-100 bg-slate-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none">
                   <option value="NORMAL">Normale</option>
                   <option value="HIGH">Alta Priorità</option>
                   <option value="URGENT">Urgente</option>
                </select>
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                   <input type="checkbox" checked={newRequiresRead} onChange={e => setNewRequiresRead(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                   Conferma Lettura
                </label>
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">
                   <input type="checkbox" checked={newIsPinned} onChange={e => setNewIsPinned(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                   Fissa in Alto
                </label>
             </div>
          </div>
          <div className="flex justify-end">
             <button disabled={publishing} type="submit" className="px-8 py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center gap-3 transition-all shadow-xl active:scale-95">
                <Send className="w-4 h-4" /> {publishing ? "Invio..." : "Pubblica Avviso"}
             </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white">
        {announcements.length === 0 && !showConfig && (
           <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Nessuna comunicazione</p>
           </div>
        )}

        {announcements.map((ann) => {
          const cat = CATEGORIES.find(c => c.value === ann.category) || CATEGORIES[0]
          return (
            <div key={ann.id} className={`p-5 bg-white border-2 rounded-2xl shadow-sm relative transition-all group hover:shadow-md ${ann.priority === 'URGENT' ? 'border-red-100 bg-red-50/5' : ann.priority === 'HIGH' ? 'border-amber-100' : 'border-slate-100'}`}>
               
               {ann.isPinned && (
                  <div className="absolute -top-3 -right-3 bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                     <Pin className="w-4 h-4" />
                  </div>
               )}

               <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${cat.color}`}>
                     {cat.label}
                  </span>
                  {ann.priority === "URGENT" && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">Urgente</span>
                  )}
                  <h4 className="text-sm font-black text-slate-800 flex-1 truncate">{ann.title}</h4>
               </div>
               
               <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mb-6 font-medium line-clamp-4">{ann.body}</p>
               
               <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Data</span>
                        <span className="text-[10px] font-bold text-slate-600">{new Date(ann.createdAt).toLocaleDateString('it-IT')}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Autore</span>
                        <span className="text-[10px] font-bold text-slate-800 italic uppercase">{ann.authorName}</span>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {ann.requiresRead && !isAdmin && (
                       <button 
                         onClick={() => !ann.hasRead && handleMarkAsRead(ann.id)}
                         disabled={ann.hasRead}
                         className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                           ann.hasRead ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-600 hover:bg-red-700 text-white shadow-lg active:scale-95"
                         }`}
                       >
                          <CheckCircle2 className="w-4 h-4" /> {ann.hasRead ? "Letto" : "Leggi e Conferma"}
                       </button>
                    )}
                    {isAdmin && (
                       <button onClick={() => setDeleteTarget(ann.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-5 h-5" />
                       </button>
                    )}
                  </div>
               </div>
            </div>
          )
        })}
      </div>
    </div>

    <ConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget) }}
      title="Elimina Comunicazione"
      message="L'avviso verrà rimosso definitivamente per tutti gli agenti. Continuare?"
      destructive
      confirmLabel="Elimina Definitivamente"
    />
    </>
  )
}

