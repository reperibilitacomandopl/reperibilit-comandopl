"use client"
import React from "react"
import { Clock, Car, Radio, Users, ChevronRight, MapPin, CalendarDays } from "lucide-react"

interface NextShiftProps {
  shift: any
  allAgents: { id: string; name: string }[]
  allShifts: any[]
}

export default function NextShiftCard({ shift, allAgents, allShifts }: NextShiftProps) {
  if (!shift) return null

  // Trova colleghi nella stessa pattuglia (se presente)
  const colleagues = shift.patrolGroupId 
    ? allShifts
        .filter(s => 
          s.patrolGroupId === shift.patrolGroupId && 
          s.date === shift.date && 
          s.userId !== shift.userId
        )
        .map(s => allAgents.find(a => a.id === s.userId)?.name || "Collega")
    : []

  const dateObj = new Date(shift.date)
  const isToday = new Date().toDateString() === dateObj.toDateString()
  
  const formattedDate = dateObj.toLocaleDateString('it-IT', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })

  return (
    <div className="mx-2 sm:mx-0 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden group">
        <div className="flex flex-col lg:flex-row">
          
          {/* Left Side: Time & Date Badge */}
          <div className="lg:w-1/3 bg-slate-900 p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isToday ? 'bg-emerald-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
                  {isToday ? 'Oggi' : 'Prossimo Turno'}
                </div>
              </div>
              <h4 className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Data Servizio</h4>
              <p className="text-white text-xl font-black capitalize leading-tight">{formattedDate}</p>
            </div>

            <div className="mt-12 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                   <Clock size={28} />
                </div>
                <div>
                   <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">Orario Previsto</p>
                   <p className="text-white text-2xl font-black tracking-tight">{shift.timeRange || (shift.type.startsWith('M') ? '08:00 - 14:00' : '14:00 - 20:00')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Operational Details */}
          <div className="lg:w-2/3 p-8 bg-white relative">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Assignments */}
                <div className="space-y-6">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Asset Operativi
                   </h5>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition-colors">
                         <Car className="text-blue-600 mb-2" size={20} />
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mezzo</p>
                         <p className="text-sm font-black text-slate-900 truncate">{shift.vehicle?.name || "Appiedato"}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 transition-colors">
                         <Radio className="text-indigo-600 mb-2" size={20} />
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Radio</p>
                         <p className="text-sm font-black text-slate-900 truncate">{shift.radio?.name || "Centrale"}</p>
                      </div>
                   </div>
                   {shift.serviceDetails && (
                      <div className="p-4 bg-orange-50 rounded-3xl border border-orange-100 flex items-start gap-3">
                         <MapPin className="text-orange-600 shrink-0 mt-0.5" size={16} />
                         <div>
                            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Note Servizio</p>
                            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{shift.serviceDetails}</p>
                         </div>
                      </div>
                   )}
                </div>

                {/* Team / Patrol */}
                <div className="space-y-6">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      Team di Servizio
                   </h5>
                   <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                         <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400">
                            <Users size={20} />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">Pattuglia</p>
                            <p className="text-xs font-bold text-slate-500">{shift.patrolGroupId || "Servizio Singolo"}</p>
                         </div>
                      </div>
                      <div className="space-y-3">
                         {colleagues.length > 0 ? colleagues.map((c, i) => (
                            <div key={i} className="flex items-center gap-3">
                               <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                               <span className="text-sm font-black text-slate-700">{c}</span>
                            </div>
                         )) : (
                            <div className="flex items-center gap-3 text-slate-400 italic">
                               <span className="text-[11px] font-bold tracking-tight">Nessun collega assegnato in pattuglia</span>
                            </div>
                         )}
                      </div>
                   </div>
                </div>

             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
