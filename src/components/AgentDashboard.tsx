"use client"

import { useState, useEffect } from "react"
import { useAgentData } from "@/hooks/useAgentData"
import { DashboardShift } from "@/types/dashboard"

// Utils & Helpers
import { isHoliday } from "@/utils/holidays"
import { CAT_COLORS, paramsToColor } from "@/utils/constants"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"
import { getLabel } from "@/utils/agenda-codes"

// Components
import AgentHeader from "./agent/AgentHeader"
import AgentShiftsList from "./agent/AgentShiftsList"
import AgentPersonalAgenda from "./agent/AgentPersonalAgenda"
import AgentRequestForm from "./agent/AgentRequestForm"
import AgentSwapBoard from "./agent/AgentSwapBoard"
import BachecaPanel from "@/components/BachecaPanel"
import NotificationManager from "./NotificationManager"
import WeatherWidget from "@/components/WeatherWidget"

// Independent Modals
import AgentSwapModal from "./agent/AgentSwapModal"
import AgentAgendaModal from "./agent/AgentAgendaModal"
import AgentSyncModal from "./agent/AgentSyncModal"
import AgentSosModal from "./agent/AgentSosModal"
import ChatPanel from "./agent/ChatPanel"
import OfficerDutyPanel from "./agent/OfficerDutyPanel"
import AgentFeaturedShiftsCarousel from "./agent/AgentFeaturedShiftsCarousel"
import PersonalBalances from "./agent/PersonalBalances"
import PersonalClockHistory from "./agent/PersonalClockHistory"
import ClockHistoryModal from "./agent/ClockHistoryModal"
import { ClockOutModal } from "./ClockOutModal"
import AgentCalendarView from "./agent/AgentCalendarView"
import AgentYearlyCard from "./agent/AgentYearlyCard"
import CartellinoSummaryView from "@/components/shared/CartellinoSummaryView"
import AgentTimecardView from "./agent/AgentTimecardView"
import AgentRotationView from "./agent/AgentRotationView"
import { useGpsTracking } from "@/hooks/useGpsTracking"

import { isAssenza } from "@/utils/shift-logic"
import { getRepDaysForMonth } from "@/lib/agent-rep-utils"
import { Shield, CalendarDays, BookOpen, FileDown, MessageSquare, Users, ChevronLeft, ChevronRight } from "lucide-react"

export interface AgentDashboardProps {
  currentUser: { id: string, matricola: string, name: string, squadra?: string | null, isUfficiale?: boolean, telegramChatId?: string | null }
  shifts: DashboardShift[]
  allAgents: { id: string; name: string; matricola: string }[]
  currentYear: number
  currentMonth: number
  isPublished: boolean
  currentView?: string
  tenantSlug?: string | null
  canManageShifts?: boolean
  canManageUsers?: boolean
  canVerifyClockIns?: boolean
  canConfigureSystem?: boolean
  userRole?: string
  signOutAction?: () => Promise<void>
  logoUrl?: string | null
  tenant?: any
  certifiedDates?: string[]
  agentData?: any
  calendarToken?: string
}

