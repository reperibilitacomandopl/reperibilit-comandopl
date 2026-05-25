"use client"

import type { ReactNode } from "react"
import { isMalattia } from "@/utils/shift-logic"

type DayInfo = {
  day: number
  name: string
  isWeekend: boolean
  isNextMonth?: boolean
}

type Props = {
  myShifts: any[]
  dayInfo: DayInfo[]
  currentYear: number
  currentMonth: number
  isPublished?: boolean
  compact?: boolean
  onDayClick?: (day: number) => void
}

export default function AgentMonthShiftGrid({
  myShifts,
  dayInfo,
  currentYear,
  currentMonth,
  isPublished = true,
  compact = false,
  onDayClick,
}: Props) {
  if (!isPublished) {
    return (
      <p className="text-sm text-amber-700 font-bold text-center py-8">
        Turni del mese non ancora pubblicati dall&apos;amministratore.
      </p>
    )
  }

  const cellH = compact ? "h-12" : "h-16 sm:h-20"

  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
      {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((dn) => (
        <div
          key={dn}
          className={`text-center text-[9px] font-black uppercase tracking-widest py-1 ${
            dn === "Sab" || dn === "Dom" ? "text-red-400" : "text-slate-400"
          }`}
        >
          {compact ? dn.charAt(0) : dn}
        </div>
      ))}

      {(() => {
        const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
        const offset = firstDay === 0 ? 6 : firstDay - 1
        return Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} className={cellH} />
        ))
      })()}

      {dayInfo.map((di) => {
        const targetDate = new Date(
          Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)
        ).toISOString()
        const sObj = myShifts.find((s: any) => new Date(s.date).toISOString() === targetDate)
        const sType = (sObj?.type || "").toUpperCase()
        const rType = (sObj?.repType || "").toUpperCase()
        const isRep = rType.includes("REP")
        const isToday =
          !di.isNextMonth &&
          new Date().getDate() === di.day &&
          new Date().getMonth() === currentMonth - 1 &&
          new Date().getFullYear() === currentYear

        let cellBg = "bg-white"
        let borderStyle = "border border-slate-100"
        let badgeEl: ReactNode = null

        if (isRep) {
          cellBg = "bg-emerald-50"
          borderStyle = "border-2 border-emerald-500"
          badgeEl = (
            <span className="text-[7px] sm:text-[8px] font-black bg-emerald-600 text-white rounded px-1">
              REP
            </span>
          )
        } else if (sType) {
          badgeEl = (
            <span className="text-[7px] font-bold text-slate-500 truncate max-w-full">
              {sType.length > 6 ? sType.slice(0, 5) : sType}
            </span>
          )
          if (isMalattia(sType)) {
            cellBg = "bg-blue-50"
          }
        }

        if (di.isWeekend && !isRep) {
          cellBg = "bg-red-50/50"
        }
        if (isToday) {
          borderStyle = isRep ? borderStyle : "border-2 border-blue-500"
        }

        return (
          <button
            key={di.isNextMonth ? `next-${di.day}` : `day-${di.day}`}
            type="button"
            disabled={!!di.isNextMonth}
            onClick={() => !di.isNextMonth && onDayClick?.(di.day)}
            className={`relative rounded-lg p-1 flex flex-col items-center justify-center transition-all ${cellH} ${
              di.isNextMonth
                ? "bg-slate-100 opacity-40 cursor-not-allowed"
                : `${cellBg} ${borderStyle} ${onDayClick ? "active:scale-95" : ""}`
            }`}
          >
            {isToday && !di.isNextMonth && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
            <span
              className={`text-xs font-black ${di.isNextMonth ? "text-slate-300" : di.isWeekend ? "text-red-500" : "text-slate-800"}`}
            >
              {di.day}
            </span>
            {!compact && (
              <span className="text-[7px] font-bold text-slate-400 uppercase">{di.name}</span>
            )}
            {badgeEl}
          </button>
        )
      })}
    </div>
  )
}
