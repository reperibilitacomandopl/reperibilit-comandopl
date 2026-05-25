"use client"

import React, { Suspense, useState } from "react"
import { LogOut, ClipboardList, RefreshCw, Smartphone } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useAgentMobileNav } from "@/hooks/useAgentMobileNav"
import { useAgentData } from "@/hooks/useAgentData"
import MobileAgentRiepilogo from "./MobileAgentRiepilogo"
import MobileAgentLaunchpad from "./MobileAgentLaunchpad"
import MobileNavBar from "./MobileNavBar"
import PlanningMobileView from "@/components/PlanningMobileView"
import AgentRequestForm from "./AgentRequestForm"
import AgentSwapBoard from "./AgentSwapBoard"
import AgentInterventions from "./AgentInterventions"
import PersonalBalances from "./PersonalBalances"
import AgentRotationView from "./AgentRotationView"
import AgentVerbalListView from "./AgentVerbalListView"
import AgentTimecardView from "./AgentTimecardView"
import BachecaPanel from "@/components/BachecaPanel"
import FloatingSosButton from "./FloatingSosButton"
import AgentSosModal from "./AgentSosModal"
import { ClockOutModal } from "@/components/ClockOutModal"
import NotificationManager from "@/components/NotificationManager"
import toast from "react-hot-toast"

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

type Props = {
  session: any
  allAgents: any[]
  shifts: any[]
  myShifts: any[]
  currentMonth: number
  currentYear: number
  dayInfo: any
  tenantSlug: string
  tenant?: any
  certifiedDates?: string[]
  logoUrl?: string | null
}

