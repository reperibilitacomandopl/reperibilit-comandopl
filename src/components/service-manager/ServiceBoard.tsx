"use client"

import React from "react"
import { Shield, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import ServiceAgentCard from "./ServiceAgentCard"

interface ServiceBoardProps {
  titolo: string
  filtroTurni: string[]
  shifts: any[]
  indisponibili: any[]
  users: any[]
  categories: any[]
  collapsedCats: Record<string, boolean>
  toggleCatCollapse: (catId: string) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDropToCategory: (e: React.DragEvent, shiftTypeRange: string, catId: string) => void
  handleDropToService: (e: React.DragEvent, shiftTypeRange: string, catId: string, typeId: string) => void
  
  // Props for ServiceAgentCard
  vehicles: any[]
  schools: any[]
  currentDate: Date
  patrolSelection: Set<string>
  togglePatrolSelect: (shiftId: string) => void
  assignService: any
  copyAgentConfig: any
  pasteAgentConfig: any
  copiedAgent: any
  toggleLink: any
  handleRemoveService: any
  handleDragStart: any
}

export default function ServiceBoard({
  titolo,
  filtroTurni,
  shifts,
  indisponibili,
  users,
  categories,
  collapsedCats,
  toggleCatCollapse,
  handleDragOver,
  handleDropToCategory,
  handleDropToService,
  vehicles,
  schools,
  currentDate,
  patrolSelection,
  togglePatrolSelect,
  assignService,
  copyAgentConfig,
  pasteAgentConfig,
  copiedAgent,
  toggleLink,
  handleRemoveService,
  handleDragStart
}: ServiceBoardProps) {
  const agentiFase = shifts.filter(s => {
    if (indisponibili.some(indisp => indisp.id === s.userId)) return false;
    return filtroTurni.some(t => s.type.startsWith(t)) && s.serviceCategoryId;
  });

  const ufficialiInServizio = agentiFase.filter(s => {
    const u = users.find(user => user.id === s.userId);
    return u?.isUfficiale;
  });

  return (
    <div className="flex-1 flex flex-col min-w-[380px]">
      <div className="bg-slate-900 border-b-2 border-blue-600 px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <span className="font-black text-white tracking-widest text-sm uppercase">{titolo}</span>
        <span className="text-[11px] text-blue-300 font-black bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
          {agentiFase.length} In Servizio
        </span>
      </div>
      
      <div className="flex-1 bg-slate-100 p-3 space-y-4 overflow-y-auto custom-scrollbar relative">
        
        {/* SEZIONE UFFICIALI DI TURNO */}
        <div className="bg-blue-900/10 border-2 border-blue-600/20 rounded-2xl overflow-hidden mb-4">
          <div className="bg-blue-700 text-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
            <Shield width={14} height={14} /> Ufficiali di Servizio ({ufficialiInServizio.length})
          </div>
          <div className="p-2 space-y-2">
            {ufficialiInServizio.map(shiftAssegnato => {
              const agente = users.find(u => u.id === shiftAssegnato.userId)
              if(!agente) return null
              return (
                <ServiceAgentCard 
                  key={agente.id}
                  agente={agente}
                  shiftAssegnato={shiftAssegnato}
                  patrolSelection={patrolSelection}
                  togglePatrolSelect={togglePatrolSelect}
                  assignService={assignService}
                  copyAgentConfig={copyAgentConfig}
                  pasteAgentConfig={pasteAgentConfig}
                  copiedAgent={copiedAgent}
                  vehicles={vehicles}
                  toggleLink={toggleLink}
                  handleRemoveService={handleRemoveService}
                  schools={schools}
                  currentDate={currentDate}
                  users={users}
                  shifts={shifts}
                  handleDragStart={handleDragStart}
                />
              )
            })}
            {ufficialiInServizio.length === 0 && (
              <div className="py-4 text-center text-slate-500 text-[11px] font-bold uppercase italic">Nessun Ufficiale Assegnato</div>
            )}
          </div>
        </div>

        {categories.length === 0 && <div className="text-center text-slate-500 text-xs font-bold italic mt-10">Nessuna Categoria Servizio Rilevata</div>}
        
        {categories.map(cat => {
          const agentiInCategoria = agentiFase.filter(s => {
            const u = users.find(user => user.id === s.userId);
            return s.serviceCategoryId === cat.id && !u?.isUfficiale;
          });
          const isCollapsed = collapsedCats[cat.id] || false
          const isEmpty = agentiInCategoria.length === 0

          return (
            <div key={cat.id} className={`bg-white rounded-xl shadow-sm border transition-all relative ${isEmpty ? 'border-red-200' : 'border-slate-200'}`}>
              <div 
                onDragOver={handleDragOver}
                onDrop={e => handleDropToCategory(e, filtroTurni[0], cat.id)}
                onClick={() => toggleCatCollapse(cat.id)}
                className={`px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between cursor-pointer transition-colors group ${isCollapsed ? 'rounded-xl' : 'rounded-t-xl'} ${isEmpty ? 'bg-red-700 text-white hover:bg-red-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                <span className="flex items-center gap-2">
                  {isEmpty && <AlertTriangle width={14} height={14} className="animate-pulse" />}
                  {cat.name}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${isEmpty ? 'bg-red-900/50 text-red-200' : 'bg-slate-700 text-slate-300'}`}>
                    {agentiInCategoria.length} agenti
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 text-[8px] bg-blue-600 px-1 inline-block rounded transition-opacity">Rilascia qui</span>
                </span>
                <span className="text-slate-400">
                  {isCollapsed ? <ChevronDown width={16} height={16} /> : <ChevronUp width={16} height={16} />}
                </span>
              </div>
              
              {!isCollapsed && (
                <div className="p-2 space-y-2">
                  
                  {/* Generico (Limbo) */}
                  {(() => {
                    const agentiGen = agentiInCategoria.filter(s => !s.serviceTypeId)
                    if (agentiGen.length === 0) return null
                    return (
                      <div className="border border-red-200 rounded-lg transition-all relative bg-red-50">
                        <div className="bg-red-100 px-3 py-2 rounded-t-lg text-xs font-black text-red-800 border-b border-red-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <AlertTriangle width={14} height={14} className="text-red-600" />
                            GENERICO (Assegna Sotto-Servizio)
                            <span className="text-[10px] font-bold text-red-500">({agentiGen.length})</span>
                          </div>
                        </div>
                        <div className="bg-white divide-y divide-red-100">
                          {agentiGen.map(shiftAssegnato => {
                            const agente = users.find(u => u.id === shiftAssegnato.userId)
                            if(!agente) return null
                            return (
                              <ServiceAgentCard 
                                key={agente.id}
                                agente={agente}
                                shiftAssegnato={shiftAssegnato}
                                patrolSelection={patrolSelection}
                                togglePatrolSelect={togglePatrolSelect}
                                assignService={assignService}
                                copyAgentConfig={copyAgentConfig}
                                pasteAgentConfig={pasteAgentConfig}
                                copiedAgent={copiedAgent}
                                vehicles={vehicles}
                                toggleLink={toggleLink}
                                handleRemoveService={handleRemoveService}
                                schools={schools}
                                currentDate={currentDate}
                                users={users}
                                shifts={shifts}
                                handleDragStart={handleDragStart}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                  {cat.types?.map((tipo: { id: string; name: string }) => {
                    const agentiInQuestoServizio = agentiFase.filter(s => {
                      const u = users.find(user => user.id === s.userId);
                      return s.serviceTypeId === tipo.id && !u?.isUfficiale;
                    });
                    
                    return (
                      <div key={tipo.id} className="border border-slate-200 rounded-lg transition-all relative">
                        <div 
                          onDragOver={handleDragOver} 
                          onDrop={e => handleDropToService(e, filtroTurni[0], cat.id, tipo.id)}
                          className="bg-slate-50 px-3 py-2 rounded-t-lg text-xs font-black text-slate-800 border-b border-slate-200 flex justify-between items-center"
                        >
                          <div className="flex items-center gap-2">
                            <Shield width={14} height={14} className="text-blue-600" />
                            {tipo.name}
                            <span className="text-[10px] font-bold text-slate-500">({agentiInQuestoServizio.length})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 italic font-bold">Trascina Agente Qui</span>
                        </div>
                        
                        <div className="bg-white divide-y divide-slate-100">
                          {(() => {
                            const renderedGroups = new Set<string>();
                            return agentiInQuestoServizio.map(shiftAssegnato => {
                              const pgId = shiftAssegnato.patrolGroupId;
                              
                              if (pgId) {
                                if (renderedGroups.has(pgId)) return null;
                                renderedGroups.add(pgId);
                                
                                const compagni = agentiInQuestoServizio.filter(s => s.patrolGroupId === pgId);
                                return (
                                  <div key={pgId} className="mx-1.5 my-2 p-1 bg-slate-800 rounded-xl shadow-inner border-2 border-slate-700 overflow-hidden">
                                    <div className="px-3 py-1 bg-slate-700/50 flex justify-between items-center mb-1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>
                                        <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Equipaggio</span>
                                      </div>
                                      <Shield width={12} height={12} className="text-slate-500" />
                                    </div>
                                    <div className="space-y-0.5">
                                      {compagni.map(c => {
                                        const a = users.find(u => u.id === c.userId);
                                        return a ? (
                                          <ServiceAgentCard 
                                            key={a.id}
                                            agente={a}
                                            shiftAssegnato={c}
                                            isDark={true}
                                            patrolSelection={patrolSelection}
                                            togglePatrolSelect={togglePatrolSelect}
                                            assignService={assignService}
                                            copyAgentConfig={copyAgentConfig}
                                            pasteAgentConfig={pasteAgentConfig}
                                            copiedAgent={copiedAgent}
                                            vehicles={vehicles}
                                            toggleLink={toggleLink}
                                            handleRemoveService={handleRemoveService}
                                            schools={schools}
                                            currentDate={currentDate}
                                            users={users}
                                            shifts={shifts}
                                            handleDragStart={handleDragStart}
                                          />
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                );
                              }

                              const agente = users.find(u => u.id === shiftAssegnato.userId);
                              return agente ? (
                                <ServiceAgentCard 
                                  key={agente.id}
                                  agente={agente}
                                  shiftAssegnato={shiftAssegnato}
                                  patrolSelection={patrolSelection}
                                  togglePatrolSelect={togglePatrolSelect}
                                  assignService={assignService}
                                  copyAgentConfig={copyAgentConfig}
                                  pasteAgentConfig={pasteAgentConfig}
                                  copiedAgent={copiedAgent}
                                  vehicles={vehicles}
                                  toggleLink={toggleLink}
                                  handleRemoveService={handleRemoveService}
                                  schools={schools}
                                  currentDate={currentDate}
                                  users={users}
                                  shifts={shifts}
                                  handleDragStart={handleDragStart}
                                />
                              ) : null;
                            });
                          })()}
                          {agentiInQuestoServizio.length === 0 && (
                            <div className="p-3 text-center text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-50 border-t border-dashed border-slate-200">
                              Nessun equipaggio
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
