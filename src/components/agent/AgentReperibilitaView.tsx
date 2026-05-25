"use client"

import { ChevronLeft, ChevronRight, ShieldCheck, CalendarDays } from "lucide-react"
import OfficerDutyPanel from "./OfficerDutyPanel"
import AgentMonthShiftGrid from "./AgentMonthShiftGrid"
import { formatRepTypeLabel, getRepDaysForMonth } from "@/lib/agent-rep-utils"
import { isHoliday } from "@/utils/holidays"

type Props = {
  myShifts: any[]
  currentMonth: number
  currentYear: number
  monthNames: string[]
  isPublished?: boolean
  isUfficiale?: boolean
  onNavigateMonth: (month: number, year: number) => void
}

export default function AgentReperibilitaView({
  myShifts,
  currentMonth,
  currentYear,
  monthNames,
  isPublished = true,
  isUfficiale,
  onNavigateMonth,
}: Props) {
  const repDays = getRepDaysForMonth(myShifts, currentYear, currentMonth)
  const repCount = repDays.length

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
  dayInfo.push({
    day: 1,
    name: dayNames[nextDay1.getDay()],
    isWeekend: isHoliday(nextDay1),
    isNextMonth: true,
  })

  let repFest = 0
  let repFer = 0
  for (const r of repDays) {
    if (r.isWeekend) repFest++
    else repFer++
  }

  return (
    <div className="px-4 pb-28 space-y-5 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100">
              Reperibilità
            </p>
            <h2 className="text-xl font-black">
              {monthNames[currentMonth - 1]} {currentYear}
            </h2>
          </div>
        </div>
        <p className="text-sm font-bold text-emerald-50">
          {repCount} giorni di reperibilità · {repFer} feriali · {repFest} festivi/prefestivi
        </p>
      </div>

      {/* Ufficiali: chi chiamare oggi */}
      {(isUfficiale || repCount > 0) && (
        <OfficerDutyPanel />
      )}

      {/* Elenco giorni REP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
          Giorni di reperibilità
        </p>
        {repDays.length === 0 ? (
          <p className="text-sm text-slate-500 font-medium">Nessuna reperibilità in questo mese.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {repDays.map((r) => (
              <div
                key={r.day}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-black">
                  {r.day}
                </span>
                <div>
                  <p className="text-[10px] font-black text-slate-700 uppercase">{r.weekday}</p>
                  <p className="text-[9px] font-bold text-emerald-700">
                    {formatRepTypeLabel(r.repType)}
                    {r.shiftType ? ` · ${r.shiftType}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vista mese completa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-600" />
            <p className="text-sm font-black text-slate-800">Riepilogo mese</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigateMonth(prevMonth, prevYear)}
              className="p-2 rounded-lg bg-slate-100"
              aria-label="Mese precedente"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigateMonth(nextMonth, nextYear)}
              className="p-2 rounded-lg bg-slate-100"
              aria-label="Mese successivo"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-wider text-slate-500 mb-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Reperibilità
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-200" /> Turno/assenza
          </span>
        </div>
        <AgentMonthShiftGrid
          myShifts={myShifts}
          dayInfo={dayInfo}
          currentYear={currentYear}
          currentMonth={currentMonth}
          isPublished={isPublished}
        />
      </div>
    </div>
  )
}
