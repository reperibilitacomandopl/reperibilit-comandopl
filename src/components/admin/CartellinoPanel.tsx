"use client"

import { useState, useEffect, useMemo } from "react"
import { format, getDaysInMonth } from "date-fns"
import { it } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Edit2, AlertCircle, CheckCircle2, RefreshCcw, Download, User, Info, X, LayoutDashboard, ListTodo } from "lucide-react"
import { AGENDA_CATEGORIES, getLabel } from "@/utils/agenda-codes"
import CartellinoSummaryView from "@/components/shared/CartellinoSummaryView"
import { toast } from "react-hot-toast"

const CAT_THEME: Record<string, { border: string; bg: string; text: string; btnBg: string; btnText: string; btnHover: string }> = {
  amber:  { border: "border-yellow-300", bg: "bg-yellow-50",  text: "text-yellow-800", btnBg: "bg-yellow-500",  btnText: "text-white", btnHover: "hover:bg-yellow-600" },
  rose:   { border: "border-pink-300",   bg: "bg-pink-50",    text: "text-pink-800",   btnBg: "bg-pink-500",    btnText: "text-white", btnHover: "hover:bg-pink-600" },
  blue:   { border: "border-sky-300",    bg: "bg-sky-50",     text: "text-sky-800",    btnBg: "bg-sky-500",     btnText: "text-white", btnHover: "hover:bg-sky-600" },
  red:    { border: "border-red-300",    bg: "bg-red-50",     text: "text-red-800",    btnBg: "bg-red-500",     btnText: "text-white", btnHover: "hover:bg-red-600" },
  teal:   { border: "border-teal-300",   bg: "bg-teal-50",    text: "text-teal-800",   btnBg: "bg-teal-500",    btnText: "text-white", btnHover: "hover:bg-teal-600" },
  indigo: { border: "border-indigo-300", bg: "bg-indigo-50",  text: "text-indigo-800", btnBg: "bg-indigo-500",  btnText: "text-white", btnHover: "hover:bg-indigo-600" },
}

