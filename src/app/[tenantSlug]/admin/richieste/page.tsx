"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Clock, CalendarDays, Inbox } from "lucide-react"
import toast from "react-hot-toast"
import AbsenceCalendar from "@/components/admin/AbsenceCalendar"
import { getLabel } from "@/utils/agenda-codes"

export default function GestioneRichiestePage() {
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [activeTab, setActiveTab] = useState<"PENDING" | "HISTORY">("PENDING")
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1)
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear())

  const fetchRequests = async () => {
    setLoading(true)
    try {
      // Fetch both pending and all (we will filter client-side for history)
      const res = await fetch(`/api/admin/absence-requests?status=${activeTab === "PENDING" ? "PENDING" : "ALL"}`)
      if (res.ok) {
        setRequests(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [activeTab])

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        toast.success(status === "APPROVED" ? "Richiesta Approvata ed inserita in Calendario!" : "Richiesta Rifiutata")
        fetchRequests()
        setRefreshTrigger(prev => prev + 1)
        router.refresh()
      } else {
        const error = await res.json()
        toast.error(error.error || "Errore durante l'operazione")
      }
    } catch (err) {
      toast.error("Errore di rete")
    }
  }

  const filteredHistory = activeTab === "HISTORY" ? requests.filter(req => {
    if (req.status === "PENDING") return false
    const reqDate = new Date(req.createdAt)
    return reqDate.getMonth() + 1 === historyMonth && reqDate.getFullYear() === historyYear
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []

  return (
    <div className="p-6 lg:p-8 relative z-10 h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Inbox className="text-blue-600" size={32} />
          Inbox Segreteria
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Gestione approvazioni ferie, permessi e malattie inoltrate dagli agenti.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab("PENDING")}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "PENDING" ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
        >
          Da Processare
        </button>
        <button 
          onClick={() => setActiveTab("HISTORY")}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === "HISTORY" ? "bg-slate-800 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
        >
          Storico Richieste
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            {activeTab === "PENDING" ? (
               <><Clock size={20} className="text-amber-500" /> Da Processare ({requests.length})</>
            ) : (
               <><CheckCircle2 size={20} className="text-emerald-500" /> Storico Approvazioni</>
            )}
          </h2>
          
          {activeTab === "HISTORY" ? (
             <div className="flex gap-2 items-center">
                <select 
                  value={historyMonth} 
                  onChange={e => setHistoryMonth(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 font-bold"
                >
                   {Array.from({length: 12}).map((_, i) => (
                     <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' }).toUpperCase()}</option>
                   ))}
                </select>
                <select 
                  value={historyYear} 
                  onChange={e => setHistoryYear(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 font-bold"
                >
                   {[2024, 2025, 2026].map(y => (
                     <option key={y} value={y}>{y}</option>
                   ))}
                </select>
             </div>
          ) : (
            <button onClick={fetchRequests} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
              Aggiorna
            </button>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-20 text-slate-400 font-bold">Caricamento in corso...</div>
          ) : activeTab === "PENDING" && requests.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-lg font-black text-slate-600">Nessuna richiesta in attesa</p>
              <p className="text-slate-400 text-sm">Hai processato tutte le notifiche.</p>
            </div>
          ) : activeTab === "HISTORY" && filteredHistory.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold">Nessuna richiesta processata in questo periodo.</div>
          ) : (
            <div className="space-y-4">
              {(activeTab === "PENDING" ? requests : filteredHistory).map(req => (
                <div key={req.id} className="border border-slate-200 bg-white hover:bg-blue-50/50 rounded-2xl p-5 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  {/* Info Box */}
                  <div className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${activeTab === 'HISTORY' ? (req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700') : 'bg-blue-100 text-blue-700'}`}>
                      {activeTab === "HISTORY" ? (req.status === 'APPROVED' ? <CheckCircle2 size={20} /> : <XCircle size={20} />) : <CalendarDays size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-slate-900">{req.user?.name || "Agente Sconosciuto"}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black border border-slate-200">Matr. {req.user?.matricola}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-md border border-amber-200 uppercase tracking-wide">
                          {getLabel(req.code) || req.code}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">
                          {new Date(req.date).toLocaleDateString('it-IT')} 
                          {req.endDate && ` al ${new Date(req.endDate).toLocaleDateString('it-IT')}`}
                        </span>
                        
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">
                          {(() => {
                             if (req.hours != null || req.startTime != null) {
                               if (req.startTime && req.endTime) return `${req.hours}h (${req.startTime} - ${req.endTime})`
                               return `${req.hours}h`
                             }
                             const start = new Date(req.date)
                             const end = req.endDate ? new Date(req.endDate) : new Date(req.date)
                             const diff = Math.abs(end.getTime() - start.getTime())
                             const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
                             return days === 1 ? '1 Giorno' : `${days} Giorni`
                          })()}
                        </span>
                      </div>
                      {req.notes && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2 italic shadow-inner">
                          &quot;{req.notes}&quot;
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Inoltrata il: {new Date(req.createdAt).toLocaleString('it-IT')}</p>
                    </div>
                  </div>

                  {/* Actions (Solo PENDING) */}
                  {activeTab === "PENDING" && (
                     <div className="flex items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:pl-6">
                       <button 
                         onClick={() => handleAction(req.id, "REJECTED")}
                         className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl font-black text-sm transition-all"
                       >
                         <XCircle size={18} /> Rifiuta
                       </button>
                       <button 
                         onClick={() => handleAction(req.id, "APPROVED")}
                         className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 rounded-xl font-black text-sm transition-all"
                       >
                         <CheckCircle2 size={18} /> Approva (Applica OdS)
                       </button>
                     </div>
                  )}
                  {/* Stato (Solo HISTORY) */}
                  {activeTab === "HISTORY" && (
                     <div className="flex flex-col items-end shrink-0 md:border-l md:border-slate-100 md:pl-6">
                        <span className={`text-sm font-black px-4 py-2 rounded-xl ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {req.status === 'APPROVED' ? 'APPROVATA' : 'RIFIUTATA'}
                        </span>
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Calendario Assenze Visuale */}
      <AbsenceCalendar refreshTrigger={refreshTrigger} />
    </div>
  )
}
