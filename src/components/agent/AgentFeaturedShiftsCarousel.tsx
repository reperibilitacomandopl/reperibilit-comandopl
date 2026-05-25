"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import NextShiftCard from "./NextShiftCard"
import { isAssenza } from "@/utils/shift-logic"

function isUpcomingServiceDay(shift: { date: string | Date; type?: string | null; repType?: string | null }): boolean {
  const hasRep = (shift.repType || "").toLowerCase().includes("rep")
  if (hasRep) return true
  if (!shift.type) return false
  return !isAssenza(shift.type)
}

type Props = {
  myShifts: any[]
  allAgents: { id: string; name: string }[]
  allShifts: any[]
  certifiedDates?: string[]
  onOpenChat?: (patrolGroupId: string) => void
  maxItems?: number
  className?: string
}

/** Carosello 3 prossimi giorni di servizio (dettaglio OdS se certificato). */
export default function AgentFeaturedShiftsCarousel({
  myShifts,
  allAgents,
  allShifts,
  certifiedDates,
  onOpenChat,
  maxItems = 3,
  className = "",
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  const featuredShifts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return myShifts
      .filter((s: any) => {
        const d = new Date(s.date)
        d.setHours(0, 0, 0, 0)
        return d >= today && isUpcomingServiceDay(s)
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, maxItems)
  }, [myShifts, maxItems])

  const safeIndex = featuredShifts.length
    ? Math.min(activeIndex, featuredShifts.length - 1)
    : 0
  const currentShift = featuredShifts[safeIndex]

  if (featuredShifts.length === 0) return null

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          Prossimi servizi
        </p>
        {featuredShifts.length > 1 && (
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
            {safeIndex + 1} / {featuredShifts.length}
          </p>
        )}
      </div>

      <div className="relative">
        <NextShiftCard
          shift={currentShift}
          allAgents={allAgents}
          allShifts={allShifts}
          certifiedDates={certifiedDates}
          onOpenChat={onOpenChat}
        />

        {featuredShifts.length > 1 && (
          <>
            <div className="absolute top-1/2 -translate-y-1/2 -left-1 flex justify-between w-[calc(100%+0.5rem)] pointer-events-none z-20">
              <button
                type="button"
                aria-label="Servizio precedente"
                onClick={() =>
                  setActiveIndex((prev) =>
                    prev > 0 ? prev - 1 : featuredShifts.length - 1
                  )
                }
                className="w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-900 pointer-events-auto active:scale-90 border border-slate-200"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Servizio successivo"
                onClick={() =>
                  setActiveIndex((prev) =>
                    prev < featuredShifts.length - 1 ? prev + 1 : 0
                  )
                }
                className="w-9 h-9 bg-white shadow-lg rounded-full flex items-center justify-center text-slate-900 pointer-events-auto active:scale-90 border border-slate-200 ml-auto"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {featuredShifts.map((s: any, i: number) => {
                const d = new Date(s.date)
                const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`
                const certified = certifiedDates?.includes(
                  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
                )
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={`Giorno ${d.getUTCDate()}`}
                    onClick={() => setActiveIndex(i)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                      i === safeIndex ? "bg-blue-50" : ""
                    }`}
                  >
                    <span
                      className={`h-1.5 rounded-full transition-all ${
                        i === safeIndex ? "w-6 bg-blue-600" : "w-1.5 bg-slate-300"
                      }`}
                    />
                    <span className="text-[9px] font-black text-slate-500">{d.getUTCDate()}</span>
                    {certified && (
                      <span className="text-[7px] font-black text-emerald-600 uppercase">OdS</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
