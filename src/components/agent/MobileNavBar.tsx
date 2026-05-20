"use client"

import React, { useState, useEffect } from "react"
import { Home, Calendar, ClipboardList, AlertCircle, RefreshCw, Navigation, Palmtree } from "lucide-react"

interface MobileNavBarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onSOS: () => void
  loadingSOS?: boolean
}

export default function MobileNavBar({ activeTab, setActiveTab, onSOS, loadingSOS }: MobileNavBarProps) {
  const [interventionsCount, setInterventionsCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/agent/interventions")
        if (res.ok) {
          const data = await res.json()
          const active = data.filter((i: any) => i.status !== 'COMPLETED' && i.status !== 'CANCELED')
          setInterventionsCount(active.length)
        }
      } catch (e) {}
    }
    fetchCount()
    const int = setInterval(fetchCount, 10000)
    return () => clearInterval(int)
  }, [])

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'planning', label: 'Turni', icon: Calendar },
    { id: 'ferie', label: 'Ferie', icon: Palmtree },
    { id: 'interventions', label: 'Missioni', icon: Navigation, count: interventionsCount },
    { id: 'requests', label: 'Richieste', icon: ClipboardList },
    { id: 'swaps', label: 'Scambi', icon: RefreshCw },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
      {/* Container with Glass effect */}
      <div className="mx-4 mb-6 px-4 py-3 bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] rounded-[2rem] flex items-center justify-between">

        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`relative p-2 rounded-xl transition-all ${isActive ? 'bg-blue-50 text-blue-600 scale-110' : ''}`}>
                <Icon size={24} />
                {tab.count ? (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                    {tab.count}
                  </div>
                ) : null}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}

      </div>
    </nav>
  )
}
