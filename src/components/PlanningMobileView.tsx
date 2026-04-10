"use client"

import { useState } from "react"
import { Calendar, User, Shield, Info, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react"

interface Agent {
  id: string
  name: string
  matricola: string
  isUfficiale: boolean
}

interface Shift {
  userId: string
  date: Date | string
  type: string
  repType: string | null
}

interface DayInfo {
  day: number
  name: string
  isWeekend: boolean
  isNextMonth: boolean
}

interface PlanningMobileViewProps {
  agents: Agent[]
  shifts: Shift[]
  dayInfo: DayInfo[]
  currentYear: number
  currentMonth: number
  onEditCell?: (agentId: string, agentName: string, day: number, currentType: string) => void
  isAdmin?: boolean
}

export default function PlanningMobileView({ 
  agents, 
  shifts, 
  dayInfo, 
  currentYear, 
  currentMonth,
  onEditCell,
  isAdmin = false
}: PlanningMobileViewProps) {
  const [viewType, setViewType] = useState<'day' | 'agent'>('day')
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || "")

  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]

  const getShiftFor = (agentId: string, day: number) => {
    const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, day)).toISOString()
    return shifts.find(s => s.userId === agentId && new Date(s.date).toISOString() === targetDate)
  }

  const renderBadge = (shift?: Shift) => {
    if (!shift) return null
    const sType = (shift.type || "").toUpperCase()
    const rType = (shift.repType || "")

    let badgeClass = "bg-slate-100 text-slate-400"
    let label = sType || "RIPOSO"

    if (rType.toLowerCase().includes("rep")) {
      badgeClass = "bg-emerald-500 text-white font-black"
      label = "REPERIBILE"
    } else if (sType.includes("M") || sType.includes("7")) {
      badgeClass = "bg-blue-500 text-white font-black"
    } else if (sType.includes("P") || sType.includes("14")) {
      badgeClass = "bg-indigo-500 text-white font-black"
    } else if (sType.includes("F") || sType.includes("FERIE")) {
      badgeClass = "bg-amber-400 text-amber-900 font-black"
    }

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] tracking-widest uppercase shadow-sm ${badgeClass}`}>
        {label}
      </span>
    )
  }

  return (
    <div className="bg-slate-50 min-h-[400px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner">
      {/* Tab Switcher */}
      <div className="flex p-2 bg-slate-200/50 backdrop-blur-md">
        <button 
          onClick={() => setViewType('day')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewType === 'day' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}
        >
          <Calendar size={16} />
          Vista Giorno
        </button>
        <button 
          onClick={() => setViewType('agent')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewType === 'agent' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'}`}
        >
          <User size={16} />
          Vista Agente
        </button>
      </div>

      <div className="p-4">
        {viewType === 'day' ? (
          <div className="space-y-4">
            {/* Day Selector Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
              {dayInfo.filter(di => !di.isNextMonth).map(di => (
                <button
                  key={di.day}
                  onClick={() => setSelectedDay(di.day)}
                  className={`flex flex-col items-center justify-center min-w-[50px] h-[70px] rounded-2xl transition-all border-2 ${selectedDay === di.day ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-200 scale-105' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  <span className="text-[10px] uppercase font-bold">{di.name.substring(0,3)}</span>
                  <span className="text-xl font-black">{di.day}</span>
                </button>
              ))}
            </div>

            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2">
              <Clock className="text-blue-500" size={20} />
              Operativi del {selectedDay} {monthNames[currentMonth-1]}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {agents.map(agent => {
                const shift = getShiftFor(agent.id, selectedDay)
                return (
                  <div 
                    key={agent.id}
                    onClick={() => isAdmin && onEditCell && onEditCell(agent.id, agent.name, selectedDay, shift?.repType || shift?.type || "")}
                    className={`bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all ${isAdmin ? 'cursor-pointer hover:border-blue-300' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner ${agent.isUfficiale ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {agent.isUfficiale ? 'UF' : 'AG'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm leading-tight">{agent.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Matr. {agent.matricola}</p>
                      </div>
                    </div>
                    <div>
                      {renderBadge(shift)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Agent Selector */}
            <select 
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-black text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm capitalize"
            >
              {agents.map(a => <option key={a.id} value={a.id}>{a.name.toLowerCase()} ({a.matricola})</option>)}
            </select>

            <div className="space-y-2">
              {dayInfo.filter(di => !di.isNextMonth).map(di => {
                const shift = getShiftFor(selectedAgentId, di.day)
                if (!shift && !isAdmin) return null // Hide empty days for agents unless admin
                
                return (
                  <div 
                    key={di.day}
                    onClick={() => isAdmin && onEditCell && onEditCell(selectedAgentId, agents.find(a=>a.id===selectedAgentId)?.name || "", di.day, shift?.repType || shift?.type || "")}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${di.isWeekend ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100'} ${isAdmin ? 'cursor-pointer hover:border-indigo-300' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center leading-none ${di.isWeekend ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <span className="text-[7px] font-black uppercase">{di.name.substring(0,3)}</span>
                        <span className="text-xs font-black">{di.day}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-tighter">
                        {shift?.repType || shift?.type || "---"}
                      </p>
                    </div>
                    {renderBadge(shift)}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-100/50 border-t border-slate-200">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-center">
          Sentinel Mobile View v1.0 &middot; Terminale di Pattuglia
        </p>
      </div>
    </div>
  )
}
