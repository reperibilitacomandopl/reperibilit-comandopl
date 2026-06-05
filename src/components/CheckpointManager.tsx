"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useTheme } from "@/hooks/useTheme"
import {
  Shield, Search, Plus, Download, Upload, Eye, Edit3, Trash2,
  MapPin, Clock, Car, AlertTriangle, ChevronDown, ChevronUp,
  X, Save, FileText, TrendingUp, BarChart3, Calendar, Users, FileSearch
} from "lucide-react"
import CdsViolationSearch from "@/components/CdsViolationSearch"
import CheckpointImporter from "./CheckpointImporter"
import CheckpointStats from "./CheckpointStats"

type Checkpoint = {
  id: string
  dataControllo: string
  oraInizio: string
  oraFine: string
  luogo: string
  lat: number | null
  lng: number | null
  operatori: string | null
  veicoloServizio: string | null
  note: string | null
  importSource: string
  createdAt: string
  operator?: { id: string; name: string; matricola: string } | null
  _count?: { vehicles: number }
  vehicles?: Vehicle[]
}

type Vehicle = {
  id: string
  oraControllo: string | null
  targa: string
  tipoVeicolo: string | null
  marcaModello: string | null
  ultimaRevisione: string | null
  assicurazione: string | null
  assicuratoFino: string | null
  proprietarioNome: string | null
  proprietarioCognome: string | null
  conducenteStessoProp: boolean
  conducenteNome: string | null
  conducenteCognome: string | null
  sanzioneElevata: string | null
  sanzioneAccessoria: string | null
  patenteNumero: string | null
  passeggeroNome: string | null
  passeggeroCognome: string | null
}

type Stats = {
  controlliTotali: number
  controlliOggi: number
  controlliMese: number
  controlliAnno: number
  veicoliTotali: number
  veicoliConSanzione: number
  veicoliRevisioneScaduta: number
  veicoliAssicurazioneScaduta: number
  andamentoMensile: any[]
  controlliPerLuogo: any[]
  targheMultiple: any[]
  mediaVeicoli: number
  percSanzioni: number
}

type TabType = "lista" | "nuovo" | "importa" | "statistiche"

