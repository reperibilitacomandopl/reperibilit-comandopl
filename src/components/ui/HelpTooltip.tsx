"use client"

import { useState } from "react"
import { HelpCircle, X } from "lucide-react"

interface HelpTooltipProps {
  text: string
  /** Shows inline or as floating popup */
  position?: "top" | "bottom" | "left" | "right"
  /** Optional title for the tooltip */
  title?: string
}

export default function HelpTooltip({ text, position = "top", title }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2"
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors rounded-full hover:bg-blue-50"
        type="button"
        aria-label="Aiuto"
      >
        <HelpCircle size={14} />
      </button>

      {isOpen && (
        <div className={`absolute z-[200] ${positionClasses[position]} animate-in fade-in zoom-in-95 duration-150`}>
          <div className="bg-slate-900 text-white rounded-xl p-3 shadow-2xl border border-slate-700 w-64 max-w-[80vw]">
            {title && (
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{title}</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
