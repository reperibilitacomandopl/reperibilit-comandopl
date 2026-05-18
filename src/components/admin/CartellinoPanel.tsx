"use client"

import { useState, useEffect, useMemo } from "react"
import { format, getDaysInMonth } from "date-fns"
import { it } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Edit2, AlertCircle, CheckCircle2, RefreshCcw, Download, User, Info, X, LayoutDashboard, ListTodo, Unlock } from "lucide-react"
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
  const [detailData, setDetailData] = useState<{type: string, overtimeHours: number, note: string, clocks: any[], dayRequests: any[]}>({type: "", overtimeHours: 0, note: "", clocks: [], dayRequests: []})
  const [savingDetail, setSavingDetail] = useState(false)
  
  // Stato per inserimento nuovo giustificativo
  const [newReq, setNewReq] = useState({ code: "", hours: "", notes: "" })
  const [addingReq, setAddingReq] = useState(false)

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

  const openDetailModal = (day: number, primaryShift: any, clocks: any[], dayRequests?: any[]) => {
    const dateObj = new Date(Date.UTC(year, month - 1, day))
    const dateStr = dateObj.toISOString().split('T')[0]
    
    setSelectedCell({ userId: selectedUserId, dateStr, day })
    setDetailData({
      type: primaryShift?.type || "",
      overtimeHours: primaryShift?.overtimeHours || 0,
      note: primaryShift?.serviceDetails || "",
      clocks: clocks ? [...clocks] : [],
      dayRequests: dayRequests ? [...dayRequests] : []
    })
    setDetailModalOpen(true)
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Eliminare definitivamente questa richiesta?")) return
    try {
      const res = await fetch(`/api/requests/${requestId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error("Errore API")
      toast.success("Richiesta eliminata")
      
      setDetailData(prev => ({
        ...prev,
        dayRequests: prev.dayRequests.filter((r: any) => r.id !== requestId)
      }))
      
      fetchCartellinoData()
    } catch (e) {
      toast.error("Impossibile eliminare la richiesta")
    }
  }

  const handleAddRequest = async () => {
    if (!newReq.code || !selectedCell) {
      toast.error("Seleziona una causale")
      return
    }
    
    // Trova l'item corretto per determinare se servono ore
    const item = AGENDA_CATEGORIES.flatMap(c => c.items).find(i => i.code === newReq.code || i.shortCode === newReq.code)
    const isHourly = item?.unit === 'HOURS'
    
    if (isHourly && !newReq.hours) {
      toast.error("Inserisci il numero di ore")
      return
    }

    setAddingReq(true)
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCell.userId,
          date: selectedCell.dateStr,
          code: newReq.code, // Usiamo il codice univoco (es. 0112)
          hours: newReq.hours || null,
          notes: newReq.notes,
          status: "ACCEPTED"
        })
      })
      if (!res.ok) throw new Error("Errore API")
      toast.success("Giustificativo aggiunto")
      
      // Reset e refresh
      setNewReq({ code: "", hours: "", notes: "" })
      fetchCartellinoData()
      
      // Aggiorna anche la modale locale recuperando i dati freschi
      const updatedJson = await (await fetch(`/api/admin/cartellino?userId=${selectedCell.userId}&month=${month}&year=${year}`)).json()
      const dateStr = selectedCell.dateStr
      const dayReqs = updatedJson.requests.filter((r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr)
      setDetailData(prev => ({ ...prev, dayRequests: dayReqs }))
      
    } catch (e) {
      toast.error("Errore durante l'inserimento")
    } finally {
      setAddingReq(false)
    }
  }

  const saveDetailModal = async () => {
    if (!selectedCell) return
    setSavingDetail(true)
    
    try {
      const resShifts = await fetch("/api/admin/shifts/monthly", {
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
      })

      if (!resShifts.ok) {
        const errJson = await resShifts.json().catch(() => ({}))
        throw new Error(errJson.error || "Impossibile aggiornare la turnazione.")
      }

      const resClocks = await fetch("/api/admin/clock-records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCell.userId,
          date: selectedCell.dateStr,
          clocks: detailData.clocks
        })
      })

      if (!resClocks.ok) {
        const errJson = await resClocks.json().catch(() => ({}))
        throw new Error(errJson.error || "Impossibile aggiornare le timbrature.")
      }

      toast.success("Dettagli salvati con successo")
      setDetailModalOpen(false)
      fetchCartellinoData()
    } catch (e: any) {
      toast.error(e.message || "Errore durante il salvataggio dei dettagli")
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
      fetchCartellinoData()
    } catch (e) {
      toast.error("Impossibile processare la richiesta")
    }
  }

  return (
    <div className="space-y-6">
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
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]">
            {agents.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.matricola})</option>))}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500">
            {Array.from({ length: 12 }, (_, i) => (<option key={i + 1} value={i + 1}>{format(new Date(2020, i, 1), "MMMM", { locale: it }).toUpperCase()}</option>))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500">
            {[2024, 2025, 2026].map(y => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
      </div>

      <div className="flex p-1 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 w-full sm:w-fit">
        <button onClick={() => setActiveTab('REGISTRO')} className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'REGISTRO' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
          <LayoutDashboard size={16} /><span className="hidden sm:inline">Registro</span> Presenze
        </button>
        <button onClick={() => setActiveTab('RIEPILOGO')} className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'RIEPILOGO' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
          <ListTodo size={16} />Richieste & Saldi
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20"><RefreshCcw className="animate-spin text-blue-500" size={32} /></div>
      ) : !data ? null : activeTab === 'RIEPILOGO' ? (
        <CartellinoSummaryView requests={data.requests || []} balances={data.balances || null} mode="ADMIN" onAction={handleRequestAction} isLoading={loading} userId={selectedUserId} month={month} year={year} onMonthChange={(m, y) => { setMonth(m); setYear(y); }} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarIcon size={64} /></div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Ferie Residue ({year})</h3>
              <p className="text-3xl font-bold text-white">{Math.max(0, (data.balances?.details?.find((d: any) => d.code === "FERIE" || d.code === "0015")?.initialValue || 0) - (data.yearlyStats?.usedFerie || 0))} <span className="text-lg font-normal text-slate-500">gg</span></p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={64} /></div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Straordinari Mensili</h3>
              <p className="text-3xl font-bold text-emerald-400">{data.shifts.reduce((acc: number, s: any) => acc + (s.overtimeHours || 0), 0)} <span className="text-lg font-normal text-slate-500">ore</span></p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle size={64} /></div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Malattia Anno</h3>
              <p className="text-3xl font-bold text-rose-400">{data.yearlyStats?.usedMalattia || 0} <span className="text-lg font-normal text-slate-500">gg</span></p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={64} /></div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">Turni Effettuati</h3>
              <p className="text-3xl font-bold text-blue-400">{data.shifts.filter((s: any) => s.type && !s.type.startsWith("(")).length} <span className="text-lg font-normal text-slate-500">turni</span></p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-4 py-4 font-black w-24 bg-slate-800">Data</th>
                    <th className="px-4 py-4 font-black bg-slate-800">Turno</th>
                    <th className="px-4 py-4 font-black bg-slate-800">Timbrature</th>
                    <th className="px-4 py-4 font-black bg-slate-800">Straord.</th>
                    <th className="px-4 py-4 font-black bg-slate-800">Delta</th>
                    <th className="px-4 py-4 font-black bg-slate-800">Assenze / Note</th>
                    <th className="px-4 py-4 font-black w-16 text-center bg-slate-800">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {days.map(day => {
                    const dateObj = new Date(Date.UTC(year, month - 1, day))
                    const dateStr = dateObj.toISOString().split('T')[0]
                    const isWeekend = dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6
                    const isCertified = data.certifiedDates?.includes(dateStr)
                    const dayShifts = data.shifts.filter((s: any) => new Date(s.date).toISOString().split('T')[0] === dateStr)
                    const requests = data.requests.filter((r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr)
                    const clocks = data.clockRecords.filter((c: any) => new Date(c.timestamp).toISOString().split('T')[0] === dateStr)
                    const primaryShift = dayShifts[0]
                    const overtime = dayShifts.reduce((acc: number, s: any) => acc + (s.overtimeHours || 0), 0)
                    const isAbsence = primaryShift?.type?.startsWith("(") || primaryShift?.type === "R" || primaryShift?.type === "RR"
                    
                    let totalClockedMs = 0
                    if (clocks.length >= 2) {
                      for (let i = 0; i < clocks.length - 1; i += 2) {
                        const start = new Date(clocks[i].timestamp).getTime()
                        const end = clocks[i+1] ? new Date(clocks[i+1].timestamp).getTime() : 0
                        if (end > start) totalClockedMs += (end - start)
                      }
                    }
                    const totalClockedHours = totalClockedMs / (1000 * 60 * 60)
                    let expectedHours = 0
                    if (primaryShift?.timeRange) {
                      try {
                        const parts = primaryShift.timeRange.split(/[-–]/).map((p: string) => p.trim())
                        const [sh, sm] = parts[0].split(':').map(Number)
                        const [eh, em] = parts[1].split(':').map(Number)
                        let diff = (eh * 60 + em) - (sh * 60 + sm)
                        if (diff < 0) diff += 1440
                        expectedHours = diff / 60
                      } catch {}
                    }
                    const delta = totalClockedHours > 0 ? (totalClockedHours - expectedHours - overtime) : 0

                    return (
                      <tr key={day} className={`hover:bg-slate-800/50 transition-colors ${isWeekend ? 'bg-slate-800/20' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`font-medium ${isWeekend ? 'text-amber-500' : 'text-slate-200'}`}>{day} {format(dateObj, "MMM", { locale: it })}</span>
                            <span className="text-xs text-slate-500 capitalize">{format(dateObj, "EEEE", { locale: it })}</span>
                            {isCertified && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 mt-1.5 w-fit cursor-help" title="Ordine di Servizio Certificato - Inserimenti Successivi Consentiti">
                                <Unlock size={9} className="text-amber-400" /> 🔓 ODS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {primaryShift ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${isAbsence ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>{primaryShift.type}</span>
                              {!isAbsence && primaryShift.timeRange && (
                                <button onClick={() => openDetailModal(day, primaryShift, clocks, requests)} className="text-slate-400 text-xs flex items-center gap-1 hover:text-white"><Clock size={12} /> {primaryShift.timeRange}</button>
                              )}
                            </div>
                          ) : (<span className="text-slate-600 italic text-xs">Nessun turno</span>)}
                        </td>
                        <td className="px-4 py-3">
                          {clocks.length > 0 ? (
                            <button onClick={() => openDetailModal(day, primaryShift, clocks, requests)} className="flex flex-wrap gap-1 hover:opacity-80">
                              {clocks.map((c: any, i: number) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded border ${c.type === 'IN' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-orange-500/30 text-orange-400 bg-orange-500/10'}`}>
                                  {c.type === 'IN' ? 'Entrata' : 'Uscita'} {format(new Date(c.timestamp), "HH:mm")}
                                </span>
                              ))}
                            </button>
                          ) : (<span className="text-slate-600">-</span>)}
                        </td>
                        <td className="px-4 py-3">{overtime > 0 ? (<span className="text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded text-xs">+{overtime}h</span>) : (<span className="text-slate-600">-</span>)}</td>
                        <td className="px-4 py-3">{delta !== 0 ? (<span className={`font-bold px-2 py-1 rounded text-xs ${delta > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>{delta > 0 ? '+' : ''}{delta.toFixed(2)}h</span>) : (<span className="text-slate-600">-</span>)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {requests.map((r: any, i: number) => (
                              <button key={i} onClick={() => openDetailModal(day, primaryShift, clocks, requests)} className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded hover:bg-amber-400/20 border border-amber-400/20 text-left">
                                {r.hours ? `${r.hours}h ` : ''}{getLabel(r.code) || r.code}
                              </button>
                            ))}
                            {primaryShift?.serviceDetails && (<span className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> {primaryShift.serviceDetails}</span>)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => openDetailModal(day, primaryShift, clocks, requests)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"><Edit2 size={16} /></button>
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

      {detailModalOpen && selectedCell && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase">{agents.find(a => a.id === selectedCell.userId)?.name}</h3>
                <p className="text-[10px] text-slate-400">GIORNO {selectedCell.day}</p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <select value={detailData.type} onChange={e => setDetailData(prev => ({ ...prev, type: e.target.value }))} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none">
                <option value="">Seleziona codice turno...</option>
                <optgroup label="Turni">
                  {allAvailableShiftCodes.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>

              {detailData.dayRequests && detailData.dayRequests.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-3">
                  <p className="text-[10px] font-black text-amber-600 uppercase">Giustificativi Attivi</p>
                  {detailData.dayRequests.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{r.hours ? `${r.hours}h ` : ''}{getLabel(r.code) || r.code}</span>
                        {r.notes && <span className="text-[10px] text-slate-500">{r.notes}</span>}
                      </div>
                      <button onClick={() => handleDeleteRequest(r.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sezione Aggiunta Nuovo Giustificativo */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggiungi Nuovo Giustificativo</p>
                  {newReq.code && (
                    <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded animate-pulse">
                      SELEZIONATO: {newReq.code}
                    </span>
                  )}
                </div>

                {/* Form per ore e note */}
                <div className="flex gap-2">
                  <div className="w-24">
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">ORE</label>
                    <input 
                      type="number" step="0.5" placeholder="H"
                      value={newReq.hours}
                      onChange={e => setNewReq(p => ({ ...p, hours: e.target.value }))}
                      className="w-full p-2 text-xs font-bold border border-slate-200 text-slate-900 bg-white rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">NOTE AGGIUNTIVE</label>
                    <input 
                      type="text" placeholder="Note facoltative..."
                      value={newReq.notes}
                      onChange={e => setNewReq(p => ({ ...p, notes: e.target.value }))}
                      className="w-full p-2 text-xs border border-slate-200 text-slate-900 bg-white rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleAddRequest}
                      disabled={addingReq || !newReq.code}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 h-[34px] flex items-center justify-center min-w-[60px]"
                    >
                      {addingReq ? <RefreshCcw size={14} className="animate-spin" /> : "AGGIUNGI"}
                    </button>
                  </div>
                </div>

                {/* Griglia Categorie */}
                <div className="space-y-4 pt-2">
                  {AGENDA_CATEGORIES.map(cat => {
                    const theme = CAT_THEME[cat.color] || CAT_THEME.indigo
                    return (
                      <div key={cat.group} className="space-y-2">
                        <div className="flex items-center gap-1.5 opacity-60">
                          <span className="text-xs">{cat.emoji}</span>
                          <span className={`text-[9px] font-black ${theme.text} uppercase tracking-wider`}>{cat.group}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.items.map(item => (
                            <button 
                              key={item.code} 
                              onClick={() => setNewReq(p => ({ 
                                ...p, 
                                code: item.code, 
                                hours: item.unit === 'HOURS' ? p.hours : "" 
                              }))}
                              className={`flex flex-col gap-0.5 p-2 rounded-xl border transition-all text-left ${
                                newReq.code === item.code 
                                ? `${theme.btnBg} ${theme.btnText} border-transparent shadow-md ring-2 ring-indigo-500 ring-offset-1`
                                : `bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50`
                              }`}
                            >
                              <span className={`text-[10px] font-black uppercase ${newReq.code === item.code ? 'text-white' : 'text-slate-900'}`}>
                                {item.shortCode}
                              </span>
                              <span className={`text-[9px] font-bold leading-tight line-clamp-1 ${newReq.code === item.code ? 'text-white/80' : 'text-slate-500'}`}>
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Straordinario</label>
                  <input type="number" step="0.5" value={detailData.overtimeHours} onChange={e => setDetailData(prev => ({ ...prev, overtimeHours: parseFloat(e.target.value) || 0 }))} className="w-full p-2.5 border border-slate-200 text-slate-900 bg-white rounded-lg font-bold outline-none focus:border-slate-400" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Note</label>
                  <input type="text" value={detailData.note} onChange={e => setDetailData(prev => ({ ...prev, note: e.target.value }))} className="w-full p-2.5 border border-slate-200 text-slate-900 bg-white rounded-lg text-sm outline-none focus:border-slate-400" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Timbrature</p>
                  <button onClick={() => setDetailData(prev => ({ ...prev, clocks: [...prev.clocks, { type: 'IN', timestamp: `${selectedCell.dateStr}T12:00:00.000Z`, isManual: true }] }))} className="text-[10px] font-bold text-blue-600">+ AGGIUNGI</button>
                </div>
                {detailData.clocks.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={c.type} onChange={e => { const n = [...detailData.clocks]; n[i].type = e.target.value; setDetailData(p => ({ ...p, clocks: n })) }} className="p-2 border border-slate-200 rounded text-xs font-bold text-slate-900 bg-white outline-none">
                      <option value="IN">IN</option><option value="OUT">OUT</option>
                    </select>
                    <input type="time" value={!isNaN(new Date(c.timestamp).getTime()) ? format(new Date(c.timestamp), "HH:mm") : "12:00"} onChange={e => { const [h, m] = e.target.value.split(":"); const d = new Date(selectedCell.dateStr); d.setHours(parseInt(h), parseInt(m)); const n = [...detailData.clocks]; n[i].timestamp = d.toISOString(); setDetailData(p => ({ ...p, clocks: n })) }} className="flex-1 p-2 border border-slate-200 rounded text-xs font-bold text-slate-900 bg-white outline-none" />
                    <button onClick={() => { const n = [...detailData.clocks]; n.splice(i, 1); setDetailData(p => ({ ...p, clocks: n })) }} className="text-rose-500 p-2"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex gap-3">
              <button onClick={() => setDetailData(prev => ({ ...prev, type: "" }))} className="flex-1 py-2.5 text-slate-500 font-bold text-xs border rounded-xl">SVUOTA</button>
              <button onClick={saveDetailModal} disabled={savingDetail} className="flex-[2] py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg">{savingDetail ? "SALVATAGGIO..." : "SALVA MODIFICHE"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
