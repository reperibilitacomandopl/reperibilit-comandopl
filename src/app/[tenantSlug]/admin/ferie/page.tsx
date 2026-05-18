"use client"

import { useState } from "react"
import VacationPlanner from "@/components/VacationPlanner"
import VacationRotationManager from "@/components/admin/VacationRotationManager"
import { Calendar, RefreshCw } from "lucide-react"

export default function FeriePage() {
  const [currentView, setCurrentView] = useState<"planner" | "rotation">("planner")

  return (
    <div className="space-y-6">
      
      {/* Tab select bar */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-850/80 max-w-md shadow-sm">
        <button
          onClick={() => setCurrentView("planner")}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            currentView === "planner"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
              : "text-slate-500 dark:text-slate-450 hover:bg-slate-200/50 dark:hover:bg-slate-850"
          }`}
        >
          <Calendar size={14} /> Calendario Assegnazioni
        </button>
        <button
          onClick={() => setCurrentView("rotation")}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            currentView === "rotation"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md"
              : "text-slate-500 dark:text-slate-450 hover:bg-slate-200/50 dark:hover:bg-slate-850"
          }`}
        >
          <RefreshCw size={14} /> Gestione Rotazioni
        </button>
      </div>

      <div className="pt-2 animate-in fade-in duration-300">
        {currentView === "planner" ? <VacationPlanner /> : <VacationRotationManager />}
      </div>
    </div>
  )
}
