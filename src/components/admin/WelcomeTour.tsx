"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, CheckCircle2, Circle, Sparkles } from "lucide-react"

interface WelcomeTourProps {
  tenantSlug?: string
  hasAgents: boolean
  hasGroups: boolean
  hasSchools: boolean
  hasCategories: boolean
  hasPecConfig: boolean
}

const TOUR_STORAGE_KEY = "sentinel_tour_completed"

export default function WelcomeTour({ 
  tenantSlug, hasAgents, hasGroups, hasSchools, hasCategories, hasPecConfig 
}: WelcomeTourProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!completed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(TOUR_STORAGE_KEY, "true")
    setIsVisible(false)
  }

  if (!isVisible || dismissed) return null

  const checklist = [
    { label: "Agenti importati nel sistema", done: hasAgents },
    { label: "Squadre/Turni configurati", done: hasGroups },
    { label: "Plessi scolastici inseriti", done: hasSchools },
    { label: "Categorie servizi definite", done: hasCategories },
    { label: "Email PEC configurata", done: hasPecConfig },
  ]

  const completedCount = checklist.filter(c => c.done).length
  const completionPct = Math.round((completedCount / checklist.length) * 100)

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] p-6 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden mb-6 animate-in slide-in-from-top-4 duration-500">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Sparkles size={24} className="text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Benvenuto in Sentinel! 🚀</h3>
              <p className="text-blue-200 text-[11px] font-bold uppercase tracking-widest">Configura il tuo Comando</p>
            </div>
          </div>
          <button 
            onClick={handleDismiss}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            title="Chiudi e non mostrare più"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Completamento</span>
            <span className="text-sm font-black">{completionPct}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${completionPct}%` }}
            ></div>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          {checklist.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${item.done ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
              {item.done ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              ) : (
                <Circle size={18} className="text-white/30 shrink-0" />
              )}
              <span className={`text-sm font-bold ${item.done ? 'text-emerald-200 line-through opacity-70' : 'text-white'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {completionPct < 100 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">
              {5 - completedCount} passaggi rimanenti
            </p>
            <button 
              onClick={handleDismiss}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Nascondi <ChevronRight size={14} />
            </button>
          </div>
        )}

        {completionPct === 100 && (
          <div className="mt-5 text-center">
            <p className="text-emerald-300 font-black text-sm mb-3">🎉 Configurazione Completa!</p>
            <button 
              onClick={handleDismiss}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
            >
              Inizia ad usare Sentinel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