function MobileAgentShellInner(props: Props) {
  const {
    session,
    allAgents,
    shifts,
    myShifts,
    currentMonth,
    currentYear,
    dayInfo,
    tenantSlug,
    tenant,
    certifiedDates,
  } = props

  const { role } = session.user
  const { activeTab, navigate, scrollToRiepilogo, navigateMonth } = useAgentMobileNav(
    tenantSlug || ""
  )

  const [showSosModal, setShowSosModal] = useState(false)
  const [requestPreset, setRequestPreset] = useState<{ code?: string; notes?: string } | null>(
    null
  )

  const agentData = useAgentData({
    currentUser: session.user,
    currentYear,
    currentMonth,
    shifts,
    tenant,
  })

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  const openGpsConsentHint = () => {
    toast(
      "Per timbrare serve il consenso GPS. Completa il banner privacy in cima alla pagina.",
      { icon: "📍", duration: 5000 }
    )
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleClock = async (type: "IN" | "OUT") => {
    if (type === "IN" && !session.user.gpsConsent) {
      openGpsConsentHint()
      return
    }
    await agentData.handleClockAction(type)
  }

  const handleBadgeClock = async () => {
    if (!session.user.gpsConsent) {
      openGpsConsentHint()
      return
    }
    await agentData.handleBadgeClock()
  }

  React.useEffect(() => {
    if (activeTab !== "dashboard") return
    if (window.location.hash !== "#riepilogo-operativo") return
    requestAnimationFrame(() => {
      document
        .getElementById("riepilogo-operativo")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [activeTab])

  return (
    <>
      <div className="lg:hidden -mx-4 sm:mx-0">
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-2">
            <NotificationManager />
            <MobileAgentRiepilogo
              currentUser={session.user}
              tenantSlug={tenantSlug || ""}
              currentMonth={currentMonth}
              currentYear={currentYear}
              monthNames={MONTH_NAMES}
              shifts={shifts}
              myShifts={myShifts}
              allAgents={allAgents}
              certifiedDates={certifiedDates}
              isClockedIn={agentData.isClockedIn}
              lastClockTime={agentData.lastClockTime}
              clockLoading={agentData.clockLoading}
                      handleClockAction={handleClock}
                      onBadgeClock={handleBadgeClock}
                      onNavigateMonth={navigateMonth}
              onNavigate={navigate}
              onSos={() => setShowSosModal(true)}
              onGpsConsentRequired={openGpsConsentHint}
            />
            <MobileAgentLaunchpad
              tenantSlug={tenantSlug || ""}
              isClockedIn={agentData.isClockedIn}
              onNavigate={navigate}
              onScrollRiepilogo={scrollToRiepilogo}
              onSos={() => setShowSosModal(true)}
            />
          </div>
        )}

        {activeTab === "planning" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PlanningMobileView
              agents={allAgents.filter((a: any) => a.id === session.user.id)}
              shifts={shifts}
              dayInfo={dayInfo}
              currentYear={currentYear}
              currentMonth={currentMonth}
              prevMonth={prevMonth}
              prevYear={prevYear}
              nextMonth={nextMonth}
              nextYear={nextYear}
              tenantSlug={tenantSlug}
              isAdmin={false}
              userRole={role}
            />
          </div>
        )}

        {activeTab === "requests" && (
          <div className="bg-white rounded-[2.5rem] p-4 border border-slate-200 shadow-xl overflow-hidden min-h-[550px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="tech-gradient -m-4 p-8 mb-8 relative overflow-hidden">
              <ClipboardList className="text-cyan-400 mb-4" size={40} />
              <h3 className="text-2xl font-black text-white mb-1">Richieste Istanze</h3>
              <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
                Ferie, Congedi e Permessi
              </p>
            </div>
            <div className="px-1">
              <AgentRequestForm
                key={requestPreset?.code ?? "default-request"}
                balances={agentData.balances}
                initialCode={requestPreset?.code}
                initialNotes={requestPreset?.notes}
                onClose={() => {
                  setRequestPreset(null)
                  navigate("dashboard")
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "interventions" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AgentInterventions />
          </div>
        )}

        {activeTab === "ferie" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PersonalBalances />
            <AgentRotationView />
          </div>
        )}

        {activeTab === "verbali" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AgentVerbalListView tenantSlug={tenantSlug || ""} />
          </div>
        )}

        {activeTab === "cartellino" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
            <AgentTimecardView
              admin={{ ...agentData, currentUser: session.user, myShifts }}
              onShowRequest={() => {
                setRequestPreset(null)
                navigate("requests")
              }}
              onShowMancataTimb={() => {
                setRequestPreset({
                  code: "TIMB_MANC",
                  notes: "Segnalazione mancata timbratura del ...",
                })
                navigate("requests")
              }}
              onShowUpload={() => {
                setRequestPreset({
                  code: "ALLEGATO",
                  notes: "Invio allegato relativo a ...",
                })
                navigate("requests")
              }}
              onShowStraordinario={() => {
                setRequestPreset({
                  code: "STR_EXTRA",
                  notes:
                    "Richiesta autorizzazione per straordinario imprevisto causa: ...\nOre richieste: ",
                })
                navigate("requests")
              }}
            />
          </div>
        )}

        {activeTab === "bacheca" && (
          <div className="bg-white rounded-[2.5rem] p-4 border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BachecaPanel onClose={() => navigate("dashboard")} />
          </div>
        )}

        {activeTab === "swaps" && (
          <div className="bg-white rounded-[2.5rem] p-4 border border-slate-200 shadow-xl overflow-hidden min-h-[550px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-indigo-900 -m-4 p-8 mb-8 relative overflow-hidden text-left">
              <RefreshCw className="text-indigo-400 mb-4" size={40} />
              <h3 className="text-2xl font-black text-white mb-1">Scambio Turni</h3>
              <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.2em]">
                Reperibilità e Servizio
              </p>
            </div>
            <AgentSwapBoard
              currentUserId={session.user.id}
              swapRequests={agentData.swapRequests}
              swapLoading={agentData.swapLoading}
              handleRespondSwap={agentData.handleRespondSwap}
              vacationSwapRequests={agentData.vacationSwapRequests}
              handleRespondVacationSwap={agentData.handleRespondVacationSwap}
              handleProposeVacationSwap={agentData.handleProposeVacationSwap}
            />
            <div className="mt-10 p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
              <Smartphone className="mx-auto text-slate-300 mb-4" size={32} />
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                Seleziona una data dal calendario turni<br />
                per proporre un nuovo scambio
              </p>
              <button
                type="button"
                onClick={() => navigate("planning")}
                className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Apri calendario turni
              </button>
            </div>
          </div>
        )}
      </div>

      {agentData.clockOutModalConfig && (
        <ClockOutModal
          type={agentData.clockOutModalConfig.type}
          diffMins={agentData.clockOutModalConfig.diffMins}
          plannedEndTime={agentData.clockOutModalConfig.plannedEndTime}
          onConfirm={(data) => agentData.submitClockOutWithModal(data)}
          onCancel={() => agentData.setClockOutModalConfig(null)}
          onCorrectionOnly={
            agentData.clockOutModalConfig.type === "OVERTIME"
              ? () =>
                  agentData.submitClockOutWithModal({
                    code: "CORREZIONE",
                    notes: "Uscita orario ufficiale",
                    isCorrection: true,
                  })
              : undefined
          }
        />
      )}

      <FloatingSosButton onSendSos={agentData.handleSendFullSos} />
      {showSosModal && (
        <AgentSosModal
          onClose={() => setShowSosModal(false)}
          onSendSos={async (note, audio) => {
            const ok = await agentData.handleSendFullSos(note, audio)
            if (ok) setShowSosModal(false)
            return ok
          }}
        />
      )}

      <MobileNavBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "sos") {
            setShowSosModal(true)
            return
          }
          navigate(tab)
        }}
        onSOS={() => setShowSosModal(true)}
      />
    </>
  )
}

export default function MobileAgentShell(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="lg:hidden p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
          Caricamento...
        </div>
      }
    >
      <MobileAgentShellInner {...props} />
    </Suspense>
  )
}
