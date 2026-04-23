import React, { useState, useMemo } from "react"
import { RefreshCw, Trash2, Calendar, X, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown, Shield } from "lucide-react"
import { useAdminState } from "./AdminStateContext"
import { isAssenza } from "@/utils/shift-logic"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"
import PlanningMobileView from "../PlanningMobileView"

interface AdminShiftGridProps {
  agents: any[]
  shifts: any[]
  isMobileView: boolean
  dayInfo: any[]
  onToggleUfficiale: (id: string) => void
  onRecalcAgent: (id: string) => void
  onSaveCell: (agentId: string, day: number, value: string, hours?: number) => Promise<void>
  sortConfig?: { field: string, direction: 'asc' | 'desc' }
  onSort?: (config: { field: string, direction: 'asc' | 'desc' }) => void
}

/* ─── MAPPA COLORI PER CODICE ─── */
const CELL_COLORS: Record<string, { bg: string; badge: string }> = {
  // Reperibilità
  "REP":   { bg: "bg-violet-100",  badge: "bg-violet-600 text-white" }, // Generata
  "rep_i": { bg: "bg-orange-100",  badge: "bg-orange-500 text-white" }, // Importata
  "rep_m": { bg: "bg-emerald-100", badge: "bg-emerald-600 text-white" }, // Manuale
  "rep":   { bg: "bg-orange-100",  badge: "bg-orange-500 text-white" }, // Legacy/Importata fallback
  // Ferie & Festività
  "FERIE":    { bg: "bg-yellow-100", badge: "bg-yellow-500 text-white" },
  "FERIE_":   { bg: "bg-yellow-100", badge: "bg-yellow-600 text-white" },
  "FERIE_AP": { bg: "bg-yellow-100", badge: "bg-yellow-600 text-white" },
  "FEST_S":   { bg: "bg-amber-100",  badge: "bg-amber-500 text-white" },
  "FEST_SOP": { bg: "bg-amber-100",  badge: "bg-amber-500 text-white" },
  "F":        { bg: "bg-yellow-100", badge: "bg-yellow-500 text-white" },
  // Blocco
  "BR": { bg: "bg-gray-200", badge: "bg-gray-800 text-white" },
  // Congedi
  "CONG_P":   { bg: "bg-pink-100", badge: "bg-pink-500 text-white" },
  "CONG_PAT": { bg: "bg-pink-100", badge: "bg-pink-500 text-white" },
  "CONG_PAR": { bg: "bg-pink-100", badge: "bg-pink-500 text-white" },
  "CONGEDO":  { bg: "bg-pink-100", badge: "bg-pink-500 text-white" },
  // Permessi
  "104":      { bg: "bg-sky-100",    badge: "bg-sky-600 text-white" },
  "104_1":    { bg: "bg-sky-100",    badge: "bg-sky-600 text-white" },
  "104_2":    { bg: "bg-sky-100",    badge: "bg-sky-600 text-white" },
  "MOT_PE":   { bg: "bg-sky-50",     badge: "bg-sky-500 text-white" },
  "MOT_PERS": { bg: "bg-sky-50",     badge: "bg-sky-500 text-white" },
  "ELETT":    { bg: "bg-sky-50",     badge: "bg-sky-500 text-white" },
  "INST_N":   { bg: "bg-sky-50",     badge: "bg-sky-400 text-white" },
  "INST_NR":  { bg: "bg-sky-50",     badge: "bg-sky-400 text-white" },
  "INST_R":   { bg: "bg-sky-50",     badge: "bg-sky-400 text-white" },
  // Malattia
  "MALATT":     { bg: "bg-red-100",  badge: "bg-red-600 text-white" },
  "MALATTIA":   { bg: "bg-red-100",  badge: "bg-red-600 text-white" },
  "MAL":        { bg: "bg-red-100",  badge: "bg-red-600 text-white" },
  "M":          { bg: "bg-red-100",  badge: "bg-red-600 text-white" },
  "MAL_FI":     { bg: "bg-red-100",  badge: "bg-red-500 text-white" },
  "MAL_FIGLIO": { bg: "bg-red-100",  badge: "bg-red-500 text-white" },
  "VISITA":     { bg: "bg-red-50",   badge: "bg-red-500 text-white" },
  "ALLATT":     { bg: "bg-red-50",   badge: "bg-red-400 text-white" },
  "DON_SA":     { bg: "bg-red-50",   badge: "bg-red-400 text-white" },
  "DON_SANGUE": { bg: "bg-red-50",   badge: "bg-red-400 text-white" },
  // Recupero
  "RR":  { bg: "bg-teal-100", badge: "bg-teal-600 text-white" },
  "RP":  { bg: "bg-teal-100", badge: "bg-teal-500 text-white" },
  "RPS": { bg: "bg-teal-100", badge: "bg-teal-500 text-white" },
  // Altro
  "CORSO":    { bg: "bg-indigo-100", badge: "bg-indigo-500 text-white" },
  "SMART":    { bg: "bg-indigo-50",  badge: "bg-indigo-500 text-white" },
  "MISSIO":   { bg: "bg-indigo-100", badge: "bg-indigo-600 text-white" },
  "MISSIONE": { bg: "bg-indigo-100", badge: "bg-indigo-600 text-white" },
}

