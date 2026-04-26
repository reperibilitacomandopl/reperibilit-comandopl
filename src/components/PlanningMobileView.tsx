"use client"

import { useState } from "react"
import { Calendar, User, Clock, AlertCircle, RefreshCw, ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { storeOfflineRequest } from "../lib/offline-sync"

interface Agent {
  id: string
  name: string
  matricola: string
  isUfficiale: boolean
  telegramChatId?: string | null
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
  isHoliday?: boolean
  isVigilia?: boolean
  isNextMonth: boolean
}

interface PlanningMobileViewProps {
  agents: Agent[]
  shifts: any[]
  dayInfo: DayInfo[]
  currentYear: number
  currentMonth: number
  prevMonth?: number
  prevYear?: number
  nextMonth?: number
  nextYear?: number
  tenantSlug?: string
  onEditCell?: (agentId: string, agentName: string, day: number, currentType: string) => void
  onShowSosModal?: () => void
  isAdmin?: boolean
  userRole?: string
}

export default function PlanningMobileView({ 
  agents, 
  shifts, 
  dayInfo, 
  currentYear, 
  currentMonth,
  prevMonth,
  prevYear,
  nextMonth,
  nextYear,
  tenantSlug,
  onEditCell,
  onShowSosModal,
  isAdmin = false,
  userRole = "AGENT"
}: PlanningMobileViewProps) {
  const [viewType, setViewType] = useState<'day' | 'agent'>('day')
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || "")
  const [loadingSOS, setLoadingSOS] = useState(false)

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

  const handleSOS = () => {
    if (onShowSosModal) {
      onShowSosModal()
    } else {
      // Fallback per casi in cui il prop non sia passato (es. vista admin)
      toast.error("Servizio SOS non disponibile in questa vista")
    }
  }

  return (
    <div className="flex flex-col bg-slate-50 min-h-[400px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner">

      {/* Tab Switcher - Premium Style */}
      <div className="flex p-1.5 bg-slate-200/40 backdrop-blur-xl border-b border-white/10 m-3 rounded-[1.5rem] shadow-inner">
        <button 
          onClick={() => setViewType('day')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${viewType === 'day' ? 'bg-[#0f172a] text-cyan-400 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Calendar size={16} />
          Vista Giorno
        </button>
        <button 
          onClick={() => setViewType('agent')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 ${viewType === 'agent' ? 'bg-[#0f172a] text-indigo-400 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <User size={16} />
          Vista Agente
        </button>
      </div>

      {/* Month Navigator for Mobile */}
      <div className="flex bg-white mx-3 mb-3 rounded-2xl p-1 border border-slate-200 shadow-sm items-center">
        <Link 
          href={`/${tenantSlug || ''}?view=agent&month=${prevMonth}&year=${prevYear}`}
          className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-75"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">
            {monthNames[currentMonth-1]} <span className="text-blue-600 font-black">{currentYear}</span>
          </span>
        </div>
        <Link 
          href={`/${tenantSlug || ''}?view=agent&month=${nextMonth}&year=${nextYear}`}
          className="p-3 hover:bg-slate-100 rounded-2xl transition-all active:scale-75"
        >
          <ChevronRight size={20} />
        </Link>
      </div>

      <div className="p-4 pt-2">
        {viewType === 'day' ? (
          <div className="space-y-6">
            {/* Day Selector Horizontal Scroll - Modern Look */}
            <div className="flex gap-3 overflow-x-auto pb-6 pt-2 no-scrollbar scroll-smooth px-2">
              {dayInfo.filter(di => !di.isNextMonth).map(di => (
                <button
                  key={di.day}
                  onClick={() => setSelectedDay(di.day)}
                  className={`flex flex-col items-center justify-center min-w-[64px] h-[86px] rounded-[1.5rem] transition-all border-2 duration-300 ${selectedDay === di.day ? 'bg-[#0f172a] border-cyan-400 text-white shadow-[0_10px_30px_-10px_rgba(14,165,233,0.5)] scale-110 z-10' : (di.isWeekend || di.isHoliday || di.isVigilia ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300')}`}
                >
                  <span className={`text-[9px] uppercase font-black tracking-widest mb-1 ${selectedDay === di.day ? 'text-cyan-400' : 'text-slate-400'}`}>{di.name.substring(0,3)}</span>
                  <span className="text-2xl font-black">{di.day}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <Clock size={16} className="text-cyan-600" />
                  </div>
                  Operativi {selectedDay} {monthNames[currentMonth-1]}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">{tenantSlug || 'Comando'}</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {agents.map(agent => {
                  const shift = getShiftFor(agent.id, selectedDay)
                  return (
                    <div 
                      key={agent.id}
                      onClick={() => isAdmin && onEditCell && onEditCell(agent.id, agent.name, selectedDay, shift?.repType || shift?.type || "")}
                      className={`bg-white p-5 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.97] transition-all duration-200 ${isAdmin ? 'cursor-pointer hover:border-cyan-300 hover:shadow-lg' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner transition-colors ${agent.isUfficiale ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                          {agent.isUfficiale ? 'UF' : 'AG'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-[15px] leading-tight mb-1">{agent.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Matr. {agent.matricola}</span>
                    {agent.telegramChatId && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Telegram Collegato"></span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderBadge(shift)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent Selector - Premium Dropdown */}
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2">
                <User size={18} className="text-indigo-500" />
              </div>
              <select 
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full pl-12 pr-6 py-5 bg-white rounded-[1.5rem] border-2 border-slate-100 font-bold text-slate-800 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 appearance-none shadow-sm capitalize transition-all"
              >
                {agents.map(a => <option key={a.id} value={a.id}>{a.name.toLowerCase()} ({a.matricola})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {dayInfo.filter(di => !di.isNextMonth).map(di => {
                const shift = getShiftFor(selectedAgentId, di.day)
                if (!shift && !isAdmin) return null 
                
                return (
                  <div 
                    key={di.day}
                    onClick={() => isAdmin && onEditCell && onEditCell(selectedAgentId, agents.find(a=>a.id===selectedAgentId)?.name || "", di.day, shift?.repType || shift?.type || "")}
                    className={`flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all duration-300 ${di.isWeekend ? 'bg-red-50/50 border-red-50' : 'bg-white border-slate-50'} ${isAdmin ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md active:scale-[0.98]' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center leading-none shadow-sm ${di.isWeekend ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                        <span className="text-[8px] font-black uppercase mb-0.5">{di.name.substring(0,3)}</span>
                        <span className="text-sm font-black">{di.day}</span>
                      </div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                        {shift?.repType || shift?.type || "RIPOSO"}
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

      {/* SOS Quick Action - Premium Tech Style */}
      {!isAdmin && (
        <div className="px-5 pb-8">
          <button 
            onClick={handleSOS}
            disabled={loadingSOS}
            className="w-full bg-[#0f172a] active:scale-[0.98] text-white rounded-[2rem] py-6 px-6 flex items-center justify-between gap-4 shadow-2xl shadow-red-200/50 border-b-4 border-red-600 transition-all font-black relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                {loadingSOS ? (
                  <RefreshCw className="animate-spin text-white" size={32} />
                ) : (
                  <AlertCircle size={32} className="animate-pulse text-white" />
                )}
              </div>
              <div className="text-left leading-none">
                <p className="text-xl uppercase tracking-tighter mb-1">SOS GPS</p>
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] italic">Segnale Emergenza</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
               <ChevronRight className="text-slate-500" />
            </div>
          </button>
        </div>
      )}

      <div className="py-6 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-4">
        <div className="h-[1px] flex-1 bg-slate-200"></div>
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] whitespace-nowrap">
          Sentinel Mobile
        </p>
        <div className="h-[1px] flex-1 bg-slate-200"></div>
      </div>
    </div>
  )
}
