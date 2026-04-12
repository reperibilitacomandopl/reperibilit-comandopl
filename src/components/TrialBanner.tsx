"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X, Clock, Zap } from "lucide-react"

interface TrialBannerProps {
  trialEndsAt: string | null
  planType: string
}

export default function TrialBanner({ trialEndsAt, planType }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!trialEndsAt || planType !== "TRIAL") return
    const end = new Date(trialEndsAt)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    setDaysLeft(diff)
  }, [trialEndsAt, planType])

  if (dismissed || planType !== "TRIAL" || daysLeft === null) return null

  const isExpired = daysLeft <= 0
  const isUrgent = daysLeft <= 7

  if (isExpired) {
    return (
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white px-6 py-3 flex items-center justify-center gap-3 text-sm font-bold shadow-lg relative z-50">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Il tuo periodo di prova è <strong>scaduto</strong>. Le operazioni di modifica sono bloccate.</span>
        <a href="mailto:info@sentinel-pl.it" className="px-4 py-1.5 bg-white text-rose-700 rounded-lg text-xs font-black hover:bg-rose-50 transition-colors ml-2">
          Contattaci per Attivare
        </a>
      </div>
    )
  }

  if (isUrgent) {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 flex items-center justify-center gap-3 text-sm font-bold relative z-50">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Il tuo trial scade tra <strong>{daysLeft} giorni</strong>.</span>
        <a href="mailto:info@sentinel-pl.it" className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg text-xs font-black hover:bg-white/30 transition-colors">
          Passa al Piano Pro
        </a>
        <button onClick={() => setDismissed(true)} className="ml-2 p-1 hover:bg-white/20 rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  // Non-urgent: subtle banner
  return (
    <div className="bg-blue-600/90 text-white px-6 py-2 flex items-center justify-center gap-2 text-xs font-semibold relative z-50">
      <Zap className="w-3 h-3" />
      <span>Trial attivo — {daysLeft} giorni rimanenti</span>
      <button onClick={() => setDismissed(true)} className="ml-2 p-0.5 hover:bg-white/20 rounded transition-colors">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
