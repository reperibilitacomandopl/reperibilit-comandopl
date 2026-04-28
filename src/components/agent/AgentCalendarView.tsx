"use client"

import React, { useState } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Users,
  Clock,
  MapPin,
  AlertCircle,
  RefreshCw,
  Plus
} from "lucide-react"
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addDays,
  isWeekend
} from "date-fns"
import { it } from "date-fns/locale"
import { isMalattia, isMattina, isPomeriggio, isAssenza } from "@/utils/shift-logic"

interface AgentCalendarViewProps {
  myShifts: any[]
  agendaEntries: any[]
  currentDate: Date
  onMonthChange: (date: Date) => void
  onDayClick: (day: number) => void
  onSwapClick: (shift: any) => void
  isPublished: boolean
}

export default function AgentCalendarView({
  myShifts,
  agendaEntries,
  currentDate,
  onMonthChange,
  onDayClick,
  onSwapClick,
  isPublished
}: AgentCalendarViewProps) {
  
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const nextMonth = () => onMonthChange(addMonths(currentDate, 1))
  const prevMonth = () => onMonthChange(subMonths(currentDate, 1))
  const goToToday = () => onMonthChange(new Date())

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in duration-500">
      {/* Header Interattivo */}
      <div className="bg-slate-900 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
            <CalendarIcon className="text-indigo-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase">
              {format(currentDate, "MMMM yyyy", { locale: it })}
            </h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Visualizzazione Mensile Interattiva</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700">
          <button 
            onClick={prevMonth}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={goToToday}
            className="px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest hover:bg-indigo-600 rounded-xl transition-all"
          >
            Oggi
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid Calendario */}
      <div className="flex-1 overflow-auto bg-slate-50/30 p-4 md:p-6">
        {!isPublished && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 animate-pulse">
                <AlertCircle className="text-amber-500 shrink-0" size={24} />
                <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                    Attenzione: I turni visualizzati potrebbero non essere definitivi (Mese non pubblicato)
                </p>
            </div>
        )}

        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {/* Giorni della settimana */}
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
            <div key={day} className="text-center py-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${day === "Sab" || day === "Dom" ? "text-rose-500" : "text-slate-400"}`}>
                {day}
              </span>
            </div>
          ))}

          {/* Celle dei giorni */}
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, monthStart)
            const isDayToday = isToday(day)
            const dayShift = myShifts.find(s => isSameDay(new Date(s.date), day))
            const dayAgenda = agendaEntries.filter(e => isSameDay(new Date(e.date), day))
            const _isWeekend = isWeekend(day)
            
            const sType = (dayShift?.type || "").toUpperCase()
            const rType = (dayShift?.repType || "").toUpperCase()
            const isRep = rType.includes("REP")
            const _isAssenza = isAssenza(sType)
            const _isMalattia = isMalattia(sType)

            let cellClasses = "relative min-h-[120px] rounded-[1.5rem] border transition-all p-3 flex flex-col group "
            let dayNumClasses = "text-lg font-black "
            
            if (!isCurrentMonth) {
              cellClasses += "bg-slate-100/50 border-transparent opacity-30 grayscale pointer-events-none "
              dayNumClasses += "text-slate-400 "
            } else if (isDayToday) {
              cellClasses += "bg-white border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl z-10 "
              dayNumClasses += "text-indigo-600 "
            } else if (isRep) {
              cellClasses += "bg-emerald-50 border-emerald-200 hover:shadow-lg hover:border-emerald-300 "
              dayNumClasses += "text-emerald-700 "
            } else if (_isAssenza) {
              cellClasses += "bg-amber-50 border-amber-200 hover:shadow-lg hover:border-amber-300 "
              dayNumClasses += "text-amber-700 "
            } else {
              cellClasses += "bg-white border-slate-100 hover:shadow-lg hover:border-slate-300 "
              dayNumClasses += "text-slate-800 "
            }

            if (_isWeekend && isCurrentMonth && !isDayToday && !isRep && !_isAssenza) {
                cellClasses += "bg-rose-50/30 border-rose-100 "
                dayNumClasses = "text-lg font-black text-rose-500 "
            }

            return (
              <div 
                key={day.toString()} 
                onClick={() => isCurrentMonth && onDayClick(day.getDate())}
                className={cellClasses}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={dayNumClasses}>{format(day, "d")}</span>
                  {dayAgenda.length > 0 && (
                    <div className="flex -space-x-1">
                      {dayAgenda.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 border border-white shadow-sm"></div>
                      ))}
                      {dayAgenda.length > 3 && <span className="text-[8px] font-black text-indigo-400 ml-1">+{dayAgenda.length - 3}</span>}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  {isRep && (
                    <div className="bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg w-fit shadow-sm shadow-emerald-900/20">
                      Reperibilità
                    </div>
                  )}
                  
                  {sType && sType !== "RIPOSO" && (
                    <div className={`text-[10px] font-black px-2 py-1 rounded-xl w-full truncate border
                      ${_isAssenza ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                        _isMalattia ? 'bg-rose-100 text-rose-800 border-rose-200' :
                        'bg-indigo-50 text-indigo-700 border-indigo-100'}
                    `}>
                      {sType}
                    </div>
                  )}

                  {dayShift?.timeRange && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                      <Clock size={10} />
                      {dayShift.timeRange}
                    </div>
                  )}

                  {dayShift?.vehicle && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                      <MapPin size={10} />
                      {dayShift.vehicle.name}
                    </div>
                  )}
                </div>

                {/* Quick Actions Hover */}
                {isCurrentMonth && isPublished && dayShift && sType !== "RIPOSO" && !_isAssenza && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation()
                            onSwapClick(dayShift)
                        }}
                        className="absolute bottom-2 right-2 p-1.5 bg-white shadow-md border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                        title="Proponi Scambio"
                    >
                        <RefreshCw size={12} />
                    </button>
                )}

                {!isCurrentMonth && (
                    <div className="absolute inset-0 bg-slate-50/10"></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer / Legend */}
      <div className="bg-white p-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reperibilità</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Servizio</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-amber-500"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assenza</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 rounded-full bg-rose-500"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Malattia</span>
           </div>
        </div>

        <button 
            onClick={() => onDayClick(new Date().getDate())}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95"
        >
            <Plus size={16} />
            Aggiungi Nota Agenda
        </button>
      </div>
    </div>
  )
}