function getCellStyle(sType: string, rType: string, isWeekend: boolean) {
  // Reperibilità ha priorità per lo stile visivo
  if (rType && rType.toLowerCase().includes("rep")) {
    let key = "REP"
    if (rType.toUpperCase().includes("REP_M")) key = "REP_M"
    if (rType.toUpperCase().includes("REP_I")) key = "REP_I"
    
    const config = CELL_COLORS[key] || CELL_COLORS["REP"]
    return {
      badge: "REP",
      bg: config.bg,
      badgeClass: config.badge,
      hasRep: true
    }
  }
  // Poi cerchiamo il codice shift
  if (sType) {
    const upper = sType.toUpperCase()
    // Cerca prima match esatto
    const match = CELL_COLORS[upper] || CELL_COLORS[sType]
    if (match) {
      // Abbrevia per badge visuale
      let label = upper
      if (label.length > 4) label = label.substring(0, 4)
      return { badge: label, bg: match.bg, badgeClass: match.badge }
    }
    // Turni mattina/pomeriggio
    if (upper.startsWith("M") && /^M\d/.test(upper)) {
      return { badge: upper, bg: "bg-blue-50", badgeClass: "bg-blue-500 text-white" }
    }
    if (upper.startsWith("P") && /^P\d/.test(upper)) {
      return { badge: upper, bg: "bg-emerald-50", badgeClass: "bg-emerald-500 text-white" }
    }
    // Generico
    return { badge: upper.substring(0, 4), bg: isWeekend ? "bg-red-50/40" : "bg-slate-50", badgeClass: "bg-slate-400 text-white" }
  }
  return { badge: "", bg: isWeekend ? "bg-red-50/30" : "", badgeClass: "" }
}

/* ─── COLORI PER CATEGORIA AGENDA ─── */
const CAT_THEME: Record<string, { border: string; bg: string; text: string; btnBg: string; btnText: string; btnHover: string }> = {
  amber:  { border: "border-yellow-300", bg: "bg-yellow-50",  text: "text-yellow-800", btnBg: "bg-yellow-500",  btnText: "text-white", btnHover: "hover:bg-yellow-600" },
  rose:   { border: "border-pink-300",   bg: "bg-pink-50",    text: "text-pink-800",   btnBg: "bg-pink-500",    btnText: "text-white", btnHover: "hover:bg-pink-600" },
  blue:   { border: "border-sky-300",    bg: "bg-sky-50",     text: "text-sky-800",    btnBg: "bg-sky-500",     btnText: "text-white", btnHover: "hover:bg-sky-600" },
  red:    { border: "border-red-300",    bg: "bg-red-50",     text: "text-red-800",    btnBg: "bg-red-500",     btnText: "text-white", btnHover: "hover:bg-red-600" },
  teal:   { border: "border-teal-300",   bg: "bg-teal-50",    text: "text-teal-800",   btnBg: "bg-teal-500",    btnText: "text-white", btnHover: "hover:bg-teal-600" },
  indigo: { border: "border-indigo-300", bg: "bg-indigo-50",  text: "text-indigo-800", btnBg: "bg-indigo-500",  btnText: "text-white", btnHover: "hover:bg-indigo-600" },
}