export default function AgentDashboard({ 
  currentUser, 
  shifts, 
  allAgents, 
  currentYear, 
  currentMonth, 
  isPublished, 
  userRole, 
  signOutAction,
  canVerifyClockIns,
  canManageShifts,
  tenantSlug,
  logoUrl,
  tenant,
  certifiedDates,
  agentData,
  calendarToken
}: AgentDashboardProps) {
  
  const localAgentData = useAgentData({ currentUser, currentYear, currentMonth, shifts, tenant });
  const admin = agentData || localAgentData;

  // GPS REAL-TIME TRACKING (GEOFENCING SMART)
  const coords = useGpsTracking({ 
    isClockedIn: admin.isClockedIn || 'OUT', 
    intervalMs: 300000,
    tenant: tenant,
    myShifts: admin.myShifts
  });

  // PWA Shortcuts & URL Actions
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const action = urlParams.get('action')
    const shiftId = urlParams.get('shiftId')

    if (shiftId) {
      const targetShift = shifts.find(s => s.id === shiftId)
      if (targetShift) {
        setSelectedShiftForSwap(targetShift)
        setShowSwapModal(true)
      }
    }

    if (action) {
      if (action === 'sos') {
        const confirmSos = window.confirm("🆘 INVIARE SOS GPS ALLA CENTRALE? La tua posizione attuale verrà trasmessa immediatamente.")
        if (confirmSos) setShowSosModal(true)
      } else if (action === 'clockin') {
        if (admin.isClockedIn !== 'IN') admin.handleClockAction('IN')
      }
      // Non fare replaceState su iOS/NFC — interferisce con la history navigation
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/nfc')) {
        try { window.history.replaceState({}, '', window.location.pathname) } catch (_) {}
      }
    }
  }, [admin.isClockedIn, shifts]);

  // UI State
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showAgenda, setShowAgenda] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [showSosModal, setShowSosModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showSectionChat, setShowSectionChat] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'yearly' | 'timecard' | 'rotazione'>('calendar')
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<DashboardShift | null>(null)
  const [agendaDate, setAgendaDate] = useState('')
  const [showClockHistory, setShowClockHistory] = useState(false)
  const [chatPatrolGroupId, setChatPatrolGroupId] = useState<string | null>(null)
  const [requestFormInitialCode, setRequestFormInitialCode] = useState("")
  const [requestFormInitialNotes, setRequestFormInitialNotes] = useState("")

  // Date Helpers
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
  const currentMonthName = monthNames[currentMonth - 1]
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]

  const dayInfo = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const date = new Date(currentYear, currentMonth - 1, d)
    return { day: d, name: dayNames[date.getDay()], isWeekend: isHoliday(date), isNextMonth: false }
  })
  
  const nextDay1 = new Date(currentYear, currentMonth, 1)
  dayInfo.push({ day: 1, name: dayNames[nextDay1.getDay()], isWeekend: isHoliday(nextDay1), isNextMonth: true })

  const repDays = getRepDaysForMonth(admin.myShifts, currentYear, currentMonth)
  const repCount = repDays.length

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-3 py-4 md:p-8 space-y-5 md:space-y-8 pb-28">
      <NotificationManager />
      
      <AgentHeader 
        currentUser={currentUser}
        currentMonth={currentMonth}
        currentYear={currentYear}
        prevMonth={prevMonth}
        prevYear={prevYear}
        nextMonth={nextMonth}
        nextYear={nextYear}
        monthNames={monthNames}
        onMonthChange={(m: number, y: number) => {
          window.location.href = `/${tenantSlug || ''}?view=agent&month=${m}&year=${y}`
        }}
        onYearChange={(y: number) => {
          window.location.href = `/${tenantSlug || ''}?view=agent&month=${currentMonth}&year=${y}`
        }}
        signOutAction={signOutAction}
        isClockedIn={admin.isClockedIn}
        lastClockTime={admin.lastClockTime}
        clockLoading={admin.clockLoading}
        handleClockAction={admin.handleClockAction}
        canVerifyClockIns={canVerifyClockIns}
        canManageShifts={canManageShifts}
        userRole={userRole}
        repCount={repCount}
        repDays={repDays}
        tenantSlug={tenantSlug}
        setShowSyncModal={setShowSyncModal}
        setShowSosModal={setShowSosModal}
        setShowSwapModal={setShowSwapModal}
        setSelectedShiftForSwap={setSelectedShiftForSwap}
        telegramCode={admin.telegramCode}
        onGenerateTelegramCode={admin.handleGenerateTelegramCode}
        telegramLoading={admin.telegramLoading}
      />

      <div className="mb-3 md:mb-6">
        <WeatherWidget 
          city={coords ? "Posizione Attuale" : "Altamura"} 
          lat={coords?.lat?.toString() || "40.8286"} 
          lon={coords?.lng?.toString() || "16.5516"} 
        />
      </div>

      <AgentFeaturedShiftsCarousel
        myShifts={admin.myShifts}
        allAgents={allAgents}
        allShifts={shifts}
        certifiedDates={certifiedDates}
        onOpenChat={(patrolGroupId) => {
          setChatPatrolGroupId(patrolGroupId)
          setShowChat(true)
        }}
        className="px-1 mb-2"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-1 space-y-6">
            {/* Section Chat Button - Always visible if user has a squad or service category */}
            {(() => {
              // Fallback: usa la serviceCategory del turno odierno se squadra è null
              const todayStr = new Date().toISOString().split('T')[0]
              const todayShift = shifts.find((s: any) => {
                const sd = s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0]
                return sd === todayStr && s.userId === currentUser.id
              })
              const sectionName = (todayShift as any)?.serviceCategory?.name || currentUser.squadra || null
              const sectionId = (todayShift as any)?.serviceCategoryId || currentUser.squadra || null

              if (!sectionName) return null

              return (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Sezione / Reparto</p>
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{sectionName}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setChatPatrolGroupId(`SECTION_${sectionId}`)
                      setShowSectionChat(true)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    Chat Sezione
                  </button>
                </div>
              </div>
              )
            })()}
            
            <button 
               onClick={() => setShowAbsenceModal(true)}
               className="relative bg-gradient-to-r from-amber-500 to-orange-500 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 overflow-hidden shadow-xl shadow-amber-200 hover:shadow-2xl hover:-translate-y-1 transition-all group text-left w-full border-none"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all"></div>
               <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white mb-1 drop-shadow-md">Richiesta Congedi</h3>
                    <p className="text-sm font-bold text-amber-50 drop-shadow-sm opacity-90">Ferie e Permessi</p>
                  </div>
                  <CalendarDays size={28} className="text-white" />
               </div>
            </button>

            <button 
               onClick={() => window.location.href = `/${tenantSlug || ''}/agent/posti-controllo`}
               className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 overflow-hidden shadow-xl shadow-blue-200 hover:shadow-2xl hover:-translate-y-1 transition-all group text-left w-full border-none"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all"></div>
               <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white mb-1 drop-shadow-md">Posti di Controllo</h3>
                    <p className="text-sm font-bold text-blue-50 drop-shadow-sm opacity-90">Inserimento dal campo</p>
                  </div>
                  <Shield size={28} className="text-white" />
               </div>
            </button>
        </div>

        <div className="lg:col-span-2">
           <BachecaPanel />
        </div>
      </div>
      
      <OfficerDutyPanel />
      
      {/* Redundant sections removed from home to be moved into Timecard view */}

      {/* NEXT SHIFT PROACTIVE WIDGET REMOVED BECAUSE INTEGRATED IN CAROUSEL */}

      <div className="flex flex-col gap-4 md:gap-6">
        <div className="-mx-3 md:mx-0">
           <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar mx-3 md:mx-0 md:w-fit">
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0 ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Calendario
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0 ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Griglia
              </button>
              <button 
                onClick={() => setViewMode('yearly')}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0 ${viewMode === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Annuale
              </button>
              <button 
                onClick={() => setViewMode('timecard')}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0 ${viewMode === 'timecard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Cartellino
              </button>
              <button 
                onClick={() => setViewMode('rotazione')}
                className={`px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0 ${viewMode === 'rotazione' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Rotazioni
              </button>
           </div>
        </div>

        {viewMode === 'calendar' ? (
          <AgentCalendarView 
            myShifts={admin.myShifts}
            agendaEntries={admin.agendaEntries}
            currentDate={new Date(currentYear, currentMonth - 1, 1)}
            onMonthChange={(date) => {
              window.location.href = `/${tenantSlug || ''}?view=agent&month=${date.getMonth() + 1}&year=${date.getFullYear()}`
            }}
            onDayClick={(day) => {
              setAgendaDate(String(day))
              setShowAgenda(true)
            }}
            onSwapClick={(shift) => {
              setSelectedShiftForSwap(shift)
              setShowSwapModal(true)
            }}
            isPublished={isPublished}
          />
        ) : viewMode === 'yearly' ? (
          <AgentYearlyCard />
        ) : viewMode === 'timecard' ? (
          <AgentTimecardView 
            admin={admin}
            onShowRequest={() => {
              setRequestFormInitialCode("")
              setRequestFormInitialNotes("")
              setShowAbsenceModal(true)
            }}
            onShowMancataTimb={() => {
              setRequestFormInitialCode("TIMB_MANC")
              setRequestFormInitialNotes("Segnalazione mancata timbratura del ...")
              setShowAbsenceModal(true)
            }}
            onShowUpload={() => {
              setRequestFormInitialCode("ALLEGATO")
              setRequestFormInitialNotes("Invio allegato relativo a ...")
              setShowAbsenceModal(true)
            }}
            onShowStraordinario={() => {
              setRequestFormInitialCode("STR_EXTRA")
              setRequestFormInitialNotes("Richiesta autorizzazione per straordinario imprevisto causa: ...\nOre richieste: ")
              setShowAbsenceModal(true)
            }}
          />
        ) : viewMode === 'rotazione' ? (
          <AgentRotationView />
        ) : (
          <AgentShiftsList 
            isPublished={isPublished}
            isMobileView={isMobileView}
            setIsMobileView={setIsMobileView}
            currentUser={currentUser}
            shifts={shifts}
            myShifts={admin.myShifts}
            dayInfo={dayInfo}
            currentYear={currentYear}
            currentMonth={currentMonth}
            currentMonthName={currentMonthName}
            daysInMonth={daysInMonth}
            prevMonth={prevMonth}
            prevYear={prevYear}
            nextMonth={nextMonth}
            nextYear={nextYear}
            userRole={userRole}
            agendaEntries={admin.agendaEntries}
            setAgendaDate={setAgendaDate}
            setShowAgenda={setShowAgenda}
            setSelectedShiftForSwap={setSelectedShiftForSwap}
            setShowSwapModal={setShowSwapModal}
            onShowSosModal={() => setShowSosModal(true)}
            tenantSlug={tenantSlug}
          />
        )}
      </div>

      {/* OLD BALANCES SECTION REMOVED FOR CLEANLINESS - NOW IN TIMECARD VIEW */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <AgentSwapBoard 
             swapRequests={admin.swapRequests} 
             currentUserId={currentUser.id} 
             handleRespondSwap={admin.handleRespondSwap} 
             swapLoading={admin.swapLoading} 
             vacationSwapRequests={admin.vacationSwapRequests}
             handleRespondVacationSwap={admin.handleRespondVacationSwap}
             handleProposeVacationSwap={admin.handleProposeVacationSwap}
        />
        <AgentPersonalAgenda 
             currentMonthName={currentMonthName} 
             currentYear={currentYear} 
             agendaEntries={admin.agendaEntries} 
             setShowAgenda={setShowAgenda} 
        />
      </div>

      <footer className="text-center py-12 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          Sentinel Command Suite · v3.0
      </footer>
      
      {showSwapModal && (
        <AgentSwapModal 
          currentUser={currentUser}
          allAgents={allAgents}
          myShifts={admin.myShifts}
          allShifts={shifts}
          onClose={() => setShowSwapModal(false)}
          selectedShift={selectedShiftForSwap}
          onSuccess={admin.fetchSwaps}
        />
      )}

      {showAgenda && (
        <AgentAgendaModal 
          currentMonthName={currentMonthName}
          currentYear={currentYear}
          userName={currentUser.name}
          agendaEntries={admin.agendaEntries}
          daysInMonth={daysInMonth}
          agendaSaving={admin.agendaSaving}
          onClose={() => setShowAgenda(false)}
          onSave={admin.handleSaveAgenda}
          onDelete={admin.handleDeleteAgenda}
        />
      )}

      {showSyncModal && (
        <AgentSyncModal 
          userId={currentUser.id}
          userName={currentUser.name}
          calendarToken={calendarToken}
          onClose={() => setShowSyncModal(false)}
        />
      )}

      {showSosModal && (
        <AgentSosModal 
          onClose={() => setShowSosModal(false)}
          onSendSos={admin.handleSendFullSos}
        />
      )}

      {showChat && chatPatrolGroupId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <ChatPanel 
            currentUser={{ id: currentUser.id, name: currentUser.name, isUfficiale: currentUser.isUfficiale }}
            patrolGroupId={chatPatrolGroupId}
            tenantSlug={tenantSlug}
            onClose={() => { setShowChat(false); setChatPatrolGroupId(null) }}
            type="PATROL"
          />
        </div>
      )}

      {showSectionChat && chatPatrolGroupId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <ChatPanel 
            currentUser={{ id: currentUser.id, name: currentUser.name, isUfficiale: currentUser.isUfficiale }}
            patrolGroupId={chatPatrolGroupId}
            tenantSlug={tenantSlug}
            onClose={() => { setShowSectionChat(false); setChatPatrolGroupId(null) }}
            type="SECTION"
          />
        </div>
      )}

      {showClockHistory && (
        <ClockHistoryModal 
          onClose={() => setShowClockHistory(false)}
          records={admin.clockRecords}
        />
      )}

      {showAbsenceModal && (
        <AgentRequestForm 
          balances={admin.balances} 
          onClose={() => setShowAbsenceModal(false)}
          initialCode={requestFormInitialCode}
          initialNotes={requestFormInitialNotes}
        />
      )}

      {admin.clockOutModalConfig && (
        <ClockOutModal 
          type={admin.clockOutModalConfig.type}
          diffMins={admin.clockOutModalConfig.diffMins}
          plannedEndTime={admin.clockOutModalConfig.plannedEndTime}
          onConfirm={(data) => admin.submitClockOutWithModal(data)}
          onCancel={() => admin.setClockOutModalConfig(null)}
          onCorrectionOnly={admin.clockOutModalConfig.type === "OVERTIME" ? () => admin.submitClockOutWithModal({ code: "CORREZIONE", notes: "Uscita orario ufficiale", isCorrection: true }) : undefined}
        />
      )}
    </div>
  )
}

