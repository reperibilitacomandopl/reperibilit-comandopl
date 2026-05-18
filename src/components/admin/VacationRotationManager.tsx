"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { Calendar, Plus, Trash2, Save, Users, Sparkles, RefreshCw, Layers, CheckCircle2, AlertTriangle, Play, HelpCircle } from "lucide-react"

export default function VacationRotationManager() {
  const [activeTab, setActiveTab] = useState<"periods" | "groups" | "holidays" | "simulator">("periods")
  const [season, setSeason] = useState<"SUMMER" | "WINTER">("SUMMER")
  const [yearSim, setYearSim] = useState(new Date().getFullYear())

  // Data states
  const [periods, setPeriods] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [holidayGroups, setHolidayGroups] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [groupSearchQuery, setGroupSearchQuery] = useState("")
  const [holidaySearchQuery, setHolidaySearchQuery] = useState("")
  const [subTab, setSubTab] = useState<"groups" | "assignments">("groups")
  const [customHolidayForm, setCustomHolidayForm] = useState({ id: "", name: "", date: "" })
  const [selectedHoliday, setSelectedHoliday] = useState<any | null>(null)
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([])
  const [holidaySearchQueryText, setHolidaySearchQueryText] = useState("")

  // Form states for Vacation Periods
  const [periodForm, setPeriodForm] = useState({ id: "", name: "", startDay: 1, startMonth: 7, endDay: 15, endMonth: 7, orderIndex: 0 })
  const [isEditingPeriod, setIsEditingPeriod] = useState(false)

  // Form states for Vacation Groups
  const [groupForm, setGroupForm] = useState<{ id: string; name: string; baseYear: number; basePeriodId: string; memberIds: string[] }>({
    id: "",
    name: "",
    baseYear: new Date().getFullYear(),
    basePeriodId: "",
    memberIds: []
  })
  const [isEditingGroup, setIsEditingGroup] = useState(false)

  // Form states for Holiday Groups
  const [holidayGroupForm, setHolidayGroupForm] = useState<{ id: string; name: string; baseYear: number; orderIndex: number; memberIds: string[] }>({
    id: "",
    name: "",
    baseYear: new Date().getFullYear(),
    orderIndex: 0,
    memberIds: []
  })
  const [isEditingHolidayGroup, setIsEditingHolidayGroup] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [season, yearSim])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [pRes, gRes, hgRes, uRes, cRes] = await Promise.all([
        fetch(`/api/admin/vacations/rotation/periods?season=${season}`),
        fetch(`/api/admin/vacations/rotation/groups?season=${season}`),
        fetch("/api/admin/vacations/rotation/holidays"),
        fetch("/api/admin/users"),
        fetch(`/api/admin/vacations/rotation/holidays/custom?year=${yearSim}`)
      ])
      const pData = await pRes.json()
      const gData = await gRes.json()
      const hgData = await hgRes.json()
      const uData = await uRes.json()
      const cData = await cRes.json()

      setPeriods(pData.periods || [])
      setGroups(gData.groups || [])
      setHolidayGroups(hgData.groups || [])
      setUsers(uData.users || [])
      setHolidays(cData.holidays || [])
    } catch (e) {
      console.error("Error loading rotation data:", e)
      toast.error("Errore nel caricamento dei dati")
    } finally {
      setLoading(false)
    }
  }

  const loadHolidays = async () => {
    try {
      const res = await fetch(`/api/admin/vacations/rotation/holidays/custom?year=${yearSim}`)
      const data = await res.json()
      if (data.success) {
        setHolidays(data.holidays || [])
      }
    } catch (e) {
      console.error("Error loading custom holidays:", e)
    }
  }

  // --- VACATION PERIODS HANDLERS ---
  const savePeriod = async () => {
    if (!periodForm.name) {
      toast.error("Il nome del turno è obbligatorio")
      return
    }
    try {
      const res = await fetch("/api/admin/vacations/rotation/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...periodForm, season })
      })
      if (res.ok) {
        toast.success(isEditingPeriod ? "Turno aggiornato" : "Turno creato con successo")
        setPeriodForm({ id: "", name: "", startDay: 1, startMonth: 7, endDay: 15, endMonth: 7, orderIndex: periods.length + 1 })
        setIsEditingPeriod(false)
        loadAllData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore nel salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const deletePeriod = async (id: string) => {
    if (!confirm("Sicuro di voler eliminare questo periodo? Potrebbe compromettere i gruppi ad esso collegati.")) return
    try {
      const res = await fetch(`/api/admin/vacations/rotation/periods?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Turno eliminato")
        loadAllData()
      } else {
        toast.error("Errore nell'eliminazione")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  // --- VACATION GROUPS HANDLERS ---
  const saveGroup = async () => {
    if (!groupForm.name || !groupForm.basePeriodId) {
      toast.error("Nome gruppo e Turno di partenza sono obbligatori")
      return
    }
    try {
      const res = await fetch("/api/admin/vacations/rotation/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...groupForm, season })
      })
      if (res.ok) {
        toast.success(isEditingGroup ? "Gruppo aggiornato" : "Gruppo creato con successo")
        setGroupForm({ id: "", name: "", baseYear: new Date().getFullYear(), basePeriodId: "", memberIds: [] })
        setIsEditingGroup(false)
        loadAllData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore nel salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm("Eliminare questo gruppo di rotazione ferie?")) return
    try {
      const res = await fetch(`/api/admin/vacations/rotation/groups?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Gruppo eliminato")
        loadAllData()
      } else {
        toast.error("Errore nell'eliminazione")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  // --- HOLIDAY GROUPS HANDLERS ---
  const saveHolidayGroup = async () => {
    if (!holidayGroupForm.name) {
      toast.error("Il nome del gruppo festivo è obbligatorio")
      return
    }
    try {
      const res = await fetch("/api/admin/vacations/rotation/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holidayGroupForm)
      })
      if (res.ok) {
        toast.success(isEditingHolidayGroup ? "Gruppo festivo aggiornato" : "Gruppo festivo creato")
        setHolidayGroupForm({ id: "", name: "", baseYear: new Date().getFullYear(), orderIndex: holidayGroups.length + 1, memberIds: [] })
        setIsEditingHolidayGroup(false)
        loadAllData()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore nel salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const deleteHolidayGroup = async (id: string) => {
    if (!confirm("Eliminare questo gruppo di rotazione festivi?")) return
    try {
      const res = await fetch(`/api/admin/vacations/rotation/holidays?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Gruppo festivo rimosso")
        loadAllData()
      } else {
        toast.error("Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const saveCustomHoliday = async () => {
    if (!customHolidayForm.name || !customHolidayForm.date) {
      toast.error("Nome e Data della festività sono obbligatori")
      return
    }
    try {
      const res = await fetch("/api/admin/vacations/rotation/holidays/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customHolidayForm)
      })
      if (res.ok) {
        toast.success(customHolidayForm.id ? "Festività aggiornata" : "Festività creata con successo")
        setCustomHolidayForm({ id: "", name: "", date: "" })
        loadHolidays()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore nel salvataggio")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const deleteCustomHoliday = async (id: string) => {
    if (!confirm("Sicuro di voler eliminare questa festività personalizzata? Verranno rimosse anche le relative assegnazioni e i turni.")) return
    try {
      const res = await fetch(`/api/admin/vacations/rotation/holidays/custom?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Festività eliminata")
        loadHolidays()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const saveHolidayAssignments = async () => {
    if (!selectedHoliday) return
    try {
      const res = await fetch("/api/admin/vacations/rotation/holidays/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedHoliday.id,
          name: selectedHoliday.name,
          date: selectedHoliday.date,
          userIds: assignedMemberIds
        })
      })
      if (res.ok) {
        toast.success("Assegnazioni salvate con successo!")
        setSelectedHoliday(null)
        loadHolidays()
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  // --- SIMULATION & PUBLICATION EXECUTION ---
  const publishVacations = async () => {
    if (!confirm(`Vuoi applicare e pubblicare la rotazione ferie ufficiale per l'anno ${yearSim} (${season === "SUMMER" ? "Estate" : "Inverno"})? Questo invierà notifiche e scriverà le ferie sul calendario reale.`)) return
    try {
      const res = await fetch("/api/admin/vacations/rotation/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: yearSim, season })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Rotazione pubblicata! ${data.published.length} agenti notificati.`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const publishHolidays = async () => {
    if (!confirm(`Vuoi applicare e pubblicare la rotazione dei Festivi Infrasettimanali per l'anno ${yearSim}? I turni verranno inseriti nell'Ordine di Servizio e notificati.`)) return
    try {
      const res = await fetch("/api/admin/vacations/rotation/holidays/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: yearSim })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Turni festivi pubblicati! Assegnati i festivi a tutti i membri del gruppo designato.`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Errore")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  // Helpers for multi-select members
  const toggleMemberInForm = (userId: string, isHoliday: boolean = false) => {
    if (isHoliday) {
      const current = [...holidayGroupForm.memberIds]
      const index = current.indexOf(userId)
      if (index === -1) {
        current.push(userId)
      } else {
        current.splice(index, 1)
      }
      setHolidayGroupForm({ ...holidayGroupForm, memberIds: current })
    } else {
      const current = [...groupForm.memberIds]
      const index = current.indexOf(userId)
      if (index === -1) {
        current.push(userId)
      } else {
        current.splice(index, 1)
      }
      setGroupForm({ ...groupForm, memberIds: current })
    }
  }

  const getMidweekHolidaysSim = (year: number) => {
    const list = [
      { name: "Capodanno (01/01)", m: 1, d: 1 },
      { name: "Epifania (06/01)", m: 1, d: 6 },
      { name: "Liberazione (25/04)", m: 4, d: 25 },
      { name: "Festa del Lavoro (01/05)", m: 5, d: 1 },
      { name: "Festa Patronale (05/05)", m: 5, d: 5 },
      { name: "Festa della Repubblica (02/06)", m: 6, d: 2 },
      { name: "Ferragosto (15/08)", m: 8, d: 15 },
      { name: "Tutti i Santi (01/11)", m: 11, d: 1 },
      { name: "Immacolata (08/12)", m: 12, d: 8 },
      { name: "Natale (25/12)", m: 12, d: 25 },
      { name: "Santo Stefano (26/12)", m: 12, d: 26 }
    ]
    return list.filter(item => {
      const d = new Date(year, item.m - 1, item.d)
      return d.getDay() !== 0 // escludi domeniche
    })
  }

  return (
    <div className="space-y-8 bg-slate-50/50 dark:bg-slate-900/10 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
      
      {/* Header section with Season Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-250 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={20} />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Motore di Rotazione Automatica</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Algoritmo round-robin per l'equità dei turni di ferie e festivi infrasettimanali del Comando
          </p>
        </div>

        {/* Summer / Winter Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setSeason("SUMMER")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              season === "SUMMER"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/10"
                : "text-slate-650 dark:text-slate-450 hover:bg-slate-200/50 dark:hover:bg-slate-850"
            }`}
          >
            ☀️ Estate
          </button>
          <button
            onClick={() => setSeason("WINTER")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              season === "WINTER"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                : "text-slate-650 dark:text-slate-450 hover:bg-slate-200/50 dark:hover:bg-slate-850"
            }`}
          >
            ❄️ Inverno
          </button>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
        <button
          onClick={() => setActiveTab("periods")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "periods"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
              : "text-slate-500 dark:text-slate-450 hover:bg-slate-150 dark:hover:bg-slate-800/40"
          }`}
        >
          <Layers size={14} /> 1. Turni Ferie ({periods.length})
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "groups"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
              : "text-slate-500 dark:text-slate-450 hover:bg-slate-150 dark:hover:bg-slate-800/40"
          }`}
        >
          <Users size={14} /> 2. Gruppi Ferie ({groups.length})
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "holidays"
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
              : "text-slate-500 dark:text-slate-450 hover:bg-slate-150 dark:hover:bg-slate-800/40"
          }`}
        >
          <Calendar size={14} /> 3. Rotazione Festivi Infrasettimanali ({holidayGroups.length})
        </button>
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "simulator"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/10"
              : "text-slate-500 dark:text-slate-450 hover:bg-slate-150 dark:hover:bg-slate-800/40"
          }`}
        >
          <RefreshCw size={14} /> 4. Simulatore & Pubblica
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-455 font-bold animate-pulse flex flex-col items-center justify-center gap-2">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
          <span>Sincronizzazione dati rotazione...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* TAB 1: VACATION PERIODS */}
          {activeTab === "periods" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form creation */}
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {isEditingPeriod ? "Modifica Turno" : "Aggiungi Turno Ferie"}
                  </h3>
                  {isEditingPeriod && (
                    <button
                      onClick={() => {
                        setIsEditingPeriod(false)
                        setPeriodForm({ id: "", name: "", startDay: 1, startMonth: 7, endDay: 15, endMonth: 7, orderIndex: periods.length + 1 })
                      }}
                      className="text-xs text-red-500 hover:underline font-bold"
                    >
                      Annulla
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Nome Turno (es. 1° Quindicina Luglio)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                      placeholder="es. 1° Quindicina Luglio"
                      value={periodForm.name}
                      onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Giorno Inizio</label>
                      <input
                        type="number"
                        min="1" max="31"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                        value={periodForm.startDay}
                        onChange={e => setPeriodForm({ ...periodForm, startDay: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Mese Inizio (1-12)</label>
                      <input
                        type="number"
                        min="1" max="12"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                        value={periodForm.startMonth}
                        onChange={e => setPeriodForm({ ...periodForm, startMonth: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Giorno Fine</label>
                      <input
                        type="number"
                        min="1" max="31"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                        value={periodForm.endDay}
                        onChange={e => setPeriodForm({ ...periodForm, endDay: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Mese Fine (1-12)</label>
                      <input
                        type="number"
                        min="1" max="12"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                        value={periodForm.endMonth}
                        onChange={e => setPeriodForm({ ...periodForm, endMonth: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Ordine Sequenza Rotazione (Indice)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                      value={periodForm.orderIndex}
                      onChange={e => setPeriodForm({ ...periodForm, orderIndex: parseInt(e.target.value) || 0 })}
                    />
                    <span className="text-[9px] font-semibold text-slate-400 block mt-1">Turno 1, poi Turno 2, ecc. La rotazione round-robin segue questo ordine ciclicamente.</span>
                  </div>

                  <button
                    onClick={savePeriod}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> Salva Turno Ferie
                  </button>
                </div>
              </div>

              {/* List table */}
              <div className="lg:col-span-2 space-y-4">
                {periods.length === 0 ? (
                  <div className="bg-white dark:bg-slate-950 p-12 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Layers className="text-slate-300 dark:text-slate-700" size={32} />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Nessun turno ferie impostato per questa stagione</p>
                      <p className="text-xs text-slate-400">Inserisci i periodi (quindicine) a sinistra per poter configurare i gruppi.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-slate-850">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">Turni Ferie della stagione attiva</span>
                    </div>
                    <div className="divide-y divide-slate-150 dark:divide-slate-850">
                      {periods.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-650 dark:text-slate-350">
                                Ordine #{p.orderIndex}
                              </span>
                              <span className="text-sm font-black text-slate-800 dark:text-white uppercase">{p.name}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold mt-1">
                              📅 Periodo: {String(p.startDay).padStart(2, '0')}/{String(p.startMonth).padStart(2, '0')} al {String(p.endDay).padStart(2, '0')}/{String(p.endMonth).padStart(2, '0')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setPeriodForm(p)
                                setIsEditingPeriod(true)
                              }}
                              className="text-xs font-bold text-blue-650 hover:underline px-3 py-1.5"
                            >
                              Modifica
                            </button>
                            <button
                              onClick={() => deletePeriod(p.id)}
                              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VACATION GROUPS */}
          {activeTab === "groups" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form creation */}
              <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {isEditingGroup ? "Modifica Gruppo Ferie" : "Nuovo Gruppo Ferie"}
                  </h3>
                  {isEditingGroup && (
                    <button
                      onClick={() => {
                        setIsEditingGroup(false)
                        setGroupForm({ id: "", name: "", baseYear: new Date().getFullYear(), basePeriodId: "", memberIds: [] })
                      }}
                      className="text-xs text-red-500 hover:underline font-bold"
                    >
                      Annulla
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black">Nome Gruppo (es. Gruppo A)</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                      placeholder="es. Gruppo A"
                      value={groupForm.name}
                      onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black">Turno di Partenza Base</label>
                    <select
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                      value={groupForm.basePeriodId}
                      onChange={e => setGroupForm({ ...groupForm, basePeriodId: e.target.value })}
                    >
                      <option value="">Seleziona turno iniziale...</option>
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>Turno #{p.orderIndex}: {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black">Anno di Partenza Base</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                        value={groupForm.baseYear}
                        onChange={e => setGroupForm({ ...groupForm, baseYear: parseInt(e.target.value) || new Date().getFullYear() })}
                      />
                    </div>
                  </div>

                  {/* Member selection */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black block mb-2">Seleziona Operatori</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs font-bold mb-2 outline-none placeholder-slate-400"
                      placeholder="Cerca operatore..."
                      value={groupSearchQuery}
                      onChange={e => setGroupSearchQuery(e.target.value)}
                    />
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-2">
                      {users
                        .filter(u => 
                          u.name?.toLowerCase().includes(groupSearchQuery.toLowerCase()) || 
                          u.matricola?.toLowerCase().includes(groupSearchQuery.toLowerCase())
                        )
                        .map(u => {
                          const isChecked = (groupForm.memberIds || []).includes(u.id)
                          return (
                            <label key={u.id} className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-850 p-1.5 rounded-lg cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleMemberInForm(u.id, false)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/25"
                              />
                              <div className="text-xs">
                                <p className="font-black text-slate-850 dark:text-white uppercase leading-tight">{u.name}</p>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{u.qualifica || "Agente"} ({u.matricola})</span>
                              </div>
                            </label>
                          )
                        })}
                      {users.filter(u => 
                        u.name?.toLowerCase().includes(groupSearchQuery.toLowerCase()) || 
                        u.matricola?.toLowerCase().includes(groupSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <p className="text-[10px] text-slate-450 italic text-center py-2">Nessun operatore trovato</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={saveGroup}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <Users size={14} /> Salva Gruppo Ferie
                  </button>
                </div>
              </div>

              {/* List table */}
              <div className="lg:col-span-2 space-y-4">
                {groups.length === 0 ? (
                  <div className="bg-white dark:bg-slate-950 p-12 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Users className="text-slate-300 dark:text-slate-700" size={32} />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Nessun gruppo di rotazione ferie configurato</p>
                      <p className="text-xs text-slate-400">I gruppi consentono di definire chi ruota insieme a chi.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map(group => (
                      <div key={group.id} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                          <div>
                            <span className="text-xs font-black text-slate-850 dark:text-white uppercase">{group.name}</span>
                            <span className="text-[9px] block text-slate-400 font-semibold">Stagione: {group.season === "SUMMER" ? "☀️ Estate" : "❄️ Inverno"}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setGroupForm({
                                  id: group.id,
                                  name: group.name,
                                  baseYear: group.baseYear,
                                  basePeriodId: group.basePeriodId,
                                  memberIds: group.members.map((m: any) => m.id)
                                })
                                setIsEditingGroup(true)
                              }}
                              className="text-[10px] font-black text-blue-650 hover:underline px-2 py-1"
                            >
                              Modifica
                            </button>
                            <button
                              onClick={() => deleteGroup(group.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <p className="font-semibold text-slate-650 dark:text-slate-400">
                            🏁 Turno Iniziale ({group.baseYear}): <span className="font-bold text-slate-800 dark:text-white">{group.basePeriod?.name}</span>
                          </p>
                          <div className="border-t border-dashed border-slate-150 dark:border-slate-850 pt-2.5">
                            <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Membri del Gruppo ({group.members?.length || 0}):</span>
                            <div className="flex flex-wrap gap-1">
                              {(group.members || []).map((m: any) => (
                                <span key={m.id} className="text-[9px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg">
                                  {m.name ? m.name.split(" ")[0] : "Agente"}
                                </span>
                              ))}
                              {(!group.members || group.members.length === 0) && <span className="text-[10px] text-slate-400 italic">Nessun agente in questo gruppo</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ROTATION FESTIVI INFRASETTIMANALI */}
          {activeTab === "holidays" && (
            <div className="space-y-6">
              {/* Sub-tabs switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
                <button
                  onClick={() => setSubTab("groups")}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    subTab === "groups"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                      : "text-slate-650 dark:text-slate-455 hover:bg-slate-200/50 dark:hover:bg-slate-850"
                  }`}
                >
                  👥 Gruppi di Rotazione Round-Robin
                </button>
                <button
                  onClick={() => setSubTab("assignments")}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    subTab === "assignments"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                      : "text-slate-650 dark:text-slate-455 hover:bg-slate-200/50 dark:hover:bg-slate-850"
                  }`}
                >
                  📅 Assegnazione Personale & Festività Custom
                </button>
              </div>

              {subTab === "groups" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Form creation */}
                  <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-black">
                        {isEditingHolidayGroup ? "Modifica Gruppo Festivo" : "Nuovo Gruppo Festivo"}
                      </h3>
                      {isEditingHolidayGroup && (
                        <button
                          onClick={() => {
                            setIsEditingHolidayGroup(false)
                            setHolidayGroupForm({ id: "", name: "", baseYear: new Date().getFullYear(), orderIndex: holidayGroups.length + 1, memberIds: [] })
                          }}
                          className="text-xs text-red-500 hover:underline font-bold"
                        >
                          Annulla
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black">Nome Gruppo Festivo (es. Squadra Festivo 1)</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                          placeholder="es. Squadra Festivo 1"
                          value={holidayGroupForm.name}
                          onChange={e => setHolidayGroupForm({ ...holidayGroupForm, name: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black">Anno di Partenza</label>
                          <input
                            type="number"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                            value={holidayGroupForm.baseYear}
                            onChange={e => setHolidayGroupForm({ ...holidayGroupForm, baseYear: parseInt(e.target.value) || new Date().getFullYear() })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black">Ordine di Sequenza</label>
                          <input
                            type="number"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                            value={holidayGroupForm.orderIndex}
                            onChange={e => setHolidayGroupForm({ ...holidayGroupForm, orderIndex: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {/* Member selection */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest font-black block mb-2">Seleziona Operatori</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-3 py-1.5 text-xs font-bold mb-2 outline-none placeholder-slate-400"
                          placeholder="Cerca operatore..."
                          value={holidaySearchQuery}
                          onChange={e => setHolidaySearchQuery(e.target.value)}
                        />
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-2">
                          {users
                            .filter(u => 
                              u.name?.toLowerCase().includes(holidaySearchQuery.toLowerCase()) || 
                              u.matricola?.toLowerCase().includes(holidaySearchQuery.toLowerCase())
                            )
                            .map(u => {
                              const isChecked = (holidayGroupForm.memberIds || []).includes(u.id)
                              return (
                                <label key={u.id} className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-850 p-1.5 rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleMemberInForm(u.id, true)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/25"
                                  />
                                  <div className="text-xs">
                                    <p className="font-black text-slate-850 dark:text-white uppercase leading-tight">{u.name}</p>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{u.qualifica || "Agente"} ({u.matricola})</span>
                                  </div>
                                </label>
                              )
                            })}
                          {users.filter(u => 
                            u.name?.toLowerCase().includes(holidaySearchQuery.toLowerCase()) || 
                            u.matricola?.toLowerCase().includes(holidaySearchQuery.toLowerCase())
                          ).length === 0 && (
                            <p className="text-[10px] text-slate-455 italic text-center py-2">Nessun operatore trovato</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={saveHolidayGroup}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <Calendar size={14} /> Salva Gruppo Festivo
                      </button>
                    </div>
                  </div>

                  {/* List table */}
                  <div className="lg:col-span-2 space-y-4">
                    {holidayGroups.length === 0 ? (
                      <div className="bg-white dark:bg-slate-950 p-12 text-center rounded-2xl border border-dashed border-slate-250 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                        <Calendar className="text-slate-300 dark:text-slate-700" size={32} />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">Nessun gruppo di rotazione festivi configurato</p>
                          <p className="text-xs text-slate-400">Organizza gli agenti in gruppi per ruotare i festivi infrasettimanali durante l'anno.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {holidayGroups.map(group => (
                          <div key={group.id} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                              <div>
                                <span className="text-xs font-black text-slate-850 dark:text-white uppercase">{group.name}</span>
                                <span className="text-[9px] block text-slate-400 font-semibold">Ordine Sequenza: #{group.orderIndex}</span>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    setHolidayGroupForm({
                                      id: group.id,
                                      name: group.name,
                                      baseYear: group.baseYear,
                                      orderIndex: group.orderIndex,
                                      memberIds: group.members.map((m: any) => m.id)
                                    })
                                    setIsEditingHolidayGroup(true)
                                  }}
                                  className="text-[10px] font-black text-blue-650 hover:underline px-2 py-1"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => deleteHolidayGroup(group.id)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <p className="font-semibold text-slate-650 dark:text-slate-450">
                                ⚙️ Anno Base: <span className="font-bold text-slate-800 dark:text-white">{group.baseYear}</span>
                              </p>
                              <div className="border-t border-dashed border-slate-150 dark:border-slate-850 pt-2.5">
                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Membri Festivi ({group.members?.length || 0}):</span>
                                <div className="flex flex-wrap gap-1">
                                  {(group.members || []).map((m: any) => (
                                    <span key={m.id} className="text-[9px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg">
                                      {m.name ? m.name.split(" ")[0] : "Agente"}
                                    </span>
                                  ))}
                                  {(!group.members || group.members.length === 0) && <span className="text-[10px] text-slate-400 italic">Nessun agente in questo gruppo</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Form per festivo custom */}
                  <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-black">
                        {customHolidayForm.id ? "Modifica Festivo Custom" : "Nuovo Festivo Custom"}
                      </h3>
                      {customHolidayForm.id && (
                        <button
                          onClick={() => setCustomHolidayForm({ id: "", name: "", date: "" })}
                          className="text-xs text-red-500 hover:underline font-bold"
                        >
                          Annulla
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block font-bold">Nome Festività (es. Festa Patronale)</label>
                        <input
                          type="text"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                          placeholder="es. Festa Patronale di San Nicola"
                          value={customHolidayForm.name}
                          onChange={e => setCustomHolidayForm({ ...customHolidayForm, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block font-bold">Data del Festivo</label>
                        <input
                          type="date"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm font-bold mt-1 outline-none"
                          value={customHolidayForm.date}
                          onChange={e => setCustomHolidayForm({ ...customHolidayForm, date: e.target.value })}
                        />
                      </div>

                      <button
                        onClick={saveCustomHoliday}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Salva Festività Custom
                      </button>
                    </div>
                  </div>

                  {/* Lista Festività dell'anno */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Festività Infrasettimanali dell'anno {yearSim}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg">
                        Domeniche escluse
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {holidays.map(h => {
                        const dateFormatted = new Date(h.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
                        return (
                          <div key={h.id} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                              <div>
                                <span className="text-xs font-black text-slate-850 dark:text-white uppercase leading-tight block">
                                  {h.name}
                                </span>
                                <span className="text-[10px] block text-slate-500 font-semibold mt-0.5">📅 {dateFormatted}</span>
                              </div>
                              <div className="flex gap-1.5">
                                {h.isCustom ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        const d = new Date(h.date).toISOString().split("T")[0]
                                        setCustomHolidayForm({ id: h.id, name: h.name, date: d })
                                      }}
                                      className="text-slate-400 hover:text-blue-500 px-1 font-bold"
                                      title="Modifica"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => deleteCustomHoliday(h.id)}
                                      className="text-slate-400 hover:text-red-500 px-1 font-bold"
                                      title="Elimina"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[8px] font-black uppercase text-blue-500 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded">Nazionale</span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Personale Assegnato ({h.assignments?.length || 0}):</span>
                                <div className="flex flex-wrap gap-1">
                                  {(h.assignments || []).map((m: any) => (
                                    <span key={m.id} className="text-[9px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                      👮‍♂️ {m.name ? m.name.split(" ")[0] : "Operatore"}
                                    </span>
                                  ))}
                                  {(!h.assignments || h.assignments.length === 0) && (
                                    <span className="text-[10px] text-slate-400 italic">Nessun operatore assegnato direttamente</span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setSelectedHoliday(h)
                                  setAssignedMemberIds((h.assignments || []).map((a: any) => a.id))
                                }}
                                className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-850 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1 font-bold"
                              >
                                👤 Gestisci Personale
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 4: SIMULATOR & PUBLISH */}
          {activeTab === "simulator" && (
            <div className="space-y-6">
              
              {/* Controls bar */}
              <div className="bg-slate-100 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-850/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Anno di Simulazione:</span>
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-xl p-1 border border-slate-200/50 dark:border-slate-800/80 shadow-sm">
                    <button onClick={() => setYearSim(y => y - 1)} className="px-3 py-1 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 rounded">←</button>
                    <span className="font-black text-sm text-slate-900 dark:text-white px-4">{yearSim}</span>
                    <button onClick={() => setYearSim(y => y + 1)} className="px-3 py-1 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 rounded">→</button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={publishVacations}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Play size={12} /> Pubblica Ferie ({season === "SUMMER" ? "Estate" : "Inverno"})
                  </button>
                  <button
                    onClick={publishHolidays}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Play size={12} /> Pubblica Festivi Infrasettimanali
                  </button>
                </div>
              </div>

              {/* Simulation display side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Vacations Simulation */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-850 space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                      ☀️ Proiezione Ferie Rotatorie per l'anno {yearSim} ({season === "SUMMER" ? "Estate" : "Inverno"})
                    </h3>
                  </div>

                  {groups.length === 0 || periods.length === 0 ? (
                    <p className="text-xs text-slate-450 italic py-6 text-center">Configura almeno un Turno e un Gruppo per visualizzare la simulazione.</p>
                  ) : (
                    <div className="space-y-3">
                      {groups.map(group => {
                        const yearsDiff = yearSim - group.baseYear
                        const baseIndex = periods.findIndex(p => p.id === group.basePeriodId)
                        
                        let currentPeriodName = "Turno non trovato"
                        let currentDates = ""

                        if (baseIndex !== -1) {
                          const activeIndex = (((baseIndex + yearsDiff) % periods.length) + periods.length) % periods.length
                          const activePeriod = periods[activeIndex]
                          currentPeriodName = activePeriod.name
                          currentDates = `${String(activePeriod.startDay).padStart(2, '0')}/${String(activePeriod.startMonth).padStart(2, '0')} - ${String(activePeriod.endDay).padStart(2, '0')}/${String(activePeriod.endMonth).padStart(2, '0')}`
                        }

                        return (
                          <div key={group.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black uppercase text-slate-800 dark:text-white">{group.name}</span>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {group.members.map((m: any) => (
                                  <span key={m.id} className="text-[9px] font-bold bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-150 dark:border-slate-800">
                                    {m.name.split(" ")[0]}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 px-2.5 py-1 rounded-xl block uppercase">
                                {currentPeriodName}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold block mt-1">📅 {currentDates}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Midweek Holidays Simulation */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-850 space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                      🚨 Proiezione Turni Festivi Infrasettimanali per l'anno {yearSim}
                    </h3>
                  </div>

                  {holidayGroups.length === 0 ? (
                    <p className="text-xs text-slate-455 italic py-6 text-center">Configura almeno un Gruppo Festivo per visualizzare la simulazione.</p>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {getMidweekHolidaysSim(yearSim).map((holiday, idx) => {
                        // Calcola quale gruppo festivo è di turno
                        const baseYear = holidayGroups[0].baseYear || 2026
                        const yearsDiff = yearSim - baseYear
                        const groupIndex = (((idx + yearsDiff) % holidayGroups.length) + holidayGroups.length) % holidayGroups.length
                        const groupOnDuty = holidayGroups[groupIndex]

                        return (
                          <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                              <span className="text-xs font-black text-slate-800 dark:text-white uppercase block">{holiday.name}</span>
                              <span className="text-[9px] font-black uppercase text-emerald-650 dark:text-emerald-555 tracking-widest mt-1 block">Gruppo di turno: {groupOnDuty?.name || "Nessuno"}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-[150px] justify-end">
                              {groupOnDuty?.members.map((m: any) => (
                                <span key={m.id} className="text-[8px] font-bold bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-150 dark:border-slate-800">
                                  {m.name.split(" ")[0]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Informative helper box */}
              <div className="bg-blue-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-blue-100/60 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
                <div className="text-xs space-y-1">
                  <p className="font-black text-slate-800 dark:text-white uppercase">Come funziona l'automazione dei festivi infrasettimanali?</p>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Il sistema recupera automaticamente l'elenco di tutti i giorni festivi ufficiali italiani nel corso dell'anno solare, rimuovendo le domeniche (che seguono i consueti turni festivi). Per ciascuno dei giorni rimanenti (Capodanno, Ferragosto, Pasquetta, ecc.), l'algoritmo Round-Robin assegna un gruppo festivo a rotazione. Di anno in anno, l'assegnazione slitta automaticamente di una posizione, garantendo equità totale tra gli operatori.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL GESTIONE ASSEGNAZIONE PERSONALE FESTIVO */}
      {selectedHoliday && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-850 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">Assegnazione Personale</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase mt-1.5">{selectedHoliday.name}</h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  📅 {new Date(selectedHoliday.date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => setSelectedHoliday(null)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* User Search & Selection */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <input
                type="text"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-xs font-bold outline-none placeholder-slate-400"
                placeholder="Cerca operatore..."
                value={holidaySearchQueryText}
                onChange={e => setHolidaySearchQueryText(e.target.value)}
              />

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {users
                  .filter(u => 
                    u.name?.toLowerCase().includes(holidaySearchQueryText.toLowerCase()) || 
                    u.matricola?.toLowerCase().includes(holidaySearchQueryText.toLowerCase())
                  )
                  .map(u => {
                    const isChecked = assignedMemberIds.includes(u.id)
                    const isExcluded = selectedHoliday.excludedUserIds?.includes(u.id)

                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isExcluded
                            ? "bg-red-50/30 dark:bg-red-955/5 border-red-100 dark:border-red-900/20 opacity-75"
                            : isChecked
                            ? "bg-slate-50 dark:bg-slate-900/50 border-slate-350 dark:border-slate-800"
                            : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isExcluded}
                            onChange={() => {
                              if (isChecked) {
                                setAssignedMemberIds(assignedMemberIds.filter(id => id !== u.id))
                              } else {
                                setAssignedMemberIds([...assignedMemberIds, u.id])
                              }
                            }}
                            className={`rounded border-slate-300 text-slate-900 focus:ring-slate-500/25 h-4 w-4 ${isExcluded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          />
                          <div className="text-xs">
                            <p className={`font-black uppercase leading-tight ${isExcluded ? "text-slate-400 line-through font-bold" : "text-slate-850 dark:text-white"}`}>
                              {u.name}
                            </p>
                            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">{u.qualifica || "Agente"} ({u.matricola})</span>
                          </div>
                        </div>

                        <div>
                          {isExcluded ? (
                            <span className="text-[8px] font-black uppercase text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-2 py-0.5 rounded-lg">
                              🏖️ In Ferie (Escluso)
                            </span>
                          ) : isChecked ? (
                            <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 px-2 py-0.5 rounded-lg font-bold">
                              Assegnato
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg">
                              Disponibile
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 flex gap-3">
              <button
                onClick={() => setSelectedHoliday(null)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={saveHolidayAssignments}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Salva Assegnazioni
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
