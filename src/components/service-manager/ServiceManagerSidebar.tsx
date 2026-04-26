"use client"

import React from "react"
import { PanelLeftClose, PanelLeft, ChevronDown, ChevronUp, GripVertical, CheckCircle } from "lucide-react"
import ServiceAgentCard from "./ServiceAgentCard"

interface ServiceManagerSidebarProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  disponibiliNonAssegnati: any[]
  indisponibili: any[]
  collapsedADisposizione: boolean
  setCollapsedADisposizione: (collapsed: boolean) => void
  collapsedFuoriServizio: boolean
  setCollapsedFuoriServizio: (collapsed: boolean) => void
  handleDropToSidebar: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  
  // Props for ServiceAgentCard
  shifts: any[]
  patrolSelection: Set<string>
  togglePatrolSelect: (shiftId: string) => void
  assignService: any
  copyAgentConfig: any
  pasteAgentConfig: any
  copiedAgent: any
  vehicles: any[]
  radios: any[]
  toggleLink: any
  handleRemoveService: any
  schools: any[]
  currentDate: Date
  users: any[]
  handleDragStart: any
}

export default function ServiceManagerSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  disponibiliNonAssegnati,
  indisponibili,
  collapsedADisposizione,
  setCollapsedADisposizione,
  collapsedFuoriServizio,
  setCollapsedFuoriServizio,
  handleDropToSidebar,
  handleDragOver,
  shifts,
  patrolSelection,
  togglePatrolSelect,
  assignService,
  copyAgentConfig,
  pasteAgentConfig,
  copiedAgent,
  vehicles,
  radios,
  toggleLink,
  handleRemoveService,
  schools,
  currentDate,
  users,
  handleDragStart
}: ServiceManagerSidebarProps) {
  return (
    <div 
      className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 relative z-10 shadow-2xl ${sidebarCollapsed ? 'w-12' : 'w-72 sm:w-80'}`}
      onDragOver={handleDragOver}
      onDrop={handleDropToSidebar}
    >
      {/* TOGGLE BUTTON */}
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-20 bg-blue-600 text-white p-1 rounded-full shadow-lg z-20 hover:bg-blue-500 transition-colors"
      >
        {sidebarCollapsed ? <PanelLeft width={14} height={14} /> : <PanelLeftClose width={14} height={14} />}
      </button>

      {!sidebarCollapsed && (
        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
            <h2 className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Risorse Disponibili</h2>
            <div className="px-2 py-0.5 bg-blue-900/30 border border-blue-800 rounded-full text-[10px] font-black text-blue-300">
              {disponibiliNonAssegnati.length}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
            
            {/* AGENTI A DISPOSIZIONE */}
            <div>
              <button 
                onClick={() => setCollapsedADisposizione(!collapsedADisposizione)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg transition-colors group mb-1"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">A Disposizione</span>
                {collapsedADisposizione ? <ChevronDown className="text-slate-600" width={14} height={14} /> : <ChevronUp className="text-slate-600" width={14} height={14} />}
              </button>
              
              {!collapsedADisposizione && (
                <div className="space-y-1">
                  {disponibiliNonAssegnati.map(u => {
                    const shift = shifts.find(s => s.userId === u.id)
                    if (!shift) return null
                    return (
                      <div key={u.id} className="relative group">
                         <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="text-slate-600" width={14} height={14} />
                         </div>
                         <ServiceAgentCard 
                            agente={u}
                            shiftAssegnato={shift}
                            isDark={true}
                            patrolSelection={patrolSelection}
                            togglePatrolSelect={togglePatrolSelect}
                            assignService={assignService}
                            copyAgentConfig={copyAgentConfig}
                            pasteAgentConfig={pasteAgentConfig}
                            copiedAgent={copiedAgent}
                            vehicles={vehicles}
                            radios={radios}
                            toggleLink={toggleLink}
                            handleRemoveService={handleRemoveService}
                            schools={schools}
                            currentDate={currentDate}
                            users={users}
                            shifts={shifts}
                            handleDragStart={handleDragStart}
                         />
                      </div>
                    )
                  })}
                  {disponibiliNonAssegnati.length === 0 && (
                    <div className="text-center py-10 px-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl animate-in fade-in zoom-in-95 duration-500">
                      <CheckCircle className="mx-auto text-emerald-500 mb-2 opacity-50" width={32} height={32} />
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tutti operativi</p>
                      <p className="text-[9px] text-emerald-600 font-bold uppercase mt-1">Copertura totale OdS</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AREA FUORI SERVIZIO / ASSENTI */}
            <div>
              <button 
                onClick={() => setCollapsedFuoriServizio(!collapsedFuoriServizio)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg transition-colors group mb-1"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-rose-400 transition-colors">Fuori Servizio</span>
                {collapsedFuoriServizio ? <ChevronDown className="text-slate-600" width={14} height={14} /> : <ChevronUp className="text-slate-600" width={14} height={14} />}
              </button>
              
              {!collapsedFuoriServizio && (
                <div className="space-y-1 bg-rose-950/10 rounded-xl p-1 border border-rose-900/10">
                  {indisponibili.map(u => (
                    <div key={u.id} className="p-2 border border-slate-800/50 bg-slate-900/50 rounded-lg flex items-center justify-between opacity-60">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-300 uppercase">{u.name}</span>
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">
                          {shifts.find(s => s.userId === u.id)?.type || "ASSENTE"}
                        </span>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shadow-[0_0_5px_rgba(225,29,72,0.4)]"></div>
                    </div>
                  ))}
                  {indisponibili.length === 0 && (
                    <div className="text-center py-4 text-[9px] font-bold text-slate-700 uppercase">Nessuna assenza oggi</div>
                  )}
                </div>
              )}
            </div>

          </div>
          
          {/* DRAG TARGET INFO */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
             <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Rilascia qui un agente</div>
             <p className="text-[10px] text-slate-600 leading-tight">Per rimuoverlo dal servizio attivo e riportarlo in disponibilità.</p>
          </div>
        </div>
      )}

      {sidebarCollapsed && (
        <div className="flex-1 flex flex-col items-center py-6 space-y-8">
           <div className="text-blue-500 font-black text-xs vertical-text tracking-widest uppercase">DISPONIBILI</div>
           <div className="w-6 h-6 rounded-full bg-blue-900/30 border border-blue-800 flex items-center justify-center text-[10px] font-black text-blue-400">
             {disponibiliNonAssegnati.length}
           </div>
        </div>
      )}
    </div>
  )
}
