"use client"

import { useState, useEffect } from "react"
import { Pin, AlertTriangle, Info, CheckCircle2, Megaphone, Plus, X, Send, Clock } from "lucide-react"
import toast from "react-hot-toast"

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

export default function BachecaPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Form for new announcement
  const [newTitle, setNewTitle] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newPriority, setNewPriority] = useState("NORMAL")
  const [newRequiresRead, setNewRequiresRead] = useState(false)
  const [newIsPinned, setNewIsPinned] = useState(false)

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
    return <div className="p-8 text-center text-slate-400 text-sm font-medium animate-pulse">Caricamento comunicazioni...</div>
  }

  return (
    <div className="bg-white border flex flex-col h-full border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
             <Megaphone className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight">Bacheca Comunicazioni</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Avvisi e Ordini del Giorno</p>
          </div>
        </div>
        {isAdmin && !showConfig && (
          <button onClick={() => setShowConfig(true)} className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold">
            <Plus className="w-4 h-4" /> Nuovo
          </button>
        )}
      </div>

      {isAdmin && showConfig && (
        <form onSubmit={handlePublish} className="p-5 border-b border-slate-200 bg-indigo-50/50">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-slate-800">Scrivi Comunicazione</h3>
             <button type="button" onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
          </div>
          <div className="space-y-3 mb-4">
             <input required type="text" placeholder="Oggetto/Titolo" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-indigo-400" />
             <textarea required placeholder="Testo della comunicazione..." value={newBody} onChange={e => setNewBody(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-400 min-h-[100px] resize-y" />
             
             <div className="flex flex-wrap gap-4">
                <select value={newPriority} onChange={e=>setNewPriority(e.target.value)} className="px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold text-slate-600 focus:outline-none">
                   <option value="NORMAL">Normale</option>
                   <option value="HIGH">Alta Priorità</option>
                   <option value="URGENT">Urgente</option>
                </select>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                   <input type="checkbox" checked={newRequiresRead} onChange={e => setNewRequiresRead(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                   Richiedi Conferma Lettura
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                   <input type="checkbox" checked={newIsPinned} onChange={e => setNewIsPinned(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                   Fissa in Alto (Pin)
                </label>
             </div>
          </div>
          <div className="flex justify-end">
             <button disabled={publishing} type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95">
                <Send className="w-3.5 h-3.5" /> {publishing ? "Invio in corso..." : "Pubblica"}
             </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/30">
        {announcements.length === 0 && !showConfig && (
           <div className="text-center py-10">
              <Megaphone className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nessun Avviso Recente</p>
           </div>
        )}

        {announcements.map((ann) => (
          <div key={ann.id} className={`p-4 bg-white border rounded-xl shadow-sm relative ${ann.priority === 'URGENT' ? 'border-rose-300 bg-rose-50/10' : ann.priority === 'HIGH' ? 'border-amber-300' : 'border-slate-200'}`}>
             
             {ann.isPinned && (
                <div className="absolute -top-2.5 -right-2.5 bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                   <Pin className="w-3.5 h-3.5" />
                </div>
             )}

             <div className="flex items-center gap-2 mb-2">
                {ann.priority === "URGENT" ? <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0"/> : ann.priority === "HIGH" ? <Info className="w-4 h-4 text-amber-500 shrink-0"/> : null}
                <h4 className="text-sm font-bold text-slate-800">{ann.title}</h4>
             </div>
             
             <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed mb-4">{ann.body}</p>
             
             <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold text-slate-400 capitalize">{ann.authorName}</span>
                   <span className="text-slate-300">•</span>
                   <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Clock className="w-3 h-3" /> {new Date(ann.createdAt).toLocaleDateString('it-IT')}
                   </span>
                </div>
                
                {ann.requiresRead && !isAdmin && (
                   <button 
                     onClick={() => !ann.hasRead && handleMarkAsRead(ann.id)}
                     disabled={ann.hasRead}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                       ann.hasRead ? "bg-emerald-50 text-emerald-600" : "bg-rose-500 hover:bg-rose-600 text-white shadow-md active:scale-95"
                     }`}
                   >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {ann.hasRead ? "Già Letto" : "Conferma Lettura"}
                   </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}
