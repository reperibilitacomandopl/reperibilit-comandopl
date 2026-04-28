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
import OfficerDutyPanel from "./agent/OfficerDutyPanel"
import NextShiftCard from "./agent/NextShiftCard"
import PersonalBalances from "./agent/PersonalBalances"
import PersonalClockHistory from "./agent/PersonalClockHistory"
import AgentCalendarView from "./agent/AgentCalendarView"
import AgentYearlyCard from "./agent/AgentYearlyCard"
import { useGpsTracking } from "@/hooks/useGpsTracking"

import { Shield, CalendarDays, BookOpen, FileDown } from "lucide-react"

export interface AgentDashboardProps {
  currentUser: { id: string, matricola: string, name: string, isUfficiale?: boolean, telegramChatId?: string | null }
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
  logoUrl
}: AgentDashboardProps) {
  
  const admin = useAgentData({ currentUser, currentYear, currentMonth, shifts });

  // GPS REAL-TIME TRACKING (SOLO IN SERVIZIO)
  useGpsTracking({ 
    isClockedIn: admin.isClockedIn || 'OUT', 
    intervalMs: 300000 // Aggiorna posizione ogni 5 minuti
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
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [admin.isClockedIn, shifts]);

  // UI State
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showAgenda, setShowAgenda] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [showSosModal, setShowSosModal] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'yearly'>('calendar')
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<DashboardShift | null>(null)
  const [agendaDate, setAgendaDate] = useState('')

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

  const repCount = admin.myShifts.filter(s => s.repType?.toUpperCase().includes("REP")).length

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-8 pb-32">
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
        tenantSlug={tenantSlug}
        setShowSyncModal={setShowSyncModal}
        setShowSosModal={setShowSosModal}
        setShowSwapModal={setShowSwapModal}
        setSelectedShiftForSwap={setSelectedShiftForSwap}
        telegramCode={admin.telegramCode}
        onGenerateTelegramCode={admin.handleGenerateTelegramCode}
        telegramLoading={admin.telegramLoading}
      />

      <div className="mb-6">
        <WeatherWidget city="Altamura" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
            {admin.myOds ? (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all group">
                  <div className="p-8 pb-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Servizio di Oggi</p>
                    <h3 className="text-3xl font-black text-slate-900">{admin.myOds.shift.timeRange || admin.myOds.shift.type}</h3>
                  </div>
                  <div className="px-8 pb-8 space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="text-slate-400 font-bold uppercase text-[9px] mb-1">Zona / Mezzo</div>
                         <p className="font-black text-slate-800">{admin.myOds.shift.serviceCategory?.name || "Operativo"}</p>
                         {admin.myOds.shift.vehicle && <p className="text-emerald-600 text-[11px] font-bold mt-1">🚗 {admin.myOds.shift.vehicle.name as string}</p>}
                    </div>
                    {admin.myOds.partners.length > 0 && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="text-amber-600 font-bold uppercase text-[9px] mb-1">Collega Pattuglia</div>
                        {admin.myOds.partners.map(p => (
                          <p key={p.id} className="font-black text-amber-900">{p.user.name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 text-center space-y-4 shadow-lg">
                  <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                    <Shield size={32} />
                  </div>
                  <h3 className="font-black text-slate-400 italic">Servizio non assegnato</h3>
                </div>
            )}
            
            <button 
               onClick={() => setShowAbsenceModal(true)}
               className="relative bg-gradient-to-r from-amber-500 to-orange-500 rounded-[2rem] p-8 overflow-hidden shadow-xl shadow-amber-200 hover:shadow-2xl hover:-translate-y-1 transition-all group text-left w-full border-none"
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
        </div>

        <div className="lg:col-span-2">
           <BachecaPanel />
        </div>
      </div>
      
      <OfficerDutyPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <PersonalBalances />
        <PersonalClockHistory />
      </div>

      {/* NEXT SHIFT PROACTIVE WIDGET */}
      {(() => {
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        
        const nextShift = admin.myShifts
          .filter(s => {
            const d = new Date(s.date)
            d.setHours(0, 0, 0, 0)
            return d >= now && (s.type !== "RIPOSO" && s.type !== "" && !s.type.startsWith("F") && !s.type.startsWith("M"))
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

        return nextShift ? (
          <NextShiftCard 
            shift={nextShift} 
            allAgents={allAgents} 
            allShifts={shifts} 
          />
        ) : null
      })()}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
           <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Calendario
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Griglia
              </button>
              <button 
                onClick={() => setViewMode('yearly')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Annuale
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

      {/* BALANCES SECTION */}
      <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <div className="p-2.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                 <BookOpen className="text-white" size={24} />
              </div> 
              Il Mio Bilancio
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch("/api/user/gdpr/export");
                    if (!res.ok) throw new Error("Errore durante l'esportazione");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `gdpr_export_${currentUser.matricola}_${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (e) {
                    alert("Impossibile scaricare i dati. Riprova più tardi.");
                  }
                }}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:scale-105 transition-all"
              >
                <Shield size={14} />
                Dati GDPR
              </button>
              <button 
                onClick={async () => {
                  const { default: jsPDF } = await import('jspdf')
                  const { default: autoTable } = await import('jspdf-autotable')
                  
                  const doc = new jsPDF()
                  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
                  const monthYear = `${monthNames[currentMonth - 1]} ${currentYear}`
                  
                  if (logoUrl) {
                    try { doc.addImage(logoUrl, 'PNG', 165, 12, 25, 25) } catch {}
                  }
                  
                  doc.setFontSize(20)
                  doc.setTextColor(30, 41, 59)
                  doc.text('Resoconto Mensile Attività', 14, 22)
                  
                  doc.setFontSize(10)
                  doc.setTextColor(100, 116, 139)
                  doc.text(`Polizia Locale · ${tenantSlug || 'Comando'}`, 14, 30)
                  doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, 14, 35)
                  
                  doc.setFontSize(12)
                  doc.setTextColor(30, 41, 59)
                  doc.text(`Agente: ${currentUser.name}`, 14, 50)
                  doc.text(`Matricola: ${currentUser.matricola}`, 14, 57)
                  doc.text(`Periodo: ${monthYear}`, 14, 64)
                  
                  const straCodes = ['2000','2050','2001','2002','2003','2020','2021','2022','2023','2026','10001','10002','10003']
                  const ferieCodes = ['0015','0016','0010']
                  const recCodes = ['0009','0067','0008','0081','0036','0037']
                  
                  const straHours = admin.agendaEntries.filter(e => straCodes.includes(e.code)).reduce((sum, e) => sum + (e.hours || 0), 0)
                  const ferieDays = new Set(admin.agendaEntries.filter(e => ferieCodes.includes(e.code)).map(e => new Date(e.date).getUTCDate())).size
                  const recHours = admin.agendaEntries.filter(e => recCodes.includes(e.code)).reduce((sum, e) => sum + (e.hours || 0), 0)

                  // @ts-ignore
                  autoTable(doc, {
                    startY: 75,
                    head: [['Categoria', 'Valore', 'Unità']],
                    body: [
                      ['Straordinario', straHours, 'ore'],
                      ['Ferie / Festività', ferieDays, 'giorni'],
                      ['Recupero Ore', recHours, 'ore'],
                      ['Reperibilità', repCount, 'turni'],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: [79, 70, 229] },
                  })

                  doc.setFontSize(14)
                  // @ts-ignore
                  const tableStartY = (doc as any).lastAutoTable.finalY + 15;
                  doc.text('Dettaglio Agenda Personale', 14, tableStartY)
                  
                  const tableData = admin.agendaEntries.map(e => [
                    new Date(e.date).toLocaleDateString('it-IT'),
                    getLabel(e.code),
                    e.hours ? `${e.hours}h` : '-',
                    e.note || '-'
                  ])

                  // @ts-ignore
                  autoTable(doc, {
                    startY: tableStartY + 5,
                    head: [['Data', 'Descrizione', 'Ore', 'Note']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [51, 65, 85] },
                    columnStyles: {
                      0: { cellWidth: 25 },
                      2: { cellWidth: 15 },
                    }
                  })

                  doc.save(`Resoconto_${currentUser.matricola}_${currentMonth}_${currentYear}.pdf`)
                }}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
              >
                <FileDown size={14} />
                Esporta PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {AGENDA_CATEGORIES.map((cat) => {
              const catDetails = (admin.balances?.details || []).filter((d) => 
                cat.items.some((i) => i.code === d.code) && d.initialValue > 0
              );
              if (catDetails.length === 0) return null;
              const colors = CAT_COLORS[cat.color] || CAT_COLORS.blue;

              return (
                <div key={cat.group} className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-2xl ${colors.bg} ${colors.text} border ${colors.border}`}>
                        <span className="text-2xl">{cat.emoji}</span>
                     </div>
                     <h3 className={`text-base font-black uppercase tracking-wider ${colors.text}`}>{cat.group}</h3>
                     <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {catDetails.map((d) => {
                      const pct = Math.min(100, (d.used / d.initialValue) * 100);
                      return (
                        <div key={d.code} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="font-extrabold text-slate-800 text-sm h-10 line-clamp-2">{d.label}</h4>
                            <span className={`px-2 py-0.5 ${colors.bg} ${colors.text} text-[8px] font-black rounded-md border ${colors.border}`}>
                               {d.unit === "HOURS" ? "H" : "G"}
                            </span>
                          </div>
                          <div className="mt-auto">
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] font-black text-slate-300 uppercase">{d.used} / {d.initialValue}</span>
                              <span className="text-lg font-black text-slate-800">{d.residue}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${paramsToColor(cat.color)}`} style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AgentSwapBoard 
             swapRequests={admin.swapRequests} 
             currentUserId={currentUser.id} 
             handleRespondSwap={admin.handleRespondSwap} 
             swapLoading={admin.swapLoading} 
        />
        <AgentPersonalAgenda 
             currentMonthName={currentMonthName} 
             currentYear={currentYear} 
             agendaEntries={admin.agendaEntries} 
             setShowAgenda={setShowAgenda} 
        />
      </div>

      <footer className="text-center py-12 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
          Sentinel Command Suite · v2.0
      </footer>

      {showAbsenceModal && <AgentRequestForm balances={admin.balances} onClose={() => setShowAbsenceModal(false)} />}
      
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
          onClose={() => setShowSyncModal(false)}
        />
      )}

      {showSosModal && (
        <AgentSosModal 
          onClose={() => setShowSosModal(false)}
          onSendSos={admin.handleSendFullSos}
        />
      )}
    </div>
  )
}