export default function CartellinoPanel() {
  const [agents, setAgents] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [rotationGroups, setRotationGroups] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'REGISTRO' | 'RIEPILOGO'>('REGISTRO')
  
  const allAvailableShiftCodes = useMemo(() => {
    const baseCodes = ["M7", "M8", "P12", "P14", "P15", "P16", "R", "RR", "REP", "REP_I"];
    const customCodes = new Set<string>();
    rotationGroups.forEach(g => {
      try {
         const data = JSON.parse(g.pattern);
         if (Array.isArray(data)) {
           data.forEach((c: string) => customCodes.add(c));
         } else {
           const seq = data.sequence || [];
           seq.forEach((c: string) => customCodes.add(c));
           const times = data.shiftTimes || {};
           Object.keys(times).forEach((c: string) => customCodes.add(c));
           const enabled = data.enabledCodes || [];
           enabled.forEach((c: string) => customCodes.add(c));
           const customs = data.customCodes || [];
           customs.forEach((c: any) => customCodes.add(c.code));
         }
      } catch {}
    });
    return Array.from(new Set([...baseCodes, ...Array.from(customCodes)])).sort();
  }, [rotationGroups]);
  
  // --- STATO MODALE ---
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{userId: string, dateStr: string, day: number} | null>(null)
  const [detailData, setDetailData] = useState<{type: string, overtimeHours: number, note: string, clocks: any[]}>({type: "", overtimeHours: 0, note: "", clocks: []})
  const [savingDetail, setSavingDetail] = useState(false)

  useEffect(() => {
    fetchAgents()
    fetchRotationGroups()
  }, [])

  async function fetchRotationGroups() {
    try {
      const res = await fetch("/api/admin/rotation-groups")
      const data = await res.json()
      if (Array.isArray(data)) setRotationGroups(data)
    } catch {}
  }

  useEffect(() => {
    if (selectedUserId) {
      fetchCartellinoData()
    }
  }, [selectedUserId, month, year])

  async function fetchAgents() {
    try {
      const res = await fetch("/api/admin/cartellino")
      const json = await res.json()
      if (json.agents) {
        setAgents(json.agents)
        if (json.agents.length > 0) setSelectedUserId(json.agents[0].id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function fetchCartellinoData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cartellino?userId=${selectedUserId}&month=${month}&year=${year}&t=${Date.now()}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const openDetailModal = (day: number, primaryShift: any, clocks: any[]) => {
    const dateObj = new Date(Date.UTC(year, month - 1, day))
    const dateStr = dateObj.toISOString().split('T')[0]
    
    setSelectedCell({ userId: selectedUserId, dateStr, day })
    setDetailData({
      type: primaryShift?.type || "",
      overtimeHours: primaryShift?.overtimeHours || 0,
      note: primaryShift?.serviceDetails || "",
      clocks: clocks ? [...clocks] : []
    })
    setDetailModalOpen(true)
  }

  const saveDetailModal = async () => {
    if (!selectedCell) return
    setSavingDetail(true)
    
    try {
      const [resShifts, resClocks] = await Promise.all([
        fetch("/api/admin/shifts/monthly", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
             updates: [{ 
                userId: selectedCell.userId, 
                date: selectedCell.dateStr, 
                type: detailData.type,
                overtimeHours: detailData.overtimeHours,
                serviceDetails: detailData.note
             }] 
          })
        }),
        fetch("/api/admin/clock-records", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedCell.userId,
            date: selectedCell.dateStr,
            clocks: detailData.clocks
          })
        })
      ])
      if (!resShifts.ok || !resClocks.ok) throw new Error("Errore API")
      setDetailModalOpen(false)
      fetchCartellinoData() // Refresh data
    } catch (e) {
      alert("Errore durante il salvataggio dei dettagli")
    } finally {
      setSavingDetail(false)
    }
  }

  const handleRequestAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED' })
      })
      if (!res.ok) throw new Error("Errore API")
      toast.success(action === 'APPROVE' ? "Richiesta Approvata" : "Richiesta Rifiutata")
      fetchCartellinoData() // Refresh per aggiornare tabella e riepilogo
    } catch (e) {
      toast.error("Impossibile processare la richiesta")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-md p-5 rounded-2xl border border-slate-700/50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <User className="text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Cartellino Presenze</h2>
            <p className="text-sm text-slate-400">Gestione orari, straordinari e giustificativi</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.matricola})</option>
            ))}
          </select>

          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {format(new Date(2020, i, 1), "MMMM", { locale: it }).toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex p-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-fit">
        <button 
          onClick={() => setActiveTab('REGISTRO')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'REGISTRO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <LayoutDashboard size={16} />
          Registro Presenze
        </button>
        <button 
          onClick={() => setActiveTab('RIEPILOGO')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'RIEPILOGO' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <ListTodo size={16} />
          Richieste & Saldi
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <RefreshCcw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : !data ? null : activeTab === 'RIEPILOGO' ? (
        <CartellinoSummaryView 
          requests={data.requests}
          balances={data.balances}
          mode="ADMIN"
          onAction={handleRequestAction}
          isLoading={loading}
        />
      ) : (
        <>
          {/* Dashboard Saldi */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CalendarIcon size={64} />
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Ferie Residue ({year})</h3>
              <p className="text-3xl font-bold text-white">
                {Math.max(0, (data.balances?.details?.find((d: any) => d.code === "FERIE")?.initialValue || 0) - (data.yearlyStats?.usedFerie || 0))} <span className="text-lg font-normal text-slate-500">gg</span>
              </p>
            </div>
            
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock size={64} />
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Straordinari Mensili</h3>
              <p className="text-3xl font-bold text-emerald-400">
                {data.shifts.reduce((acc: number, s: any) => acc + (s.overtimeHours || 0), 0)} <span className="text-lg font-normal text-slate-500">ore</span>
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <AlertCircle size={64} />
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Malattia Anno</h3>
              <p className="text-3xl font-bold text-rose-400">
                {data.yearlyStats?.usedMalattia || 0} <span className="text-lg font-normal text-slate-500">gg</span>
              </p>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <CheckCircle2 size={64} />
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Turni Effettuati</h3>
              <p className="text-3xl font-bold text-blue-400">
                {data.shifts.filter((s: any) => s.type && !s.type.startsWith("(")).length} <span className="text-lg font-normal text-slate-500">turni</span>
              </p>
            </div>
          </div>

          {/* Tabella Cartellino */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-4 font-semibold w-24">Data</th>
                    <th className="px-4 py-4 font-semibold">Turno (Pianificato)</th>
                    <th className="px-4 py-4 font-semibold">Timbrature</th>
                    <th className="px-4 py-4 font-semibold">Straordinario</th>
                    <th className="px-4 py-4 font-semibold">Delta Timbr.</th>
                    <th className="px-4 py-4 font-semibold">Assenze / Note</th>
                    <th className="px-4 py-4 font-semibold w-16 text-center">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {days.map(day => {
                    const dateObj = new Date(Date.UTC(year, month - 1, day))
                    const dateStr = dateObj.toISOString().split('T')[0]
                    const isWeekend = dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6

                    // Find data for this day
                    const dayShifts = data.shifts.filter((s: any) => new Date(s.date).toISOString().split('T')[0] === dateStr)
                    const requests = data.requests.filter((r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr)
                    const clocks = data.clockRecords.filter((c: any) => new Date(c.timestamp).toISOString().split('T')[0] === dateStr)

                    // Aggregate
                    const primaryShift = dayShifts[0]
                    const overtime = dayShifts.reduce((acc: number, s: any) => acc + (s.overtimeHours || 0), 0)
                    const isAbsence = primaryShift?.type?.startsWith("(") || primaryShift?.type === "R" || primaryShift?.type === "RR"

                    // Calculate Total Clocked Time
                    let totalClockedMs = 0
                    if (clocks.length >= 2) {
                      for (let i = 0; i < clocks.length - 1; i += 2) {
                        const start = new Date(clocks[i].timestamp).getTime()
                        const end = clocks[i+1] ? new Date(clocks[i+1].timestamp).getTime() : 0
                        if (end > start) totalClockedMs += (end - start)
                      }
                    }
                    const totalClockedHours = totalClockedMs / (1000 * 60 * 60)

                    // Calculate Expected Time from primaryShift.timeRange (e.g. "07:00 - 13:00")
                    let expectedHours = 0
                    if (primaryShift?.timeRange) {
                      try {
                        const parts = primaryShift.timeRange.split(/[-–]/).map((p: string) => p.trim())
                        const [sh, sm] = parts[0].split(':').map(Number)
                        const [eh, em] = parts[1].split(':').map(Number)
                        let diff = (eh * 60 + em) - (sh * 60 + sm)
                        if (diff < 0) diff += 1440 // Night shift
                        expectedHours = diff / 60
                      } catch {}
                    }

                    const delta = totalClockedHours > 0 ? (totalClockedHours - expectedHours) : 0

                    return (
                      <tr 
                        key={day} 
                        className={`hover:bg-slate-800/50 transition-colors ${isWeekend ? 'bg-slate-800/20' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-medium ${isWeekend ? 'text-amber-500' : 'text-slate-200'}`}>
                              {day} {format(dateObj, "MMM", { locale: it })}
                            </span>
                            <span className="text-xs text-slate-500 capitalize">
                              {format(dateObj, "EEEE", { locale: it })}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3">
                          {primaryShift ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                                isAbsence ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {primaryShift.type}
                              </span>
                              {!isAbsence && primaryShift.timeRange && (
                                <span className="text-slate-400 text-xs flex items-center gap-1">
                                  <Clock size={12} /> {primaryShift.timeRange}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-xs">Nessun turno</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {clocks.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {clocks.map((c: any, i: number) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded border ${
                                  c.type === 'IN' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-orange-500/30 text-orange-400 bg-orange-500/10'
                                }`}>
                                  {c.type === 'IN' ? 'Entrata' : 'Uscita'} {format(new Date(c.timestamp), "HH:mm")}
                                  {c.isManual && <span title="Modificata Manualmente"><Edit2 size={10} className="inline ml-1" /></span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {overtime > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded text-xs">
                              +{overtime}h
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {totalClockedHours > 0 && (
                              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                                Totale: {totalClockedHours.toFixed(2)}h
                              </div>
                            )}
                            {delta !== 0 ? (
                              <span className={`inline-flex items-center gap-1 font-bold px-2 py-1 rounded text-xs ${
                                delta > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
                              }`}>
                                {delta > 0 ? '+' : ''}{delta.toFixed(2)}h
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {requests.map((r: any, i: number) => (
                              <span key={i} className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded inline-block w-fit">
                                {r.hours ? `${r.hours}h ` : ''}{getLabel(r.code) || r.code}
                              </span>
                            ))}
                            {primaryShift?.serviceDetails && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Info size={12} /> {primaryShift.serviceDetails}
                              </span>
                            )}
                            {requests.length === 0 && !primaryShift?.serviceDetails && <span className="text-slate-600">-</span>}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button 
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                            title="Modifica Dettagli Giornata"
                            onClick={() => openDetailModal(day, primaryShift, clocks)}
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ MODALE DETTAGLIO GIORNATA ═══════════ */}
      {detailModalOpen && selectedCell && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-900 text-white shrink-0 flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <CalendarIcon width={16} height={16} className="text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">
                    {agents.find(a => a.id === selectedCell.userId)?.name}
                  </h3>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Giorno {selectedCell.day}
                </p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="p-5 space-y-5">
                
                {/* Selezione Codice come nella vecchia modale */}
                <div>
                  <div className="relative flex items-center">
                    <select 
                      value={detailData.type} 
                      onChange={e => setDetailData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl pl-4 pr-4 py-3 text-sm font-bold text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <option value="">Seleziona codice...</option>
                      <optgroup label="Codici Turno Disponibili">
                        {allAvailableShiftCodes.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      {AGENDA_CATEGORIES.map(cat => (
                        <optgroup key={cat.group} label={`${cat.emoji} ${cat.group}`}>
                          {cat.items.map(item => (
                            <option key={item.shortCode} value={item.shortCode}>{item.shortCode} - {item.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Turni Rapidi */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Turni Rapidi</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {allAvailableShiftCodes.filter(c => ["M", "P", "N", "R"].some(prefix => c.startsWith(prefix))).slice(0, 12).map(code => (
                      <button 
                        key={code} 
                        onClick={() => setDetailData(prev => ({ ...prev, type: code }))}
                        className={`py-2 rounded-lg text-[10px] font-black transition-all border ${
                          detailData.type === code 
                            ? "ring-2 ring-indigo-500 shadow-md " 
                            : ""
                        } ${
                          code === "REP" || code === "REP_I"
                          ? "bg-violet-600 text-white border-violet-700 hover:bg-violet-700"
                          : code.startsWith("M")
                            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-500 hover:text-white"
                            : code.startsWith("P")
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-500 hover:text-white"
                              : code.startsWith("N")
                                ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-900"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-500 hover:text-white"
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categorie Agenda */}
                <div className="space-y-2.5">
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
                            <button 
                              key={item.shortCode} 
                              onClick={() => setDetailData(prev => ({ ...prev, type: item.shortCode }))}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all border hover:border-slate-300 hover:shadow-sm group/btn ${
                                detailData.type === item.shortCode ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50" : "border-slate-100"
                              }`}
                            >
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

                <hr className="border-slate-200" />

                {/* Campi Straordinario e Note */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ore di Straordinario</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0" max="12" step="0.5"
                        value={detailData.overtimeHours || ""}
                        onChange={e => setDetailData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-2.5 pl-10 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                        placeholder="Es: 2.5"
                      />
                      <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Note / Motivazione</label>
                    <textarea 
                      placeholder="Es: Servizio ordine pubblico"
                      value={detailData.note}
                      onChange={e => setDetailData(prev => ({ ...prev, note: e.target.value }))}
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none text-sm"
                    />
                  </div>
                </div>

                {/* Timbrature Manuali */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Timbrature Manuali</label>
                    <button 
                      onClick={() => setDetailData(prev => ({
                        ...prev, 
                        clocks: [...prev.clocks, { 
                          id: "", 
                          type: prev.clocks.filter(c => c.type === 'IN').length > prev.clocks.filter(c => c.type === 'OUT').length ? 'OUT' : 'IN', 
                          timestamp: `${selectedCell.dateStr}T12:00:00.000Z`, 
                          isManual: true 
                        }]
                      }))}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                    >
                      + Aggiungi
                    </button>
                  </div>
                  
                  {detailData.clocks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nessuna timbratura registrata.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailData.clocks.map((c, i) => {
                         const dateObj = new Date(c.timestamp)
                         const hhmm = !isNaN(dateObj.getTime()) ? format(dateObj, "HH:mm") : "12:00"
                         
                         return (
                           <div key={i} className="flex items-center gap-2">
                             <select 
                               value={c.type}
                               onChange={(e) => {
                                 const newClocks = [...detailData.clocks]
                                 newClocks[i].type = e.target.value
                                 newClocks[i].isManual = true
                                 setDetailData(prev => ({ ...prev, clocks: newClocks }))
                               }}
                               className="p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none focus:border-indigo-500"
                             >
                               <option value="IN">Entrata</option>
                               <option value="OUT">Uscita</option>
                             </select>
                             
                             <input 
                               type="time" 
                               value={hhmm}
                               onChange={(e) => {
                                 const [h, m] = e.target.value.split(":")
                                 if (!h || !m) return
                                 const newDate = new Date(selectedCell.dateStr)
                                 newDate.setHours(parseInt(h), parseInt(m), 0, 0)
                                 
                                 const newClocks = [...detailData.clocks]
                                 newClocks[i].timestamp = newDate.toISOString()
                                 newClocks[i].isManual = true
                                 setDetailData(prev => ({ ...prev, clocks: newClocks }))
                               }}
                               className="flex-1 p-2 bg-white border border-slate-300 rounded text-xs font-bold outline-none focus:border-indigo-500"
                             />
                             
                             <button 
                               onClick={() => {
                                 const newClocks = [...detailData.clocks]
                                 newClocks.splice(i, 1)
                                 setDetailData(prev => ({ ...prev, clocks: newClocks }))
                               }}
                               className="p-2 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                               title="Elimina timbratura"
                             >
                               <X size={16} />
                             </button>
                           </div>
                         )
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
            
            {/* Footer con bottoni */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <button 
                  onClick={() => setDetailData(prev => ({ ...prev, type: "" }))}
                  className="w-1/3 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 bg-white rounded-xl text-[11px] font-bold uppercase border border-slate-200 transition-all"
                >
                  Svuota
                </button>
                <button 
                  onClick={saveDetailModal}
                  disabled={savingDetail}
                  className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  {savingDetail ? <RefreshCcw className="animate-spin" size={16} /> : "Salva Modifiche"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
