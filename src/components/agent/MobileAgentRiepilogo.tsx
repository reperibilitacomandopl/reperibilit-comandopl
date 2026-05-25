"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock, RefreshCw, Shield, CalendarDays, ChevronLeft, ChevronRight, Fingerprint } from "lucide-react"
import NextShiftCard from "./NextShiftCard"
import { isAssenza } from "@/utils/shift-logic"

type Props = {
  currentUser: {
    id: string
    name: string
    matricola?: string
    gpsConsent?: boolean
  }
  tenantSlug: string
  currentMonth: number
  currentYear: number
  monthNames: string[]
  shifts: any[]
  myShifts: any[]
  allAgents: { id: string; name: string }[]
  certifiedDates?: string[]
  isClockedIn: "IN" | "OUT" | null
  lastClockTime: string | null
  clockLoading: boolean
  handleClockAction: (type: "IN" | "OUT") => Promise<unknown>
  onBadgeClock: () => Promise<void>
  onNavigateMonth: (month: number, year: number, view?: string) => void
  onNavigate: (view: string) => void
  onSos: () => void
  onGpsConsentRequired: () => void
}

export default function MobileAgentRiepilogo({
  currentUser,
  currentMonth,
  currentYear,
  monthNames,
  shifts,
  myShifts,
  allAgents,
  certifiedDates,
  isClockedIn,
  lastClockTime,
  clockLoading,
  handleClockAction,
  onBadgeClock,
  onNavigateMonth,
  onNavigate,
  onSos,
  onGpsConsentRequired,
}: Props) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeShiftIndex, setActiveShiftIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const repCount = myShifts.filter((s: any) =>
    (s.repType || "").toLowerCase().includes("rep")
  ).length

  const featuredShifts = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return myShifts
      .filter((s: any) => {
        const d = new Date(s.date)
        d.setHours(0, 0, 0, 0)
        return d >= now && !isAssenza(s.type)
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3)
  }, [myShifts])

  const currentShift = featuredShifts[activeShiftIndex] || featuredShifts[0]

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  const onClockIn = () => {
    if (!currentUser.gpsConsent) {
      onGpsConsentRequired()
      return
    }
    void handleClockAction("IN")
  }

  return (
    <section id="riepilogo-operativo" className="px-4 pt-2 pb-4 space-y-4 scroll-mt-24">
      <div className="bg-[#0f172a] text-white rounded-3xl p-5 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-1">
              Riepilogo operativo
            </p>
            <h2 className="text-xl font-black tracking-tight">
              Ciao, {currentUser.name?.split(" ")[0]} 👋
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {monthNames[currentMonth - 1]} {currentYear} · {repCount} reperibilità
            </p>
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 rounded-xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Ora</span>
            <span className="text-lg font-black font-mono">
              {currentTime.toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {isClockedIn === "IN" && (
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-emerald-300">In servizio</p>
                {lastClockTime && (
                  <p className="text-[10px] text-emerald-100/80 font-bold">Dalle ore {lastClockTime}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleClockAction("OUT")}
                disabled={clockLoading}
                className="shrink-0 bg-white text-emerald-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 disabled:opacity-50"
              >
                {clockLoading ? <RefreshCw size={14} className="animate-spin" /> : "Fine turno"}
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={clockLoading}
            onClick={() => void onBadgeClock()}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-black uppercase tracking-wide shadow-lg shadow-blue-900/40 active:scale-[0.98] disabled:opacity-60"
          >
            {clockLoading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <Fingerprint size={22} />
            )}
            {clockLoading
              ? "Timbratura..."
              : isClockedIn === "IN"
                ? "Timbra uscita (tag NFC)"
                : "Timbra entrata (tag NFC)"}
          </button>

          <p className="text-[9px] text-center text-white/40 font-bold uppercase tracking-widest">
            Stessa logica del tag NFC — alterna entrata/uscita automaticamente
          </p>

          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              type="button"
              disabled={clockLoading || isClockedIn === "IN"}
              onClick={onClockIn}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
                isClockedIn === "IN"
                  ? "bg-white/5 text-white/30"
                  : !currentUser.gpsConsent
                    ? "bg-amber-500/30 text-amber-200"
                    : "bg-white/10 text-white border border-white/10 active:scale-95"
              }`}
            >
              Entra manuale
            </button>
            <button
              type="button"
              disabled={clockLoading || isClockedIn !== "IN"}
              onClick={() => void handleClockAction("OUT")}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
                isClockedIn !== "IN"
                  ? "bg-white/5 text-white/30"
                  : "bg-white/10 text-white border border-white/10 active:scale-95"
              }`}
            >
              Esci manuale
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateMonth(prevMonth, prevYear, "dashboard")}
              className="p-2 rounded-xl bg-white/5 border border-white/10"
              aria-label="Mese precedente"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 text-center text-[10px] font-black uppercase tracking-widest">
              {monthNames[currentMonth - 1]} <span className="text-cyan-400">{currentYear}</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateMonth(nextMonth, nextYear, "dashboard")}
              className="p-2 rounded-xl bg-white/5 border border-white/10"
              aria-label="Mese successivo"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Reperibilità mese</p>
              <p className="text-3xl font-black">{repCount}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("swaps")}
              className="px-4 py-2 rounded-xl bg-white/10 text-[10px] font-black uppercase tracking-wide border border-white/10"
            >
              Scambi
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onSos}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-wide active:scale-95"
            >
              <Shield size={16} /> SOS
            </button>
            <button
              type="button"
              onClick={() => onNavigate("planning")}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wide"
            >
              <CalendarDays size={16} /> Turni
            </button>
          </div>
        </div>
      </div>

      {currentShift ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Prossimo impegno
          </p>
          <NextShiftCard
            shift={currentShift}
            allAgents={allAgents}
            allShifts={shifts}
            certifiedDates={certifiedDates}
          />
          {featuredShifts.length > 1 && (
            <div className="flex justify-center gap-1.5">
              {featuredShifts.map((_: any, i: number) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Turno ${i + 1}`}
                  onClick={() => setActiveShiftIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeShiftIndex ? "w-6 bg-blue-600" : "w-1.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <Clock className="mx-auto text-slate-300 mb-2" size={28} />
          <p className="text-sm font-bold text-slate-600">Nessun turno imminente</p>
          <button
            type="button"
            onClick={() => onNavigate("planning")}
            className="mt-3 text-[10px] font-black uppercase text-blue-600 tracking-widest"
          >
            Apri pianificazione
          </button>
        </div>
      )}
    </section>
  )
}
