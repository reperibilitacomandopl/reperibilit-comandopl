"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, Info, Coffee, Moon, Sun, Shield, Clock, TrendingUp, TrendingDown } from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"

interface CodiceDetail {
  label: string
  value: number
  unit: string
}

interface PayrollData {
  id: string
  nome: string
  matricola: string
  qualifica: string
  codici: Record<string, CodiceDetail>
  repFeriale: number
  repFestiva: number
  oreDiurne: number
  oreNotturne: number
  oreFestive: number
  oreFestiveNotturne: number
  buoniPasto: number
  indennitaTurno: number
  indennitaOP: number
  indennitaTotale: number
}

// Colonne fisse calcolate (sempre visibili)
const FIXED_COLUMNS = [
  { key: "oreDiurne", label: "Ore Diurne", icon: Sun, color: "amber" },
  { key: "oreNotturne", label: "Ore Notturne", icon: Moon, color: "indigo" },
  { key: "oreFestive", label: "Ore Festive", icon: Sun, color: "rose" },
  { key: "oreFestiveNotturne", label: "Ore Festive Nott.", icon: Moon, color: "purple" },
  { key: "buoniPasto", label: "Buoni Pasto", icon: Coffee, color: "emerald" },
  { key: "repFeriale", label: "REP Feriale", icon: Shield, color: "blue" },
  { key: "repFestiva", label: "REP Festiva", icon: Shield, color: "rose" },
  { key: "indennitaTotale", label: "Indennità Stima (€)", icon: TrendingUp, color: "purple" },
]

