"use client"

import React from "react"
import { Home, Calendar, ClipboardList, AlertCircle, RefreshCw } from "lucide-react"

interface MobileNavBarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onSOS: () => void
  loadingSOS?: boolean
}

export default function MobileNavBar({ activeTab, setActiveTab, onSOS, loadingSOS }: MobileNavBarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'planning', label: 'Turni', icon: Calendar },
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
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-blue-50 text-blue-600 scale-110' : ''}`}>
                <Icon size={24} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}

        {/* SOS Button inside Nav bar (Optional, or separate) */}
        <button
          onClick={onSOS}
          disabled={loadingSOS}
          className={`flex flex-col items-center gap-1 transition-all ${loadingSOS ? 'opacity-50' : 'text-red-500'}`}
        >
          <div className={`p-2 rounded-xl bg-red-50 text-red-600 transition-all active:scale-90 ${loadingSOS ? 'animate-pulse' : ''}`}>
            {loadingSOS ? <RefreshCw size={24} className="animate-spin" /> : <AlertCircle size={24} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter opacity-100">
            SOS
          </span>
        </button>
      </div>
    </nav>
  )
}
