"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, Clock } from "lucide-react"

export default function AbsenceCalendar({ refreshTrigger }: { refreshTrigger: number }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetchRequests()
  }, [currentDate, refreshTrigger])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/absence-requests?status=ALL")
      if (res.ok) {
        const data = await res.json()
        setRequests(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Costruisci il calendario per il mese corrente
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  const daysInMonth = endOfMonth.getDate()
  const firstDayOfWeek = startOfMonth.getDay() === 0 ? 6 : startOfMonth.getDay() - 1 // 0=Lunedì, 6=Domenica

  const getRequestsForDay = (date: Date) => {
    return requests.filter(req => {
      const reqStart = new Date(req.date)
      const reqEnd = req.endDate ? new Date(req.endDate) : reqStart
      // Azzera le ore per un confronto corretto
      reqStart.setHours(0,0,0,0)
      reqEnd.setHours(23,59,59,999)
      return date.getTime() >= reqStart.getTime() && date.getTime() <= reqEnd.getTime()
    })
  }

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-500" /> Calendario Assenze
        </h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-black text-slate-700 uppercase tracking-widest text-sm">
            {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-10 text-slate-400 font-bold">Caricamento calendario...</div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2">
                {d}
              </div>
            ))}
            
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50 rounded-xl p-2 min-h-[100px] border border-slate-100/50"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              const dayRequests = getRequestsForDay(date)
              const isToday = new Date().toDateString() === date.toDateString()

              return (
                <div key={day} className={`rounded-xl p-2 min-h-[100px] border transition-all ${isToday ? 'bg-blue-50/30 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}>
                  <div className={`text-xs font-black mb-2 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayRequests.map(req => (
                      <div 
                        key={req.id} 
                        className={`text-[9px] font-bold px-1.5 py-1 rounded truncate flex items-center gap-1 ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                          req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-100 opacity-50 line-through' : 
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                        title={`${req.user?.name} - ${req.code} (${req.status})`}
                      >
                        {req.status === 'APPROVED' && <CheckCircle2 size={10} />}
                        {req.status === 'PENDING' && <Clock size={10} />}
                        <span className="truncate">{req.user?.name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