export default function ExportPaghePanel() {
  const today = new Date()
  const firstDayStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const lastDayStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(firstDayStr)
  const [dateTo, setDateTo] = useState(lastDayStr)
  const [selectedAgentId, setSelectedAgentId] = useState("")
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PayrollData[]>([])
  
  // All possible codes from Agenda
  const allPossibleCodes = AGENDA_CATEGORIES.flatMap(c => c.items)
  
  // Custom columns selector
  const [selectedExtraCodes, setSelectedExtraCodes] = useState<string[]>([])
  const [showCodeFilter, setShowCodeFilter] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/export-paghe?startDate=${dateFrom}&endDate=${dateTo}`)
      if (res.ok) setData(await res.json())
      else toast.error("Errore caricamento dati paghe")
    } catch {
      toast.error("Errore connessione server")
    }
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  const filteredData = data.filter(d => selectedAgentId ? d.id === selectedAgentId : true)

  // Raccoglie tutti i codici assenza univoci dal dataset
  const dataCodiciMap = new Map<string, string>()
  filteredData.forEach(d => {
    Object.entries(d.codici).forEach(([code, detail]) => {
      if (!dataCodiciMap.has(code)) dataCodiciMap.set(code, detail.label)
    })
  })

  // Selezioniamo automaticamente i codici presenti nei dati se non è stato fatto manualmente
  useEffect(() => {
    if (data.length > 0 && selectedExtraCodes.length === 0) {
      setSelectedExtraCodes(Array.from(dataCodiciMap.keys()))
    }
  }, [data])

  // Codici da mostrare (filtrati)
  const columnsToShow = selectedExtraCodes.map(code => {
    const fromPossible = allPossibleCodes.find(c => c.code === code || (c as any).shortCode === code)
    if (fromPossible) return { code, label: fromPossible.label }
    return { code, label: dataCodiciMap.get(code) || code }
  }).sort((a, b) => a.code.localeCompare(b.code))

  const toggleCode = (code: string) => {
    setSelectedExtraCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    const formatted = filteredData.map(d => {
      const row: any = {
        "Matricola": d.matricola,
        "Nominativo": d.nome,
        "Qualifica": d.qualifica,
        "Ore Diurne": d.oreDiurne,
        "Ore Notturne": d.oreNotturne,
        "Ore Festive": d.oreFestive,
        "Ore Festive Nott.": d.oreFestiveNotturne,
        "Buoni Pasto": d.buoniPasto,
        "REP Feriale (h)": d.repFeriale,
        "REP Festiva (h)": d.repFestiva,
        "Indennità Turno (€)": d.indennitaTurno,
        "Indennità OP (€)": d.indennitaOP,
        "Indennità Totale (€)": d.indennitaTotale,
      }
      // Colonne dinamiche assenze/codici
      columnsToShow.forEach(({ code, label }) => {
        const detail = d.codici[code]
        row[`${code} - ${label}`] = detail ? detail.value : 0
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(formatted)
    
    // Auto-width colonne
    const colWidths = Object.keys(formatted[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 12) }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, `Export Paghe`)
    XLSX.writeFile(wb, `Export_Ragioneria_${dateFrom}_al_${dateTo}.xlsx`)
    toast.success("Tracciato Ragioneria scaricato!")
  }

  const exportCSV = () => {
    const header = [
      "MATRICOLA", "NOMINATIVO", "QUALIFICA",
      "ORE DIURNE", "ORE NOTTURNE", "ORE FESTIVE", "ORE FESTIVE NOTT.", "BUONI PASTO", 
      "REP FERIALE (h)", "REP FESTIVA (h)", "INDENNITÀ TURNO (€)", "INDENNITÀ OP (€)", "INDENNITÀ TOTALE (€)",
      ...columnsToShow.map(({ code, label }) => `${code} - ${label}`)
    ]

    const rows = filteredData.map(d => [
      d.matricola, d.nome, d.qualifica,
      d.oreDiurne.toString(), d.oreNotturne.toString(), d.oreFestive.toString(), d.oreFestiveNotturne.toString(), d.buoniPasto.toString(),
      d.repFeriale.toString(), d.repFestiva.toString(), d.indennitaTurno.toString(), d.indennitaOP.toString(), d.indennitaTotale.toString(),
      ...columnsToShow.map(({ code }) => (d.codici[code]?.value || 0).toString())
    ])

    const csv = [header, ...rows].map(r => r.join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Export_Ragioneria_${dateFrom}_al_${dateTo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV Ragioneria scaricato!")
  }

  // TOTALI Footer
  const totals = {
    oreDiurne: Math.round(filteredData.reduce((s, d) => s + d.oreDiurne, 0) * 100) / 100,
    oreNotturne: Math.round(filteredData.reduce((s, d) => s + d.oreNotturne, 0) * 100) / 100,
    oreFestive: Math.round(filteredData.reduce((s, d) => s + d.oreFestive, 0) * 100) / 100,
    oreFestiveNotturne: Math.round(filteredData.reduce((s, d) => s + d.oreFestiveNotturne, 0) * 100) / 100,
    buoniPasto: filteredData.reduce((s, d) => s + d.buoniPasto, 0),
    repFeriale: Math.round(filteredData.reduce((s, d) => s + d.repFeriale, 0) * 100) / 100,
    repFestiva: Math.round(filteredData.reduce((s, d) => s + d.repFestiva, 0) * 100) / 100,
    indennitaTotale: Math.round(filteredData.reduce((s, d) => s + d.indennitaTotale, 0) * 100) / 100,
  }

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-purple-100 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-purple-600" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Export Ragioneria</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Flusso Paghe Avanzato • Timbrature + Pianificazione</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Da</span>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700"
            />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">A</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="text-sm font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-slate-700"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2">
            <select
              value={selectedAgentId}
              onChange={e => setSelectedAgentId(e.target.value)}
              className="text-sm font-bold bg-white border border-slate-200 rounded-lg px-3 py-1 outline-none text-slate-700 min-w-[200px]"
            >
              <option value="">Tutti gli Operatori</option>
              {data.map(d => (
                <option key={d.id} value={d.id}>{d.nome} ({d.matricola})</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowCodeFilter(!showCodeFilter)}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              Filtro Colonne ({selectedExtraCodes.length})
            </button>
            {showCodeFilter && (
              <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl z-50 p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Codici Agenda</span>
                  <div className="space-x-2">
                    <button onClick={() => setSelectedExtraCodes(allPossibleCodes.map(c => c.code))} className="text-[10px] text-blue-600 font-bold uppercase hover:underline">Tutti</button>
                    <button onClick={() => setSelectedExtraCodes([])} className="text-[10px] text-slate-400 font-bold uppercase hover:underline">Nessuno</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {allPossibleCodes.map(c => (
                    <label key={c.code} className="flex items-start gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={selectedExtraCodes.includes(c.code)}
                        onChange={() => toggleCode(c.code)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{c.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{c.code}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={exportExcel}
            disabled={data.length === 0}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> XLSX
          </button>
          <button 
            onClick={exportCSV}
            disabled={data.length === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* INFO CARD */}
      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <p className="text-sm text-purple-800 font-medium">
          Questo modulo incrocia automaticamente le <strong>timbrature reali</strong> (GPS/Web) con la <strong>pianificazione turni e agenda</strong> per generare il flusso paghe completo. Le ore sono espresse in formato centesimale (es. 6.5 = 6h 30min). I Buoni Pasto vengono calcolati secondo le regole configurate nelle Impostazioni.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {FIXED_COLUMNS.map(col => {
            const val = totals[col.key as keyof typeof totals]
            return (
              <div key={col.key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <col.icon className={`w-4 h-4 text-${col.color}-500`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.label}</span>
                </div>
                <p className={`text-2xl font-black text-${col.color}-600`}>{val}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* ANOMALY DETECTION */}
      {!loading && filteredData.length > 0 && (() => {
        const anomalies: { agent: string; issue: string; severity: 'warning' | 'error' }[] = []
        filteredData.forEach(d => {
          const totStr = (d.codici["2000"]?.value || 0) + (d.codici["2001"]?.value || 0) + (d.codici["2002"]?.value || 0) + (d.codici["2003"]?.value || 0) + (d.codici["2020"]?.value || 0) + (d.codici["2021"]?.value || 0);
          if (totStr > 40) anomalies.push({ agent: d.nome, issue: `Straordinario eccessivo: ${totStr}h (max consigliato: 40h)`, severity: 'error' })
          if (d.buoniPasto > 26) anomalies.push({ agent: d.nome, issue: `Buoni pasto anomali: ${d.buoniPasto} (max giorni lavorativi: ~22)`, severity: 'warning' })
          if (d.oreDiurne === 0 && d.oreNotturne === 0 && d.repFeriale === 0 && d.repFestiva === 0) {
            anomalies.push({ agent: d.nome, issue: 'Nessuna ora registrata nel mese', severity: 'warning' })
          }
          if (d.oreDiurne + d.oreNotturne > 220) anomalies.push({ agent: d.nome, issue: `Ore totali anomale: ${(d.oreDiurne + d.oreNotturne).toFixed(1)}h`, severity: 'error' })
        })
        if (anomalies.length === 0) return null
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Info className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">⚠ Anomalie Rilevate ({anomalies.length})</h3>
                <p className="text-[10px] text-amber-600 font-bold">Verificare prima dell&apos;export alla Ragioneria</p>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {anomalies.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 px-4 py-2.5 rounded-xl text-xs font-bold ${a.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-amber-100/50 text-amber-800 border border-amber-100'}`}>
                  <span className="shrink-0">{a.severity === 'error' ? '🔴' : '🟡'}</span>
                  <span><strong>{a.agent}</strong> — {a.issue}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 sticky left-0 bg-slate-50 z-20 min-w-[60px]">Matr.</th>
                <th className="p-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[160px]">Agente</th>
                <th className="p-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 min-w-[80px]">Qualifica</th>
                {/* COLONNE FISSE CALCOLATE */}
                {FIXED_COLUMNS.map(col => (
                  <th key={col.key} className={`p-3 text-center text-[10px] font-black uppercase tracking-widest border-b border-slate-200 min-w-[90px] text-${col.color}-600 bg-${col.color}-50/50`}>
                    {col.label}
                  </th>
                ))}
                {/* COLONNE DINAMICHE ASSENZE (codice + descrizione) */}
                {columnsToShow.map(({code, label}) => (
                  <th key={code} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 min-w-[120px]">
                    <div className="text-slate-600 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[9px] inline-block mb-0.5">{code}</div>
                    <div className="text-[8px] text-slate-400 font-bold normal-case leading-tight">{label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={100} className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" /></td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={100} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Nessun dato per i filtri selezionati</td></tr>
              ) : (
                <>
                  {filteredData.map((row, i) => (
                    <tr key={row.id} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-purple-50/50 transition-colors`}>
                      <td className="p-3 text-xs font-mono text-slate-500 border-b border-slate-50 sticky left-0 bg-inherit z-10">{row.matricola}</td>
                      <td className="p-3 font-bold text-slate-800 border-b border-slate-50">{row.nome}</td>
                      <td className="p-3 text-xs text-slate-500 border-b border-slate-50 uppercase">{row.qualifica}</td>
                      {/* Valori colonne fisse */}
                      {FIXED_COLUMNS.map(col => {
                        const val = row[col.key as keyof PayrollData] as number
                        return (
                          <td key={col.key} className={`p-3 text-center border-b border-slate-50 font-black`}>
                            {val > 0 ? <span className={`text-${col.color}-600`}>{val}</span> : <span className="text-slate-300">-</span>}
                          </td>
                        )
                      })}
                      {/* Valori colonne dinamiche */}
                      {columnsToShow.map(({code}) => {
                        const detail = row.codici[code]
                        return (
                          <td key={code} className="p-3 text-center border-b border-slate-50 font-bold">
                            {detail && detail.value > 0 ? (
                              <span className="text-purple-600">{detail.value} <span className="text-[9px] text-slate-400">{detail.unit}</span></span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* FOOTER TOTALI */}
                  <tr className="bg-slate-900 text-white font-black text-sm">
                    <td className="p-3 sticky left-0 bg-slate-900 z-10"></td>
                    <td className="p-3 uppercase tracking-widest text-xs">Totale Comando</td>
                    <td className="p-3"></td>
                    {FIXED_COLUMNS.map(col => (
                      <td key={col.key} className="p-3 text-center">{totals[col.key as keyof typeof totals]}</td>
                    ))}
                    {columnsToShow.map(({code}) => {
                      const total = filteredData.reduce((s, d) => s + (d.codici[code]?.value || 0), 0)
                      return <td key={code} className="p-3 text-center">{total > 0 ? total : "-"}</td>
                    })}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