export default function AdminShiftGrid({
  agents, shifts, isMobileView, dayInfo,
  onToggleUfficiale, onRecalcAgent, onSaveCell,
  sortConfig, onSort
}: AdminShiftGridProps) {
  const { currentYear, currentMonth, settings, allAgents } = useAdminState()
  const [editingCell, setEditingCell] = useState<any>(null)
  const [editValue, setEditValue] = useState("")
  const [editHours, setEditHours] = useState<string>("")

  /* ─── TOTALI GIORNALIERI ─── */
  const dayStats = useMemo(() => {
    const stats: Record<number, { total: number, officers: number, agents: any[] }> = {}
    
    dayInfo.forEach(di => {
      const dKey = di.isNextMonth ? 999 : di.day
      const targetY = currentYear
      const targetM = di.isNextMonth ? (currentMonth === 12 ? 1 : currentMonth + 1) : currentMonth
      const targetD = di.day

      const repsForDay = shifts.filter(s => {
        const d = new Date(s.date)
        // Confronto robusto: deve matchare o in locale o in UTC per coprire ogni sfasamento di fuso orario
        const matchDate = (
          (d.getFullYear() === targetY && d.getMonth() + 1 === targetM && d.getDate() === targetD) ||
          (d.getUTCFullYear() === targetY && d.getUTCMonth() + 1 === targetM && d.getUTCDate() === targetD)
        )
        return matchDate && (s.repType || "").toLowerCase().includes("rep")
      })

      const presentAgents = repsForDay.map(s => {
        return allAgents.find(a => a.id === s.userId)
      }).filter(Boolean)
      
      const officers = presentAgents.filter(a => a?.isUfficiale).length
      stats[dKey] = { total: repsForDay.length, officers, agents: presentAgents }
    })
    return stats
  }, [dayInfo, shifts, allAgents, currentYear, currentMonth])

  /* ─── SORT ─── */
  const toggleSort = (field: string) => {
    if (!onSort || !sortConfig) return
    onSort(sortConfig.field === field
      ? { field, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: field === 'rep' ? 'desc' : 'asc' })
  }
  const getSortIcon = (field: string) => {
    if (sortConfig?.field !== field) return <ArrowUpDown width={10} height={10} className="opacity-30" />
    return sortConfig.direction === 'asc' ? <ChevronUp width={10} height={10} /> : <ChevronDown width={10} height={10} />
  }

  /* ─── CELL EDITOR ─── */
  // Determina se un codice è basato su ore
  const isHoursCode = (code: string): boolean => {
    for (const cat of AGENDA_CATEGORIES) {
      const item = cat.items.find(i => i.shortCode === code || i.code === code)
      if (item && item.unit === 'HOURS') return true
    }
    return false
  }

  const openCellEditor = (agentId: string, agentName: string, day: number, currentType: string) => {
    setEditingCell({ agentId, agentName, day, currentType })
    setEditValue(currentType)
    setEditHours("")
  }
  const handleSave = async (val: string, hours?: number) => {
    await onSaveCell(editingCell.agentId, editingCell.day, val, hours)
    setEditingCell(null)
    setEditHours("")
  }

  /* ─── MOBILE ─── */
  if (isMobileView) {
    return (
      <div className="pb-10">
        <PlanningMobileView
          agents={agents} shifts={shifts} dayInfo={dayInfo}
          currentYear={currentYear} currentMonth={currentMonth}
          isAdmin={true} onEditCell={openCellEditor}
        />
      </div>
    )
  }

  return (
    <div className="overflow-auto custom-scrollbar-horizontal max-h-[calc(100vh-320px)] border-b-2 border-slate-200 rounded-b-3xl" suppressHydrationWarning>
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-[50] bg-white">
          {/* ─── HEADER GIORNI ─── */}
          <tr className="border-b-2 border-slate-200">
            <th className="p-3 text-left font-black text-slate-900 w-52 min-w-[200px] sticky left-0 z-[60] bg-slate-50 border-r-2 border-slate-200 italic uppercase tracking-tighter">
              <div className="flex items-center justify-between">
                <span>Agente</span>
                <div className="flex gap-1">
                  <button onClick={() => toggleSort('name')} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${sortConfig?.field === 'name' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-400'}`}>
                    A-Z {getSortIcon('name')}
                  </button>
                  <button onClick={() => toggleSort('role')} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${sortConfig?.field === 'role' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-400'}`}>
                    U/A {getSortIcon('role')}
                  </button>
                  <button onClick={() => toggleSort('rep')} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${sortConfig?.field === 'rep' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-200 text-slate-400'}`}>
                    REP {getSortIcon('rep')}
                  </button>
                </div>
              </div>
            </th>
            {dayInfo.map(di => (
              <th key={di.isNextMonth ? `h-next-${di.day}` : `h-${di.day}`}
                className={`px-1 pt-3 pb-1 text-center font-black border-b border-slate-100 min-w-[42px] ${di.isNextMonth ? "bg-slate-100 text-slate-300 opacity-50" : (di.isWeekend ? "bg-rose-50 text-rose-600" : "bg-white text-slate-500")}`}>
                {di.isNextMonth ? '1*' : di.day}<br />
                <span className="text-[8px] opacity-70 uppercase">{di.name.substring(0, 3)}</span>
              </th>
            ))}
            <th className="px-2 pt-3 pb-1 text-center font-black bg-indigo-50 text-indigo-700 border-l-4 border-indigo-100 min-w-[40px]">FEST</th>
            <th className="px-2 pt-3 pb-1 text-center font-black bg-slate-50 text-slate-600 min-w-[40px]">FER</th>
            <th className="px-3 pt-3 pb-1 text-center font-black bg-indigo-600 text-white border-l-4 border-indigo-900 min-w-[50px]">REP</th>
          </tr>

          {/* ─── RIGA TOTALI ─── */}
          <tr className="bg-slate-900 text-white border-b border-slate-700">
            <td className="p-2.5 sticky left-0 z-[60] bg-slate-900 border-r-2 border-slate-700 font-bold text-[9px] uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Shield width={13} height={13} className="text-indigo-400" />
                <span>Copertura</span>
              </div>
            </td>
            {dayInfo.map(di => {
              const dKey = di.isNextMonth ? 999 : di.day
              const stat = dayStats[dKey] || { total: 0, officers: 0, agents: [] }
              const hasNoOfficer = stat.officers < 1
              
              let highestRankString = ""
              let topAgentId = ""
              if (hasNoOfficer && !di.isNextMonth && stat.total > 0) {
                 const sortedPresent = [...stat.agents].sort((a,b) => (a.gradoLivello || 99) - (b.gradoLivello || 99))
                 if (sortedPresent.length > 0) {
                    const topAgent = sortedPresent[0]
                    highestRankString = topAgent.qualifica ? topAgent.qualifica.substring(0, 3).toUpperCase() : "?"
                    topAgentId = topAgent.id
                 }
              }

              return (
                <td key={`stat-${dKey}`}
                  className={`text-center py-2 relative group/stat ${di.isNextMonth ? "bg-slate-800 opacity-40" : ""}`}>
                  <span className={`font-black text-xs ${stat.total >= 7 ? "text-emerald-400" : stat.total > 0 ? "text-amber-400" : "text-slate-600"}`}>
                    {stat.total}
                  </span>
                  {/* Badge del grado: SOLO SE NON CI SONO UFFICIALI e ci sono persone */}
                  {hasNoOfficer && !di.isNextMonth && stat.total > 0 && (
                    <div className="absolute top-0 right-0 -mt-2 -mr-1 z-10" title={`Responsabile più alto in grado: ${highestRankString}`}>
                       <span className="text-[7.5px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded shadow-lg border border-white/20">{highestRankString}</span>
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/stat:block z-[100] w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 pointer-events-none text-left">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-2">Reperibilità ({stat.total} - Uff: {stat.officers})</p>
                    {stat.agents.length > 0 ? stat.agents.map((a, i) => (
                      <p key={i} className="text-[10px] text-white font-bold leading-relaxed flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${a.isUfficiale ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'bg-slate-500'}`} />
                        {a.name} {hasNoOfficer && a.id === topAgentId ? <span className="text-rose-400 ml-auto font-black">[{highestRankString}]</span> : null}
                      </p>
                    )) : <p className="text-[10px] text-slate-500 italic">Nessun agente</p>}
                  </div>
                </td>
              )
            })}
            <td colSpan={3} className="bg-slate-800 border-l-4 border-slate-900"></td>
          </tr>
          {/* ─── RIGA UFFICIALI ─── */}
          <tr className="bg-slate-900 text-indigo-300 border-b-[3px] border-slate-700 font-bold uppercase text-[9px] tracking-widest">
            <td className="p-2.5 sticky left-0 z-[60] bg-slate-900 border-r-2 border-slate-700">
               Ufficiali
            </td>
            {dayInfo.map(di => {
              const dKey = di.isNextMonth ? 999 : di.day
              const stat = dayStats[dKey] || { total: 0, officers: 0, agents: [] }
              return (
                <td key={`uff-${dKey}`}
                  className={`text-center py-2 ${di.isNextMonth ? "bg-slate-800 opacity-40" : ""}`}>
                  <span className={`font-black text-xs ${stat.officers >= 1 ? "text-blue-400" : stat.total > 0 ? "text-rose-500 font-black animate-pulse" : "text-slate-700"}`}>
                    {stat.officers}
                  </span>
                </td>
              )
            })}
            <td colSpan={3} className="bg-slate-900 border-l-4 border-slate-900"></td>
          </tr>
        </thead>

        {/* ─── BODY ─── */}
        <tbody>
          {agents.length === 0 ? (
            <tr><td colSpan={dayInfo.length + 4} className="p-12 text-center text-slate-400 text-sm">NESSUN AGENTE TROVATO</td></tr>
          ) : agents.map((agent, idx) => {
            const effectiveMassimale = agent.isUfficiale ? (settings?.massimaleUfficiale ?? 6) : (settings?.massimaleAgente ?? 5)
            let repFest = 0, repFer = 0, repTotal = 0
            const repDays: number[] = []

            return (
              <tr key={agent.id} className={`group ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-blue-50 transition-colors`}>
                {/* Nome agente */}
                <td className={`px-3 py-2 sticky left-0 z-20 border-r-2 border-slate-200 whitespace-nowrap ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} group-hover:bg-blue-50`}>
                  <div className="flex items-center gap-2.5">
                    <button onClick={() => onToggleUfficiale(agent.id)}>
                      <span className={`text-[9px] rounded px-1.5 py-0.5 font-black ${agent.isUfficiale ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500 border border-slate-300"}`}>
                        {agent.isUfficiale ? "UFF" : "AGT"}
                      </span>
                    </button>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-900 tracking-tight">{agent.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-slate-400 font-semibold">{agent.matricola}</span>
                        <button onClick={(e) => { e.stopPropagation(); onRecalcAgent(agent.id); }}
                          className="p-0.5 hover:bg-indigo-100 rounded text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <RefreshCw width={9} height={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Celle giornaliere */}
                {dayInfo.map(di => {
                  const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                  const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === targetDate)
                  const sType = (shift?.type || "").toUpperCase()
                  const rType = (shift?.repType || "")

                  if (rType.toLowerCase().includes("rep") && !di.isNextMonth) {
                    repTotal++
                    repDays.push(di.day)
                    if (di.isWeekend) repFest++; else repFer++
                  }

                  const style = getCellStyle(sType, rType, di.isWeekend)
                  const hasRep = rType.toLowerCase().includes("rep")
                  // Mostra il turno base sotto REP (se diverso da RP/REP e non vuoto)
                  const baseShift = hasRep && sType && !sType.includes("REP") && sType !== "RP" ? sType : ""

                    return (
                      <td key={di.isNextMonth ? `next-${di.day}` : `day-${agent.id}-${di.day}`}
                        className={`px-0 py-0.5 text-center border-r border-slate-100/80 ${style.bg} ${di.isNextMonth ? "opacity-30 grayscale" : "cursor-pointer hover:brightness-95"}`}
                        onClick={() => !di.isNextMonth && openCellEditor(agent.id, agent.name, di.day, rType || sType)}>
                        {style.badge && (
                          <div className="flex flex-col items-center justify-center min-h-[28px] gap-0">
                            <div className={`mx-auto w-[34px] ${baseShift ? 'h-[14px] leading-[14px]' : 'h-[20px] leading-[20px]'} flex items-center justify-center rounded text-[8px] font-black shadow-sm ${style.badgeClass}`}>
                              {style.badge}
                            </div>
                            {baseShift && (
                              <span className="text-[7.5px] font-black text-slate-600 leading-tight mt-0.5 uppercase">
                                {baseShift}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    )
                })}

                {/* Totali */}
                <td className="px-1 py-1 text-center font-bold border-l-2 border-slate-200 text-purple-700 bg-purple-50/30">{repFest}</td>
                <td className="px-1 py-1 text-center font-bold text-blue-700 bg-blue-50/30">{repFer}</td>
                <td className={`px-2 py-1 text-center font-black border-l-2 border-slate-200 text-sm relative group/repcell ${repTotal > effectiveMassimale ? "text-red-700 bg-red-100" : "text-emerald-700 bg-emerald-50"}`}>
                  {repTotal}
                  {/* Tooltip con i giorni di reperibilità */}
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover/repcell:block z-[100] w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 pointer-events-none text-left">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-2">Giorni REP: {agent.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {repDays.length > 0 ? repDays.map(d => (
                        <span key={d} className="bg-slate-800 border border-slate-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-md shadow-inner">{d}</span>
                      )) : <span className="text-[10px] text-slate-500 italic">Nessun turno assegnato</span>}
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>

        {/* ─── FOOTER (Uguale a RIGA TOTALI + HEADER per scorrimento) ─── */}
        <tfoot className="sticky bottom-0 z-[50] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {/* Riga Totali Inferiore */}
          <tr className="bg-slate-900 border-t-2 border-slate-700 text-white">
            <td className="p-2.5 sticky left-0 z-[60] bg-slate-900 border-r-2 border-slate-700 font-bold text-[9px] uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Shield width={13} height={13} className="text-indigo-400" />
                <span>Copertura Totali</span>
              </div>
            </td>
            {dayInfo.map(di => {
              const dKey = di.isNextMonth ? 999 : di.day
              const stat = dayStats[dKey] || { total: 0, officers: 0, agents: [] }
              const hasNoOfficer = stat.officers < 1
              
              let highestRankString = ""
              let topAgentId = ""
              if (hasNoOfficer && !di.isNextMonth && stat.total > 0) {
                 const sortedPresent = [...stat.agents].sort((a,b) => (a.gradoLivello || 99) - (b.gradoLivello || 99))
                 if (sortedPresent.length > 0) {
                    const topAgent = sortedPresent[0]
                    highestRankString = topAgent.qualifica ? topAgent.qualifica.substring(0, 3).toUpperCase() : "?"
                    topAgentId = topAgent.id
                 }
              }

              return (
                <td key={`stat-foot-${dKey}`} className={`text-center py-1.5 relative group/stat ${di.isNextMonth ? "bg-slate-800 opacity-40" : ""}`}>
                  <span className={`font-black text-[11px] ${stat.total >= 7 ? "text-emerald-400" : stat.total > 0 ? "text-amber-400" : "text-slate-600"}`}>
                    {stat.total}
                  </span>
                  {hasNoOfficer && !di.isNextMonth && stat.total > 0 && (
                    <div className="absolute top-0 right-0 -mt-1 -mr-1 z-10" title={`Qualifica più alta: ${highestRankString}`}>
                       <span className="text-[7.5px] font-black bg-rose-500 text-white px-1 py-0.5 rounded shadow-sm">{highestRankString}</span>
                    </div>
                  )}
                  {/* Tooltip Footer (verso l'alto per non sforare) */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/stat:block z-[100] w-44 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-2.5 pointer-events-none">
                    <p className="text-[9px] font-bold text-indigo-300 uppercase mb-1.5 border-b border-slate-700 pb-1">Reperibilità ({stat.total} - Uff: {stat.officers})</p>
                    {stat.agents.length > 0 ? stat.agents.map((a, i) => (
                      <p key={i} className="text-[9px] text-white font-semibold leading-relaxed flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${a.isUfficiale ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                        {a.name} {hasNoOfficer && a.id === topAgentId ? <span className="text-rose-400 ml-auto">[{highestRankString}]</span> : null}
                      </p>
                    )) : <p className="text-[9px] text-slate-500 italic">Nessuno</p>}
                  </div>
                </td>
              )
            })}
            <td colSpan={3} className="bg-slate-800 border-l-4 border-slate-900"></td>
          </tr>
          {/* Header Giorni Inferiore */}
          <tr className="border-t-2 border-slate-200 bg-white">
            <th className="p-2 text-left font-black text-slate-900 w-52 min-w-[200px] sticky left-0 z-[60] bg-slate-50 border-r-2 border-slate-200 uppercase tracking-tighter">
              <span className="text-[9px] text-slate-400">DATA</span>
            </th>
            {dayInfo.map(di => (
              <th key={di.isNextMonth ? `f-next-${di.day}` : `f-${di.day}`}
                className={`px-1 py-1.5 text-center font-black border-r border-slate-100 min-w-[42px] ${di.isNextMonth ? "bg-slate-100 text-slate-300 opacity-50" : (di.isWeekend ? "bg-rose-50 text-rose-600" : "bg-white text-slate-500")}`}>
                {di.isNextMonth ? '1*' : di.day}<br />
                <span className="text-[8px] opacity-70 uppercase">{di.name.substring(0, 3)}</span>
              </th>
            ))}
            <th className="px-2 py-1.5 text-center font-black bg-indigo-50 text-indigo-700 border-l-4 border-indigo-100 min-w-[40px]">FEST</th>
            <th className="px-2 py-1.5 text-center font-black bg-slate-50 text-slate-600 min-w-[40px]">FER</th>
            <th className="px-3 py-1.5 text-center font-black bg-indigo-600 text-white border-l-4 border-indigo-900 min-w-[50px]">REP</th>
          </tr>
        </tfoot>
      </table>

      {/* ═══════════ MODALE MODIFICA CELLA ═══════════ */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4" onClick={() => setEditingCell(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-indigo-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Calendar width={20} height={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Modifica Turno</h3>
                  <p className="text-indigo-200 text-xs font-semibold">{editingCell.agentName} — Giorno {editingCell.day}</p>
                </div>
              </div>
              <button onClick={() => setEditingCell(null)} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-lg">
                <X width={18} height={18} />
              </button>
            </div>

            {/* Selezione Codice Rigida */}
            <div className="px-5 pt-4 pb-2">
              <div className="relative flex items-center">
                <select value={editValue} onChange={e => { setEditValue(e.target.value); setEditHours(""); }}
                  className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl pl-4 pr-20 py-3 text-sm font-bold text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none hover:bg-slate-50 cursor-pointer transition-colors"
                  autoFocus>
                  <option value="">Seleziona codice...</option>
                  <optgroup label="Tipi di Turno e Riposo">
                    {["M7", "M8", "P12", "P14", "P15", "P16", "R", "RR", "REP", "REP_I"].map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  {AGENDA_CATEGORIES.map(cat => (
                    <optgroup key={cat.group} label={`${cat.emoji} ${cat.group}`}>
                      {cat.items.map(item => (
                         <option key={item.shortCode} value={item.shortCode}>{item.shortCode} - {item.label}{item.unit === 'HOURS' ? ' (Ore)' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button onClick={() => handleSave(editValue, editHours ? parseFloat(editHours) : undefined)} disabled={!editValue || (isHoursCode(editValue) && !editHours)}
                  className="absolute right-1.5 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Salva
                </button>
              </div>

              {/* Campo Ore — visibile solo per codici basati su ore */}
              {isHoursCode(editValue) && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-teal-50 border-2 border-teal-200 rounded-xl">
                  <span className="text-[11px] font-black text-teal-700 uppercase tracking-wider whitespace-nowrap">⏱️ Quante ore?</span>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={editHours}
                    onChange={e => setEditHours(e.target.value)}
                    placeholder="Es: 2, 3.5"
                    className="flex-1 bg-white border-2 border-teal-300 rounded-lg px-3 py-2 text-sm font-bold text-teal-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-center"
                  />
                  <span className="text-[10px] font-bold text-teal-500">h</span>
                </div>
              )}
            </div>

            {/* Pulsanti rapidi turni */}
            <div className="px-5 pb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Turni Rapidi</p>
              <div className="grid grid-cols-6 gap-1.5">
                {["M7", "M8", "P12", "P14", "P15", "REP"].map(code => (
                  <button key={code} onClick={() => handleSave(code)}
                    className={`py-2 rounded-lg text-[10px] font-black transition-all border ${code === "REP"
                      ? "bg-violet-600 text-white border-violet-700 hover:bg-violet-700"
                      : code.startsWith("M")
                        ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-500 hover:text-white"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white"
                    }`}>
                    {code}
                  </button>
                ))}
              </div>
            </div>

            {/* Categorie Agenda */}
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2.5 custom-scrollbar" style={{ maxHeight: '45vh' }}>
              {AGENDA_CATEGORIES.map(cat => {
                const theme = CAT_THEME[cat.color] || CAT_THEME.indigo
                return (
                  <div key={cat.group} className={`border ${theme.border} rounded-xl overflow-hidden`}>
                    <div className={`${theme.bg} px-3 py-2 flex items-center gap-2`}>
                      <span className="text-sm">{cat.emoji}</span>
                      <span className={`text-[11px] font-bold ${theme.text} uppercase tracking-wide`}>{cat.group}</span>
                    </div>
                    <div className="p-2 bg-white grid grid-cols-2 gap-1.5">
                      {cat.items.map(item => (
                        <button key={item.shortCode} onClick={() => {
                          if (item.unit === 'HOURS') {
                            setEditValue(item.shortCode)
                            setEditHours("")
                            // Non salva subito, aspetta l'inserimento ore
                          } else {
                            handleSave(item.shortCode)
                          }
                        }}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all border border-transparent hover:border-slate-200 hover:shadow-sm group/btn`}>
                          <span className={`${theme.btnBg} ${theme.btnText} text-[8px] font-black rounded px-1.5 py-0.5 min-w-[36px] text-center whitespace-nowrap`}>
                            {item.shortCode.length > 6 ? item.shortCode.substring(0, 6) : item.shortCode}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-700 leading-tight truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer: Svuota */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
              <button onClick={() => handleSave("")}
                className="w-full py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 bg-white rounded-xl text-[11px] font-bold uppercase border border-slate-200 transition-all flex items-center justify-center gap-2">
                <Trash2 width={14} height={14} /> Svuota Turno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
