"use client"

import React from "react"
import { Copy, ClipboardPaste, GraduationCap, Radio, Shield, Car } from "lucide-react"
import toast from "react-hot-toast"

interface ServiceAgentCardProps {
  agente: { id: string; name: string; isUfficiale?: boolean; servizio?: string }
  shiftAssegnato: { 
    id: string; 
    type: string; 
    serviceCategoryId?: string | null; 
    serviceTypeId?: string | null; 
    vehicleId?: string | null; 
    radioId?: string | null;
    weaponId?: string | null;
    armorId?: string | null;
    timeRange?: string | null; 
    serviceDetails?: string | null; 
    patrolGroupId?: string | null 
  }
  isDark?: boolean
  patrolSelection: Set<string>
  togglePatrolSelect: (shiftId: string) => void
  assignService: (
    userId: string, 
    targetTypeString: string, 
    categoryId?: string | null, 
    typeId?: string | null, 
    vehicleId?: string | null, 
    radioId?: string | null,
    weaponId?: string | null,
    armorId?: string | null,
    timeRange?: string | null, 
    serviceDetails?: string | null
  ) => Promise<void>
  copyAgentConfig: (shift: any) => void
  pasteAgentConfig: (agentId: string, shiftType: string) => void
  copiedAgent: any | null
  vehicles: { id: string; name: string }[]
  radios: { id: string; name: string }[]
  weapons: { id: string; name: string }[]
  armors: { id: string; name: string }[]
  toggleLink: (shiftId: string, currentGroupId: string | null) => Promise<void>
  handleRemoveService: (userId: string, originalTimeRange: string) => void
  schools: any[]
  currentDate: Date
  users: any[]
  shifts: any[]
  handleDragStart: (e: React.DragEvent, userId: string) => void
}

