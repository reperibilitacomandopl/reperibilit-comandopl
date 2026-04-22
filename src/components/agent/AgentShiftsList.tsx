"use client"
import React from "react"
import Link from "next/link"
import { AlertCircle, RefreshCw, CalendarDays, Smartphone, ChevronLeft, ChevronRight } from "lucide-react"
import PlanningMobileView from "../PlanningMobileView"
import { isMalattia } from "@/utils/shift-logic"

export default function AgentShiftsList({
  isPublished,
  isMobileView,
  setIsMobileView,
  currentUser,
  shifts,
  myShifts,
  dayInfo,
  currentYear,
  currentMonth,
  currentMonthName,
  daysInMonth,
  prevMonth,
  prevYear,
  nextMonth,
  nextYear,
  userRole,
  agendaEntries,
  setAgendaDate,
  setShowAgenda,
  setSelectedShiftForSwap,
  setShowSwapModal,
  onShowSosModal,
  tenantSlug
}: any) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <CalendarDays size={24} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-xl text-slate-900">Il Mio Calendario</h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight">Focus {currentMonthName} {currentYear} · {daysInMonth} Giorni</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileView(!isMobileView)}
            className={`p-2.5 rounded-xl transition-all border shadow-sm ${isMobileView ? "bg-blue-600 text-white border-blue-700" : "bg-white text-slate-400 border-slate-200"}`}
            title="Passa a Vista Card (Mobile)"
          >
            <Smartphone size={18} />
          </button>

          <div className="hidden sm:flex bg-slate-100 rounded-lg p-1">
            <Link href={`/${tenantSlug || ''}?view=agent&month=${prevMonth}&year=${prevYear}`} className="p-2 text-slate-500 hover:text-slate-900 rounded-md transition-all hover:bg-white">
              <ChevronLeft size={16} />
            </Link>
            <div className="px-3 py-1.5 text-sm font-bold text-slate-700 min-w-[130px] text-center uppercase tracking-wider">
              {currentMonthName} {currentYear}
            </div>
            <Link href={`/${tenantSlug || ''}?view=agent&month=${nextMonth}&year=${nextYear}`} className="p-2 text-slate-500 hover:text-slate-900 rounded-md transition-all hover:bg-white">
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> Rep
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm ml-2"></span> Turno
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm ml-2"></span> Assenza
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm ml-2"></span> Festivo
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm ml-2"></span> Agenda
          </div>
        </div>
      </div>
      
      <div className="p-6 overflow-x-auto custom-scrollbar">
        {!isPublished ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-amber-50 flex items-center justify-center rounded-2xl mb-4 border border-amber-100">
                <AlertCircle size={32} className="text-amber-500" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Turni In Fase di Elaborazione</h4>
            <p className="text-sm text-slate-500 max-w-sm mt-2">I turni di reperibilità per questo mese non sono ancora stati consolidati e pubblicati dall&apos;Amministratore.</p>
            <PlanningMobileView 
                agents={currentUser ? [{ ...currentUser, isUfficiale: currentUser.isUfficiale || false }] : []}
                shifts={shifts}
                dayInfo={dayInfo}
                currentYear={currentYear}
                currentMonth={currentMonth}
                onShowSosModal={onShowSosModal}
                userRole={userRole}
              />
            </div>
        ) : isMobileView ? (
            <div className="pb-4">
              <PlanningMobileView 
                agents={currentUser ? [{ ...currentUser, isUfficiale: currentUser.isUfficiale || false }] : []}
                shifts={shifts}
                dayInfo={dayInfo}
                currentYear={currentYear}
                currentMonth={currentMonth}
                prevMonth={prevMonth}
                prevYear={prevYear}
                nextMonth={nextMonth}
                nextYear={nextYear}
                tenantSlug={tenantSlug}
                onShowSosModal={onShowSosModal}
                userRole={userRole}
              />
            </div>
        ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(dn => (
                <div key={dn} className={`text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-2 ${dn === "Sab" || dn === "Dom" ? "text-red-400" : "text-slate-400"}`}>
                  <span className="sm:hidden">{dn.charAt(0)}</span>
                  <span className="hidden sm:inline">{dn}</span>
                </div>
            ))}

            {(() => {
                const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
                const offset = firstDay === 0 ? 6 : firstDay - 1
                return Array.from({ length: offset }, (_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-20"></div>
                ))
            })()}

            {dayInfo.map((di: any) => {
                const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                const sObj = myShifts.find((s: any) => new Date(s.date).toISOString() === targetDate)
                const sType = (sObj?.type || "").toUpperCase()
                const rType = (sObj?.repType || "").toUpperCase()
                const dayAgendaItems = di.isNextMonth ? [] : agendaEntries.filter((e: any) => new Date(e.date).getUTCDate() === di.day)

                const isRep = rType.includes("REP")
                const FERIE_ALL = ["F", "FERIE", "FERIE_AP", "FEST_SOP", "104", "MOT_PERS", "ELETT", "CONG_PAT", "CONG_PAR"]
                const isFerie = FERIE_ALL.includes(sType) || sType.startsWith("F")
                const _isMalattia = isMalattia(sType)
                const isToday = !di.isNextMonth && new Date().getDate() === di.day && new Date().getMonth() === currentMonth - 1 && new Date().getFullYear() === currentYear

                let cellBg = "bg-white hover:bg-slate-50"
                let borderStyle = "border border-slate-100"
                let dayNumClass = "text-slate-800"
                let badgeEl = null

                if (isRep) {
                  cellBg = "bg-emerald-50 hover:bg-emerald-100"
                  borderStyle = "border-2 border-emerald-400"
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-black tracking-widest bg-emerald-600 text-white rounded shadow-sm">REP</span>
                } else if (isFerie) {
                  cellBg = "bg-amber-50 hover:bg-amber-100"
                  borderStyle = "border border-amber-200"
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-amber-500 text-white rounded truncate max-w-[90%]">{sType}</span>
                } else if (_isMalattia) {
                  cellBg = "bg-blue-50 hover:bg-blue-100"
                  borderStyle = "border border-blue-200"
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-blue-500 text-white rounded truncate max-w-[90%]">{sType}</span>
                } else if (sType) {
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-slate-200 text-slate-600 rounded truncate max-w-[90%]">{sType}</span>
                }

                if (di.isWeekend && !isRep) {
                  cellBg = "bg-red-50/40 hover:bg-red-50"
                  dayNumClass = "text-red-500"
                }

                if (isToday) {
                  borderStyle = isRep ? borderStyle : "border-2 border-blue-500"
                }

                return (
                  <div 
                    key={di.isNextMonth ? 'next-1' : di.day} 
                    className={`relative rounded-lg sm:rounded-xl p-1 sm:p-2 h-16 sm:h-20 flex flex-col items-center justify-start transition-all overflow-hidden group ${di.isNextMonth ? "bg-slate-100 opacity-40 grayscale cursor-not-allowed" : `cursor-pointer ${cellBg} ${borderStyle}`}`}
                    onClick={() => { 
                      if (di.isNextMonth) return
                      setAgendaDate(String(di.day))
                      setShowAgenda(true) 
                    }}
                  >
                    {isToday && !di.isNextMonth && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    {dayAgendaItems.length > 0 && !di.isNextMonth && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-purple-500 rounded-full" title={`${dayAgendaItems.length} voce/i agenda`}></div>
                    )}
                    <span className={`text-sm font-black ${di.isNextMonth ? "text-slate-300" : dayNumClass}`}>{di.day}{di.isNextMonth ? '*' : ''}</span>
                    <span className={`text-[8px] uppercase font-bold tracking-widest ${di.isNextMonth ? "text-slate-300" : (di.isWeekend ? "text-red-400" : "text-slate-400")}`}>{di.name}</span>
                    {badgeEl}
                    {isRep && sType && !di.isNextMonth && (
                      <span className="text-[7px] font-bold text-emerald-800 mt-0.5">base: {sType}</span>
                    )}
                    {sObj && sType !== "RIPOSO" && !di.isNextMonth && isPublished && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShiftForSwap(sObj);
                          setShowSwapModal(true);
                        }}
                        className="absolute bottom-1 right-1 p-1 bg-white/60 hover:bg-white text-slate-600 rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-200"
                        title="Proponi Scambio per questa data"
                      >
                        <RefreshCw size={12} />
                      </div>
                    )}
                  </div>
                )
            })}
            </div>
        )}
      </div>
    </div>
  )
}