export default function CheckpointManager() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { isDark } = useTheme()
  const [tab, setTab] = useState<TabType>("lista")
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showVehicleForm, setShowVehicleForm] = useState<string | null>(null)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)

  // Form state for new checkpoint
  const [newForm, setNewForm] = useState({
    dataControllo: new Date().toISOString().split('T')[0],
    oraInizio: "07:00", oraFine: "13:00", luogo: "", operatori: "", veicoloServizio: "", note: ""
  })

  // New vehicle form
  const [vehicleForm, setVehicleForm] = useState({
    oraControllo: "", targa: "", tipoVeicolo: "AUTOVETTURA", marcaModello: "",
    ultimaRevisione: "", assicurazione: "", assicuratoFino: "",
    proprietarioNome: "", proprietarioCognome: "", proprietarioDataNascita: "",
    proprietarioLuogoNascita: "", proprietarioResidenza: "", proprietarioIndirizzo: "",
    conducenteStessoProp: true,
    conducenteNome: "", conducenteCognome: "", conducenteDataNascita: "",
    conducenteLuogoNascita: "", conducenteResidenza: "", conducenteIndirizzo: "",
    patenteNumero: "", patenteRilasciataDa: "", patenteDataRilascio: "", patenteValiditaFino: "",
    passeggeroNome: "", passeggeroCognome: "", passeggeroDataNascita: "",
    passeggeroLuogoNascita: "", passeggeroResidenza: "", passeggeroIndirizzo: "",
    sanzioneElevata: "", sanzioneAccessoria: ""
  })
  
  const [activeSection, setActiveSection] = useState("dati_base")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [resCheckpoints, resStats] = await Promise.all([
        fetch('/api/admin/checkpoints'),
        fetch('/api/admin/checkpoints/stats')
      ])
      if (resCheckpoints.ok) {
        const data = await resCheckpoints.json()
        setCheckpoints(data.checkpoints || [])
      }
      if (resStats.ok) setStats(await resStats.json())
    } catch (err) {
      console.error("Errore caricamento dati:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createCheckpoint = async () => {
    try {
      const res = await fetch('/api/admin/checkpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm)
      })
      if (res.ok) {
        setTab("lista")
        setNewForm({ dataControllo: new Date().toISOString().split('T')[0], oraInizio: "07:00", oraFine: "13:00", luogo: "", operatori: "", veicoloServizio: "", note: "" })
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const deleteCheckpoint = async (id: string) => {
    if (!confirm("Eliminare questo controllo e tutti i veicoli associati?")) return
    try {
      const res = await fetch(`/api/admin/checkpoints/${id}`, { method: 'DELETE' })
      if (res.ok) fetchData()
    } catch (err) { console.error(err) }
  }

  const expandCheckpoint = async (id: string, forceRefresh = false) => {
    if (expandedId === id && !forceRefresh) { setExpandedId(null); return }
    try {
      const res = await fetch(`/api/admin/checkpoints/${id}`)
      if (res.ok) {
        const data = await res.json()
        setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, vehicles: data.vehicles } : c))
        setExpandedId(id)
      }
    } catch (err) { console.error(err) }
  }

  const addVehicle = async (checkpointId: string) => {
    if (!vehicleForm.targa) return
    try {
      const isEditing = !!editingVehicleId
      const url = isEditing 
        ? `/api/admin/checkpoints/${checkpointId}/vehicles/${editingVehicleId}`
        : `/api/admin/checkpoints/${checkpointId}/vehicles`
      const method = isEditing ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm)
      })
      if (res.ok) {
        setVehicleForm({
          oraControllo: "", targa: "", tipoVeicolo: "AUTOVETTURA", marcaModello: "",
          ultimaRevisione: "", assicurazione: "", assicuratoFino: "",
          proprietarioNome: "", proprietarioCognome: "", proprietarioDataNascita: "",
          proprietarioLuogoNascita: "", proprietarioResidenza: "", proprietarioIndirizzo: "",
          conducenteStessoProp: true,
          conducenteNome: "", conducenteCognome: "", conducenteDataNascita: "",
          conducenteLuogoNascita: "", conducenteResidenza: "", conducenteIndirizzo: "",
          patenteNumero: "", patenteRilasciataDa: "", patenteDataRilascio: "", patenteValiditaFino: "",
          passeggeroNome: "", passeggeroCognome: "", passeggeroDataNascita: "",
          passeggeroLuogoNascita: "", passeggeroResidenza: "", passeggeroIndirizzo: "",
          sanzioneElevata: "", sanzioneAccessoria: ""
        })
        setShowVehicleForm(null)
        setEditingVehicleId(null)
        expandCheckpoint(checkpointId, true)
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const startEditVehicle = (checkpointId: string, v: Vehicle) => {
    const formatDateInput = (iso: string | null | undefined) => iso ? new Date(iso).toISOString().split('T')[0] : "";
    setVehicleForm({
      oraControllo: v.oraControllo || "",
      targa: v.targa || "",
      tipoVeicolo: v.tipoVeicolo || "AUTOVETTURA",
      marcaModello: v.marcaModello || "",
      ultimaRevisione: formatDateInput(v.ultimaRevisione),
      assicurazione: v.assicurazione || "",
      assicuratoFino: formatDateInput(v.assicuratoFino),
      proprietarioNome: v.proprietarioNome || "",
      proprietarioCognome: v.proprietarioCognome || "",
      proprietarioDataNascita: formatDateInput((v as any).proprietarioDataNascita),
      proprietarioLuogoNascita: (v as any).proprietarioLuogoNascita || "",
      proprietarioResidenza: (v as any).proprietarioResidenza || "",
      proprietarioIndirizzo: (v as any).proprietarioIndirizzo || "",
      conducenteStessoProp: v.conducenteStessoProp ?? true,
      conducenteNome: v.conducenteNome || "",
      conducenteCognome: v.conducenteCognome || "",
      conducenteDataNascita: formatDateInput((v as any).conducenteDataNascita),
      conducenteLuogoNascita: (v as any).conducenteLuogoNascita || "",
      conducenteResidenza: (v as any).conducenteResidenza || "",
      conducenteIndirizzo: (v as any).conducenteIndirizzo || "",
      patenteNumero: v.patenteNumero || "",
      patenteRilasciataDa: (v as any).patenteRilasciataDa || "",
      patenteDataRilascio: formatDateInput((v as any).patenteDataRilascio),
      patenteValiditaFino: formatDateInput((v as any).patenteValiditaFino),
      passeggeroNome: v.passeggeroNome || "",
      passeggeroCognome: v.passeggeroCognome || "",
      passeggeroDataNascita: formatDateInput((v as any).passeggeroDataNascita),
      passeggeroLuogoNascita: (v as any).passeggeroLuogoNascita || "",
      passeggeroResidenza: (v as any).passeggeroResidenza || "",
      passeggeroIndirizzo: (v as any).passeggeroIndirizzo || "",
      sanzioneElevata: v.sanzioneElevata || "",
      sanzioneAccessoria: v.sanzioneAccessoria || ""
    });
    setEditingVehicleId(v.id);
    setShowVehicleForm(checkpointId);
    setActiveSection("dati_base");
  };

  const deleteVehicle = async (checkpointId: string, vehicleId: string) => {
    if (!confirm("Eliminare questo veicolo?")) return
    try {
      const res = await fetch(`/api/admin/checkpoints/${checkpointId}/vehicles/${vehicleId}`, { method: 'DELETE' })
      if (res.ok) { expandCheckpoint(checkpointId, true); fetchData() }
    } catch (err) { console.error(err) }
  }

  const exportExcel = async (checkpointId?: string) => {
    const url = checkpointId ? `/api/admin/checkpoints/export?id=${checkpointId}` : '/api/admin/checkpoints/export'
    const res = await fetch(url)
    if (res.ok) {
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = checkpointId ? 'controllo.xlsx' : 'controlli_export.xlsx'
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    } catch { return iso }
  }

  const filteredCheckpoints = checkpoints.filter(c =>
    c.luogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.operatori || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Style helpers
  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const inputBg = isDark ? "bg-slate-950 border-white/10 text-white placeholder-white/30" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  const rowHover = isDark ? "hover:bg-white/5" : "hover:bg-slate-50"
  const mutedText = isDark ? "text-white/40" : "text-slate-400"

  return (
    <div className={`p-4 sm:p-8 max-w-7xl mx-auto space-y-8 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Shield size={20} />
            </div>
            Posti di Controllo
          </h1>
          <p className={`text-sm font-medium mt-1 ${mutedText}`}>Gestione controlli stradali, veicoli e importazione OCR</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["lista", "nuovo", "importa", "statistiche"] as TabType[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${tab === t
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : isDark ? "bg-white/5 text-white/60 hover:bg-white/10" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {t === "lista" && <><FileText size={14} className="inline mr-2" />Lista</>}
              {t === "nuovo" && <><Plus size={14} className="inline mr-2" />Nuovo</>}
              {t === "importa" && <><Upload size={14} className="inline mr-2" />Importa OCR</>}
              {t === "statistiche" && <><BarChart3 size={14} className="inline mr-2" />Statistiche</>}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      {stats && tab === "lista" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-5 rounded-2xl border ${cardBg} shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedText} mb-1`}>Controlli Oggi</p>
            <div className="text-2xl font-black">{stats.controlliOggi}</div>
            <div className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1"><Calendar size={12}/> {stats.controlliMese} questo mese</div>
          </div>
          <div className={`p-5 rounded-2xl border ${cardBg} shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedText} mb-1`}>Veicoli Controllati</p>
            <div className="text-2xl font-black">{stats.veicoliTotali}</div>
            <div className="text-xs text-cyan-500 font-bold mt-2 flex items-center gap-1"><Car size={12}/> media {stats.mediaVeicoli}/controllo</div>
          </div>
          <div className={`p-5 rounded-2xl border ${cardBg} shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedText} mb-1`}>Sanzioni Elevate</p>
            <div className="text-2xl font-black text-amber-500">{stats.veicoliConSanzione}</div>
            <div className="text-xs text-amber-500 font-bold mt-2">{stats.percSanzioni}% dei controlli</div>
          </div>
          <div className={`p-5 rounded-2xl border ${cardBg} shadow-sm`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedText} mb-1`}>Anomalie</p>
            <div className="text-2xl font-black text-rose-500">{stats.veicoliRevisioneScaduta + stats.veicoliAssicurazioneScaduta}</div>
            <div className="text-xs text-rose-500 font-bold mt-2 flex items-center gap-1"><AlertTriangle size={12}/> Rev: {stats.veicoliRevisioneScaduta} · Ass: {stats.veicoliAssicurazioneScaduta}</div>
          </div>
        </div>
      )}

      {/* TAB: LISTA */}
      {tab === "lista" && (
        <div className={`rounded-3xl border ${cardBg} overflow-hidden shadow-sm`}>
          {/* Search + Export */}
          <div className={`p-4 border-b ${isDark ? "border-white/5 bg-slate-950/60" : "border-slate-200 bg-slate-50"} flex flex-col sm:flex-row gap-4 justify-between items-center`}>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
              <input type="text" placeholder="Cerca per luogo o operatore..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none ${inputBg}`} />
            </div>
            <button onClick={() => exportExcel()}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
              <Download size={16} /> Esporta Excel
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className={`text-xs uppercase font-black tracking-wider opacity-60 ${isDark ? "bg-slate-950/50" : "bg-slate-50"}`}>
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Luogo</th>
                  <th className="px-6 py-4">Orario</th>
                  <th className="px-6 py-4">Operatori</th>
                  <th className="px-6 py-4 text-center">Veicoli</th>
                  <th className="px-6 py-4">Fonte</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-white/5" : "divide-slate-100"}`}>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center opacity-50">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      Caricamento controlli...
                    </div>
                  </td></tr>
                ) : filteredCheckpoints.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center opacity-50">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-bold">Nessun controllo trovato</p>
                    <p className="text-xs mt-1 opacity-60">Crea un nuovo controllo o importa una scheda</p>
                  </td></tr>
                ) : filteredCheckpoints.map(c => (
                  <>
                    <tr key={c.id} className={`group transition-colors ${rowHover} cursor-pointer`} onClick={() => expandCheckpoint(c.id)}>
                      <td className="px-6 py-4 font-bold">{formatDate(c.dataControllo)}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold flex items-center gap-1.5"><MapPin size={12} className="text-blue-500" /> {c.luogo}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${isDark ? "bg-white/5" : "bg-slate-100"}`}>{c.oraInizio} - {c.oraFine}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold flex items-center gap-1"><Users size={12} className="opacity-40" /> {c.operatori || c.operator?.name || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded-lg text-xs font-bold">
                          {c._count?.vehicles || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          c.importSource === 'MANUALE' ? 'bg-slate-500/10 text-slate-400' :
                          'bg-purple-500/10 text-purple-500'
                        }`}>
                          {c.importSource === 'MANUALE' ? 'Manuale' : 'OCR'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => exportExcel(c.id)} className={`p-1.5 rounded-lg ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`} title="Esporta">
                            <Download size={14} />
                          </button>
                          <button onClick={() => deleteCheckpoint(c.id)} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all" title="Elimina">
                            <Trash2 size={14} />
                          </button>
                          {expandedId === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Vehicle Details */}
                    {expandedId === c.id && (
                      <tr key={`${c.id}-exp`}>
                        <td colSpan={7} className={`px-6 py-6 ${isDark ? "bg-slate-950/40" : "bg-slate-50/80"}`}>
                          <div className="space-y-4">
                            {/* Vehicle header */}
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                <Car size={16} className="text-cyan-500" /> Veicoli Controllati ({c.vehicles?.length || 0})
                              </h4>
                              <button onClick={() => {
                                setEditingVehicleId(null);
                                setVehicleForm({
                                  oraControllo: "", targa: "", tipoVeicolo: "AUTOVETTURA", marcaModello: "",
                                  ultimaRevisione: "", assicurazione: "", assicuratoFino: "",
                                  proprietarioNome: "", proprietarioCognome: "", proprietarioDataNascita: "",
                                  proprietarioLuogoNascita: "", proprietarioResidenza: "", proprietarioIndirizzo: "",
                                  conducenteStessoProp: true,
                                  conducenteNome: "", conducenteCognome: "", conducenteDataNascita: "",
                                  conducenteLuogoNascita: "", conducenteResidenza: "", conducenteIndirizzo: "",
                                  patenteNumero: "", patenteRilasciataDa: "", patenteDataRilascio: "", patenteValiditaFino: "",
                                  passeggeroNome: "", passeggeroCognome: "", passeggeroDataNascita: "",
                                  passeggeroLuogoNascita: "", passeggeroResidenza: "", passeggeroIndirizzo: "",
                                  sanzioneElevata: "", sanzioneAccessoria: ""
                                });
                                setShowVehicleForm(showVehicleForm === c.id ? null : c.id);
                              }}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all">
                                <Plus size={14} /> Aggiungi Veicolo
                              </button>
                            </div>

                            {/* Add vehicle form */}
                            {showVehicleForm === c.id && (
                              <div className={`p-4 rounded-2xl border ${cardBg} space-y-4`}>
                                {/* Tabs */}
                                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                                  {[
                                    {id: "dati_base", label: "Veicolo"},
                                    {id: "proprietario", label: "Proprietario"},
                                    {id: "conducente", label: "Conducente"},
                                    {id: "patente", label: "Patente"},
                                    {id: "passeggero", label: "Passeggero"},
                                    {id: "sanzioni", label: "Sanzioni"}
                                  ].map(sec => (
                                    <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                                      className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSection === sec.id ? "bg-blue-600 text-white" : isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
                                      {sec.label}
                                    </button>
                                  ))}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                  {activeSection === "dati_base" && (
                                    <>
                                      <input placeholder="Targa *" value={vehicleForm.targa} onChange={e => setVehicleForm(f => ({...f, targa: e.target.value.toUpperCase()}))} className={`col-span-2 px-3 py-2.5 rounded-xl border text-base font-black tracking-widest ${inputBg}`} />
                                      <input placeholder="Ora (HH:MM)" value={vehicleForm.oraControllo} onChange={e => setVehicleForm(f => ({...f, oraControllo: e.target.value}))} className={`px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Tipo (es. Auto)" value={vehicleForm.tipoVeicolo} onChange={e => setVehicleForm(f => ({...f, tipoVeicolo: e.target.value}))} className={`px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Marca/Modello" value={vehicleForm.marcaModello} onChange={e => setVehicleForm(f => ({...f, marcaModello: e.target.value}))} className={`px-3 py-2 col-span-2 rounded-xl border text-sm ${inputBg}`} />
                                      <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold uppercase opacity-60">Scadenza Revisione</label>
                                        <input type="date" value={vehicleForm.ultimaRevisione} onChange={e => setVehicleForm(f => ({...f, ultimaRevisione: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      </div>
                                      <input placeholder="Compagnia Assicurativa" value={vehicleForm.assicurazione} onChange={e => setVehicleForm(f => ({...f, assicurazione: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold uppercase opacity-60">Scadenza Assicurazione</label>
                                        <input type="date" value={vehicleForm.assicuratoFino} onChange={e => setVehicleForm(f => ({...f, assicuratoFino: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      </div>
                                    </>
                                  )}

                                  {activeSection === "proprietario" && (
                                    <>
                                      <input placeholder="Cognome Proprietario" value={vehicleForm.proprietarioCognome} onChange={e => setVehicleForm(f => ({...f, proprietarioCognome: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Nome Proprietario" value={vehicleForm.proprietarioNome} onChange={e => setVehicleForm(f => ({...f, proprietarioNome: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <div className="col-span-2 md:col-span-4 space-y-1">
                                        <label className="text-[10px] font-bold uppercase opacity-60">Data di Nascita</label>
                                        <input type="date" value={vehicleForm.proprietarioDataNascita} onChange={e => setVehicleForm(f => ({...f, proprietarioDataNascita: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      </div>
                                      <input placeholder="Luogo di Nascita" value={vehicleForm.proprietarioLuogoNascita} onChange={e => setVehicleForm(f => ({...f, proprietarioLuogoNascita: e.target.value}))} className={`col-span-2 md:col-span-4 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Residenza (Citta)" value={vehicleForm.proprietarioResidenza} onChange={e => setVehicleForm(f => ({...f, proprietarioResidenza: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Indirizzo" value={vehicleForm.proprietarioIndirizzo} onChange={e => setVehicleForm(f => ({...f, proprietarioIndirizzo: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                    </>
                                  )}

                                  {activeSection === "conducente" && (
                                    <>
                                      <label className="col-span-2 md:col-span-4 flex items-center gap-2 text-xs font-bold bg-black/5 dark:bg-white/5 p-2 rounded-lg cursor-pointer">
                                        <input type="checkbox" checked={vehicleForm.conducenteStessoProp} onChange={e => setVehicleForm(f => ({...f, conducenteStessoProp: e.target.checked}))} className="rounded" />
                                        Il Conducente è il Proprietario
                                      </label>
                                      {!vehicleForm.conducenteStessoProp && (
                                        <>
                                          <input placeholder="Cognome Conducente" value={vehicleForm.conducenteCognome} onChange={e => setVehicleForm(f => ({...f, conducenteCognome: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                          <input placeholder="Nome Conducente" value={vehicleForm.conducenteNome} onChange={e => setVehicleForm(f => ({...f, conducenteNome: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                          <div className="col-span-2 md:col-span-4 space-y-1">
                                            <label className="text-[10px] font-bold uppercase opacity-60">Data di Nascita</label>
                                            <input type="date" value={vehicleForm.conducenteDataNascita} onChange={e => setVehicleForm(f => ({...f, conducenteDataNascita: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                          </div>
                                          <input placeholder="Luogo di Nascita" value={vehicleForm.conducenteLuogoNascita} onChange={e => setVehicleForm(f => ({...f, conducenteLuogoNascita: e.target.value}))} className={`col-span-2 md:col-span-4 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                          <input placeholder="Residenza (Citta)" value={vehicleForm.conducenteResidenza} onChange={e => setVehicleForm(f => ({...f, conducenteResidenza: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                          <input placeholder="Indirizzo" value={vehicleForm.conducenteIndirizzo} onChange={e => setVehicleForm(f => ({...f, conducenteIndirizzo: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                        </>
                                      )}
                                    </>
                                  )}

                                  {activeSection === "patente" && (
                                    <>
                                      <input placeholder="Numero Patente" value={vehicleForm.patenteNumero} onChange={e => setVehicleForm(f => ({...f, patenteNumero: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Rilasciata Da (es. MIT, Prefettura)" value={vehicleForm.patenteRilasciataDa} onChange={e => setVehicleForm(f => ({...f, patenteRilasciataDa: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold uppercase opacity-60">Data Rilascio</label>
                                        <input type="date" value={vehicleForm.patenteDataRilascio} onChange={e => setVehicleForm(f => ({...f, patenteDataRilascio: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      </div>
                                      <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold uppercase opacity-60">Scadenza Patente</label>
                                        <input type="date" value={vehicleForm.patenteValiditaFino} onChange={e => setVehicleForm(f => ({...f, patenteValiditaFino: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      </div>
                                    </>
                                  )}

                                  {activeSection === "passeggero" && (
                                    <>
                                      <input placeholder="Cognome Passeggero" value={vehicleForm.passeggeroCognome} onChange={e => setVehicleForm(f => ({...f, passeggeroCognome: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <input placeholder="Nome Passeggero" value={vehicleForm.passeggeroNome} onChange={e => setVehicleForm(f => ({...f, passeggeroNome: e.target.value}))} className={`col-span-2 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      <div className="col-span-2 md:col-span-4 space-y-1">
                                        <label className="text-[10px] font-bold uppercase opacity-60">Data di Nascita</label>
                                        <input type="date" value={vehicleForm.passeggeroDataNascita} onChange={e => setVehicleForm(f => ({...f, passeggeroDataNascita: e.target.value}))} className={`w-full px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                      </div>
                                      <input placeholder="Luogo di Nascita" value={vehicleForm.passeggeroLuogoNascita} onChange={e => setVehicleForm(f => ({...f, passeggeroLuogoNascita: e.target.value}))} className={`col-span-2 md:col-span-4 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                    </>
                                  )}

                                  {activeSection === "sanzioni" && (
                                    <>
                                      <div className="col-span-2 md:col-span-4 relative z-50 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-xl mb-2">
                                        <CdsViolationSearch 
                                          onSelect={(violation) => {
                                            const artStr = `Art. ${violation.articolo?.articolo || ''} ${violation.comma ? `c. ${violation.comma}` : ''} - ${violation.descrizione}`.substring(0, 255);
                                            const accStr = violation.sanzioneAccessoria || "";
                                            setVehicleForm(f => ({
                                              ...f, 
                                              sanzioneElevata: f.sanzioneElevata ? `${f.sanzioneElevata}\n${artStr}` : artStr,
                                              sanzioneAccessoria: f.sanzioneAccessoria ? (accStr ? `${f.sanzioneAccessoria}\n${accStr}` : f.sanzioneAccessoria) : accStr
                                            }))
                                          }} 
                                        />
                                      </div>
                                      <textarea placeholder="Sanzione Elevata (Testo o importazione)" value={vehicleForm.sanzioneElevata} onChange={e => setVehicleForm(f => ({...f, sanzioneElevata: e.target.value}))} className={`col-span-2 md:col-span-4 px-3 py-2 rounded-xl border text-sm min-h-[80px] ${inputBg}`} />
                                      <input placeholder="Sanzioni Accessorie (es. Sequestro)" value={vehicleForm.sanzioneAccessoria} onChange={e => setVehicleForm(f => ({...f, sanzioneAccessoria: e.target.value}))} className={`col-span-2 md:col-span-4 px-3 py-2 rounded-xl border text-sm ${inputBg}`} />
                                    </>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 justify-end pt-2">
                                  <button onClick={() => setShowVehicleForm(null)} className={`px-4 py-2.5 text-xs font-bold rounded-xl ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>Annulla</button>
                                  <button onClick={() => addVehicle(c.id)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20">
                                    <Save size={14} className="inline mr-1" /> {editingVehicleId ? "Salva Modifiche" : "Salva Veicolo"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Vehicle list */}
                            {c.vehicles && c.vehicles.length > 0 ? (
                              <div className="space-y-2">
                                {c.vehicles.map(v => (
                                  <div key={v.id} className={`p-4 rounded-xl border ${cardBg} flex flex-col sm:flex-row sm:items-center gap-3`}>
                                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Targa</p>
                                        <p className="text-lg font-black tracking-widest">{v.targa}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Veicolo</p>
                                        <p className="text-sm font-bold">{v.tipoVeicolo || '—'} {v.marcaModello ? `• ${v.marcaModello}` : ''}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Proprietario</p>
                                        <p className="text-sm font-bold">{v.proprietarioCognome} {v.proprietarioNome || ''}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Ora</p>
                                        <p className="text-sm font-bold">{v.oraControllo || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Sanzione</p>
                                        {v.sanzioneElevata ? (
                                          <p className="text-sm font-bold text-amber-500">{v.sanzioneElevata}</p>
                                        ) : (
                                          <p className="text-sm opacity-30">—</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 self-end sm:self-center">
                                      <button onClick={() => startEditVehicle(c.id, v)} className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white transition-all" title="Modifica">
                                        <Edit3 size={14} />
                                      </button>
                                      <button onClick={() => deleteVehicle(c.id, v.id)}
                                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all" title="Elimina">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-center text-sm py-4 ${mutedText}`}>Nessun veicolo registrato per questo controllo</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: NUOVO CONTROLLO */}
      {tab === "nuovo" && (
        <div className={`rounded-3xl border ${cardBg} p-6 sm:p-8 shadow-sm`}>
          <h2 className="text-lg font-black mb-6 flex items-center gap-3">
            <Plus size={20} className="text-blue-500" /> Nuovo Posto di Controllo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Data Controllo *</label>
              <input type="date" value={newForm.dataControllo} onChange={e => setNewForm(f => ({...f, dataControllo: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Ora Inizio *</label>
                <input type="time" value={newForm.oraInizio} onChange={e => setNewForm(f => ({...f, oraInizio: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Ora Fine *</label>
                <input type="time" value={newForm.oraFine} onChange={e => setNewForm(f => ({...f, oraFine: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Luogo *</label>
              <input type="text" placeholder="es. Via Roma, Altamura" value={newForm.luogo} onChange={e => setNewForm(f => ({...f, luogo: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Operatori</label>
              <input type="text" placeholder="Nomi operatori" value={newForm.operatori} onChange={e => setNewForm(f => ({...f, operatori: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm ${inputBg}`} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Veicolo di Servizio</label>
              <input type="text" placeholder="es. Pattuglia 01" value={newForm.veicoloServizio} onChange={e => setNewForm(f => ({...f, veicoloServizio: e.target.value}))} className={`w-full px-4 py-3 rounded-xl border text-sm ${inputBg}`} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1 block">Note</label>
              <textarea placeholder="Note aggiuntive..." value={newForm.note} onChange={e => setNewForm(f => ({...f, note: e.target.value}))} rows={3} className={`w-full px-4 py-3 rounded-xl border text-sm ${inputBg} resize-none`} />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={createCheckpoint} disabled={!newForm.luogo || !newForm.dataControllo}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              <Save size={16} /> Crea Controllo
            </button>
          </div>
        </div>
      )}

      {/* TAB: IMPORTA OCR */}
      {tab === "importa" && (
        <CheckpointImporter isDark={isDark} onImportComplete={() => { setTab("lista"); fetchData() }} />
      )}

      {/* TAB: STATISTICHE */}
      {tab === "statistiche" && stats && (
        <CheckpointStats stats={stats} isDark={isDark} />
      )}
    </div>
  )
}