export default function ServiceAgentCard({
  agente,
  shiftAssegnato,
  isDark = false,
  patrolSelection,
  togglePatrolSelect,
  assignService,
  copyAgentConfig,
  pasteAgentConfig,
  copiedAgent,
  vehicles,
  radios,
  weapons,
  armors,
  toggleLink,
  handleRemoveService,
  schools,
  currentDate,
  users,
  shifts,
  handleDragStart
}: ServiceAgentCardProps) {
  const timeRangeStr = shiftAssegnato.timeRange || (shiftAssegnato.type === "M7" ? "07:00-13:00" : shiftAssegnato.type === "M8" ? "08:00-14:00" : "14:00-20:00")

  return (
    <div 
      draggable 
      onDragStart={e => handleDragStart(e, agente.id)} 
      className={`p-2 flex flex-col hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing group/card ${patrolSelection.has(shiftAssegnato.id) ? 'bg-indigo-500/20 ring-2 ring-indigo-400' : ''}`}
    >
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mb-2 ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
        <div className="flex items-center gap-3">
          <input 
            type="checkbox"
            checked={patrolSelection.has(shiftAssegnato.id)}
            onChange={() => togglePatrolSelect(shiftAssegnato.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer shrink-0"
            title="Seleziona per pattuglia"
          />
          <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)] ${agente.isUfficiale ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
          <div className="flex flex-col">
            <span className={`text-[12px] font-black tracking-wide uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {agente.isUfficiale && <span className="text-[10px] text-blue-400 font-black mr-1">[UFF]</span>}
              {agente.name}
            </span>
            <div className="flex items-center gap-2">
              <input 
                title="Orario Turno (Modificabile)"
                type="text" 
                defaultValue={timeRangeStr}
                onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, shiftAssegnato.radioId, e.target.value, shiftAssegnato.serviceDetails)}
                className={`text-[11px] font-black bg-transparent border-none p-0 focus:ring-0 w-[70px] rounded focus:bg-white/20 ${isDark ? 'text-blue-100 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`}
                placeholder="hh:mm-hh:mm"
              />
              <div className="flex items-center gap-1">
                <input
                  title="Dettaglio / Note Servizio"
                  type="text"
                  id={`note-${agente.id}`}
                  defaultValue={shiftAssegnato.serviceDetails || agente.servizio || ""}
                  onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, shiftAssegnato.radioId, shiftAssegnato.weaponId, shiftAssegnato.armorId, timeRangeStr, e.target.value)}
                  className={`text-[10px] font-bold border px-1.5 py-0.5 rounded focus:ring-0 w-[120px] focus:bg-white transition-all ${isDark ? 'text-white bg-slate-700 border-slate-600 hover:border-blue-400' : 'text-blue-800 bg-blue-50 border-blue-200 hover:border-blue-400'}`}
                  placeholder="Es. Fiera, Piantone..."
                />
                
                <div className="flex items-center gap-1.5 ml-2">
                  {shiftAssegnato.vehicleId && (
                    <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border border-slate-200" title="Veicolo Assegnato">
                      <Car width={10} height={10} />
                      {vehicles.find(v => v.id === shiftAssegnato.vehicleId)?.name || '...'}
                    </div>
                  )}
                  {shiftAssegnato.radioId && (
                    <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border border-blue-100" title="Radio Assegnata">
                      <Radio width={10} height={10} />
                      {radios.find(r => r.id === shiftAssegnato.radioId)?.name || '...'}
                    </div>
                  )}
                  {shiftAssegnato.weaponId && (
                    <div className="flex items-center gap-1 bg-slate-800 text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border border-slate-700" title="Arma Assegnata">
                      <Shield width={10} height={10} />
                      {weapons.find(w => w.id === shiftAssegnato.weaponId)?.name || '...'}
                    </div>
                  )}
                  {shiftAssegnato.armorId && (
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight border border-emerald-200" title="GAP Assegnato">
                      <Shield width={10} height={10} />
                      {armors.find(a => a.id === shiftAssegnato.armorId)?.name || '...'}
                    </div>
                  )}
                </div>

                {schools.length > 0 && (
                  <div className="relative group/schools">
                    <button className={`p-1 rounded ${isDark ? 'text-amber-400 hover:bg-white/10' : 'text-amber-600 hover:bg-amber-50'}`} title="Abbina Scuola Manualmente">
                      <GraduationCap width={12} height={12} />
                    </button>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover/schools:block z-[100] bg-white border border-slate-200 shadow-2xl rounded-xl p-2 w-72 animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 px-1 tracking-widest border-b border-slate-50">Seleziona Plesso</p>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                        {schools.map(s => {
                          const day = currentDate.getUTCDay()
                          const sched = s.schedules.find((sc: any) => sc.dayOfWeek === day)
                          const isM = shiftAssegnato.type.startsWith("M")
                          const noteText = isM 
                            ? `${sched?.entranceTime || "07:45-08:30"} ENTRATA / ${sched?.exitTime || "13:00-14:00"} USCITA ${s.name}`
                            : `${sched?.afternoonExitTime || "14:15"} USCITA ${s.name}`

                          const assignedAgents = users.filter(usr => shifts.some(sh => sh.userId === usr.id && sh.serviceDetails?.includes(s.name)))
                          const assignedNames = assignedAgents.map(a => {
                            const parts = a.name.split(' ');
                            return parts.length > 1 ? parts[0].substring(0, 8) + '.' : a.name.substring(0, 8) + '.';
                          }).join(', ')

                          return (
                            <button 
                              key={s.id}
                              onClick={() => {
                                assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, shiftAssegnato.radioId, timeRangeStr, noteText)
                                toast.success(`Abbinato: ${s.name}`)
                              }}
                              className="w-full flex items-center justify-between text-left px-2 py-1.5 hover:bg-amber-50 rounded text-[10px] font-bold text-slate-700 transition-colors"
                            >
                              <span className="truncate">{s.name}</span>
                              {assignedNames && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded ml-2 shrink-0">{assignedNames}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => copyAgentConfig(shiftAssegnato)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Copia configurazione agente"
          >
            <Copy width={12} height={12} />
          </button>
          {copiedAgent && (
            <button
              onClick={() => pasteAgentConfig(agente.id, shiftAssegnato.type)}
              className="p-1 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors animate-pulse"
              title="Incolla configurazione copiata"
            >
              <ClipboardPaste width={12} height={12} />
            </button>
          )}

          <select 
            value={shiftAssegnato.vehicleId || ""}
            onChange={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, e.target.value, shiftAssegnato.radioId, timeRangeStr, shiftAssegnato.serviceDetails)}
            className="text-[10px] bg-slate-100 font-black px-2 py-1.5 rounded-md border border-slate-200 focus:border-blue-500 transition-all text-slate-800 max-w-[120px] truncate"
          >
            <option value="">+ Veicolo</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select 
            value={shiftAssegnato.radioId || ""}
            onChange={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, e.target.value, timeRangeStr, shiftAssegnato.serviceDetails)}
            className="text-[10px] bg-slate-100 font-black px-2 py-1.5 rounded-md border border-slate-200 focus:border-blue-500 transition-all text-slate-800 max-w-[100px] truncate"
          >
            <option value="">+ Radio</option>
            {radios.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <button 
            onClick={() => toggleLink(shiftAssegnato.id, shiftAssegnato.patrolGroupId || null)}
            className={`p-1.5 rounded-md transition-colors ${shiftAssegnato.patrolGroupId ? 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
            title={shiftAssegnato.patrolGroupId ? "Separa Pattuglia" : "Abbina ad altro membro (Crea Pattuglia)"}
          >
            <Radio width={14} height={14} className={shiftAssegnato.patrolGroupId ? 'rotate-90' : ''} />
          </button>

          <button 
            onClick={() => handleRemoveService(agente.id, shiftAssegnato.type)} 
            className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-50 hover:bg-red-50 rounded-md transition-colors font-black"
          >
            ✕
          </button>
        </div>
      </div>
      <input 
        type="text"
        defaultValue={shiftAssegnato.serviceDetails || ""}
        onBlur={(e) => assignService(agente.id, shiftAssegnato.type, shiftAssegnato.serviceCategoryId, shiftAssegnato.serviceTypeId, shiftAssegnato.vehicleId, shiftAssegnato.radioId, shiftAssegnato.timeRange, e.target.value)}
        placeholder="Inserisci dettagli servizio o zona..."
        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 outline-none"
      />
    </div>
  )
}
