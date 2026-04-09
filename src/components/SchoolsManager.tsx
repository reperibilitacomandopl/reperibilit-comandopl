"use client"

import { useState, useEffect } from "react"
import { School, Trash2, Plus, Clock, Save, ChevronDown, ChevronUp, GraduationCap } from "lucide-react"
import toast from "react-hot-toast"

export default function SchoolsManager() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newSchoolName, setNewSchoolName] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadSchools = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/schools")
      const data = await res.json()
      setSchools(data)
    } catch {
      toast.error("Errore nel caricamento scuole")
    }
    setLoading(false)
  }

  useEffect(() => { loadSchools() }, [])

  const handleAddSchool = async () => {
    if (!newSchoolName.trim()) return
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSchoolName })
      })
      if (res.ok) {
        toast.success("Scuola aggiunta!")
        setNewSchoolName("")
        loadSchools()
      }
    } catch {
      toast.error("Errore nell'aggiunta")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa scuola?")) return
    try {
      const res = await fetch(`/api/admin/schools/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Scuola eliminata")
        loadSchools()
      }
    } catch {
      toast.error("Errore nell'eliminazione")
    }
  }

  const handleUpdateSchedule = async (schoolId: string, name: string, schedules: any[]) => {
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, schedules })
      })
      if (res.ok) {
        toast.success("Orari salvati!")
        loadSchools()
      }
    } catch {
      toast.error("Errore nel salvataggio")
    }
  }

  const dayLabels = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]

  return (
    <div className="space-y-8 p-4">
      {/* Input Nuova Scuola */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-end gap-6 border-t-4 border-t-indigo-600">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Aggiungi Nuova Scuola / Plesso</label>
          <div className="relative">
             <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
             <input 
               type="text" 
               placeholder="Es: Scuola Elementare Don Milani" 
               className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
               value={newSchoolName}
               onChange={(e) => setNewSchoolName(e.target.value)}
             />
          </div>
        </div>
        <button 
          onClick={handleAddSchool}
          className="bg-indigo-600 hover:bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Plus size={18} /> Aggiungi Scuola
        </button>
      </div>

      {/* Lista Scuole */}
      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizzazione anagrafica...</div>
        ) : schools.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <GraduationCap size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium italic">Nessuna scuola precaricata nel sistema.</p>
          </div>
        ) : (
          schools.map(school => (
            <div key={school.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-indigo-200 group">
              <div className="p-6 flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">{school.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precaricata per O.d.S.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setExpandedId(expandedId === school.id ? null : school.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    {expandedId === school.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Configura Orari
                  </button>
                  <button 
                    onClick={() => handleDelete(school.id)}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {expandedId === school.id && (
                <div className="px-6 pb-8 pt-2 border-t border-slate-50 space-y-6 animate-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dayLabels.slice(1, 7).concat(dayLabels[0]).map((label, idx) => {
                       const dow = (idx + 1) % 7; // Convert logic to match 0=Sun, 1=Mon...
                       const schedule = school.schedules.find((s: any) => s.dayOfWeek === dow) || { dayOfWeek: dow, entranceTime: "07:45-08:30", exitTime: "13:00-14:00" };
                       
                       return (
                         <div key={dow} className="bg-slate-50 p-4 rounded-2xl space-y-3 ring-1 ring-slate-100">
                           <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                              <Clock size={12} className="text-slate-300" />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Ingresso</span>
                              <input 
                                type="text"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-400"
                                value={schedule.entranceTime}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  const updatedSchedules = [...school.schedules];
                                  const sIdx = updatedSchedules.findIndex((s: any) => s.dayOfWeek === dow);
                                  if (sIdx > -1) updatedSchedules[sIdx].entranceTime = newVal;
                                  else updatedSchedules.push({ dayOfWeek: dow, entranceTime: newVal, exitTime: "13:00-14:00" });
                                  setSchools(prev => prev.map(s => s.id === school.id ? { ...s, schedules: updatedSchedules } : s));
                                }}
                              />
                           </div>
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Uscita</span>
                              <input 
                                type="text"
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-400"
                                value={schedule.exitTime}
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  const updatedSchedules = [...school.schedules];
                                  const sIdx = updatedSchedules.findIndex((s: any) => s.dayOfWeek === dow);
                                  if (sIdx > -1) updatedSchedules[sIdx].exitTime = newVal;
                                  else updatedSchedules.push({ dayOfWeek: dow, entranceTime: "07:45-08:30", exitTime: newVal });
                                  setSchools(prev => prev.map(s => s.id === school.id ? { ...s, schedules: updatedSchedules } : s));
                                }}
                              />
                           </div>
                         </div>
                       )
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleUpdateSchedule(school.id, school.name, school.schedules)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                    >
                      <Save size={16} /> Salva Configurazione Settimanale
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
