"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, Info, Coffee, Moon, Sun, Shield, Clock, TrendingUp, TrendingDown } from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

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
  buoniPasto: number
  straordinario: number
}

// Colonne fisse calcolate (sempre visibili)
const FIXED_COLUMNS = [
  { key: "oreDiurne", label: "Ore Diurne", icon: Sun, color: "amber" },
  { key: "oreNotturne", label: "Ore Notturne", icon: Moon, color: "indigo" },
  { key: "buoniPasto", label: "Buoni Pasto", icon: Coffee, color: "emerald" },
  { key: "straordinario", label: "Straordinario (h)", icon: Clock, color: "orange" },
  { key: "repFeriale", label: "REP Feriale (h)", icon: Shield, color: "blue" },
  { key: "repFestiva", label: "REP Festiva (h)", icon: Shield, color: "rose" },
]

export default function ExportPaghePanel() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PayrollData[]>([])
  const [prevData, setPrevData] = useState<PayrollData[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/export-paghe?year=${year}&month=${month}`)
      if (res.ok) setData(await res.json())
      else toast.error("Errore caricamento dati paghe")
    } catch {
      toast.error("Errore connessione server")
    }
    setLoading(false)
  }, [year, month])

  // Load previous month data for comparison
  const loadPrevMonth = useCallback(async () => {
    let pm = month - 1, py = year
    if (pm < 1) { pm = 12; py-- }
    try {
      const res = await fetch(`/api/admin/export-paghe?year=${py}&month=${pm}`)
      if (res.ok) setPrevData(await res.json())
      else setPrevData([])
    } catch { setPrevData([]) }
  }, [year, month])

  useEffect(() => { loadData(); loadPrevMonth() }, [loadData, loadPrevMonth])

  const changeMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m)
    setYear(y)
  }

  // Raccoglie tutti i codici assenza univoci dal dataset (per colonne dinamiche)
  const allCodici = (() => {
    const set = new Map<string, string>()
    data.forEach(d => {
      Object.entries(d.codici).forEach(([code, detail]) => {
        if (!set.has(code)) set.set(code, detail.label)
      })
    })
    return Array.from(set.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  })()

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    const formatted = data.map(d => {
      const row: any = {
        "Matricola": d.matricola,
        "Nominativo": d.nome,
        "Qualifica": d.qualifica,
        "Ore Diurne": d.oreDiurne,
        "Ore Notturne": d.oreNotturne,
        "Buoni Pasto": d.buoniPasto,
        "Straordinario (h)": d.straordinario,
        "REP Feriale (h)": d.repFeriale,
        "REP Festiva (h)": d.repFestiva,
      }
      // Colonne dinamiche assenze/codici
      allCodici.forEach(([code, label]) => {
        const detail = d.codici[code]
        row[`${code} - ${label}`] = detail ? detail.value : 0
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(formatted)
    
    // Auto-width colonne
    const colWidths = Object.keys(formatted[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 12) }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, `Paghe ${String(month).padStart(2, '0')}-${year}`)
    XLSX.writeFile(wb, `Export_Ragioneria_${year}_${String(month).padStart(2, '0')}.xlsx`)
    toast.success("Tracciato Ragioneria scaricato!")
  }

  const exportCSV = () => {
    const header = [
      "MATRICOLA", "NOMINATIVO", "QUALIFICA",
      "ORE DIURNE", "ORE NOTTURNE", "BUONI PASTO", "STRAORDINARIO",
      "REP FERIALE (h)", "REP FESTIVA (h)",
      ...allCodici.map(([code, label]) => `${code} - ${label}`)
    ]

    const rows = data.map(d => [
      d.matricola, d.nome, d.qualifica,
      d.oreDiurne.toString(), d.oreNotturne.toString(), d.buoniPasto.toString(), d.straordinario.toString(),
      d.repFeriale.toString(), d.repFestiva.toString(),
      ...allCodici.map(([code]) => (d.codici[code]?.value || 0).toString())
    ])

    const csv = [header, ...rows].map(r => r.join(";")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Export_Ragioneria_${year}_${String(month).padStart(2, '0')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV Ragioneria scaricato!")
  }

  // TOTALI Footer
  const totals = {
    oreDiurne: Math.round(data.reduce((s, d) => s + d.oreDiurne, 0) * 100) / 100,
    oreNotturne: Math.round(data.reduce((s, d) => s + d.oreNotturne, 0) * 100) / 100,
    buoniPasto: data.reduce((s, d) => s + d.buoniPasto, 0),
    straordinario: Math.round(data.reduce((s, d) => s + d.straordinario, 0) * 100) / 100,
    repFeriale: Math.round(data.reduce((s, d) => s + d.repFeriale, 0) * 100) / 100,
    repFestiva: Math.round(data.reduce((s, d) => s + d.repFestiva, 0) * 100) / 100,
  }

  // Previous month totals for comparison
  const prevTotals = {
    oreDiurne: Math.round(prevData.reduce((s, d) => s + d.oreDiurne, 0) * 100) / 100,
    oreNotturne: Math.round(prevData.reduce((s, d) => s + d.oreNotturne, 0) * 100) / 100,
    buoniPasto: prevData.reduce((s, d) => s + d.buoniPasto, 0),
    straordinario: Math.round(prevData.reduce((s, d) => s + d.straordinario, 0) * 100) / 100,
    repFeriale: Math.round(prevData.reduce((s, d) => s + d.repFeriale, 0) * 100) / 100,
    repFestiva: Math.round(prevData.reduce((s, d) => s + d.repFestiva, 0) * 100) / 100,
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
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-4 font-bold text-sm text-slate-800 min-w-[150px] text-center">
              {new Date(year, month - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase()}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
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
                {/* Delta vs previous month */}
                {prevData.length > 0 && (() => {
                  const prev = prevTotals[col.key as keyof typeof prevTotals]
                  const delta = val - prev
                  if (delta === 0) return <p className="text-[10px] text-slate-400 mt-1 font-bold">=  vs mese prec.</p>
                  const pct = prev > 0 ? Math.round((delta / prev) * 100) : 0
                  return (
                    <p className={`text-[10px] mt-1 font-bold flex items-center gap-1 ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)} ({pct > 0 ? '+' : ''}{pct}%)
                    </p>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {/* ANOMALY DETECTION */}
      {!loading && data.length > 0 && (() => {
        const anomalies: { agent: string; issue: string; severity: 'warning' | 'error' }[] = []
        data.forEach(d => {
          if (d.straordinario > 40) anomalies.push({ agent: d.nome, issue: `Straordinario eccessivo: ${d.straordinario}h (max consigliato: 40h)`, severity: 'error' })
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
                {allCodici.map(([code, label]) => (
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
              ) : data.length === 0 ? (
                <tr><td colSpan={100} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Nessun dato per il periodo selezionato</td></tr>
              ) : (
                <>
                  {data.map((row, i) => (
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
                      {allCodici.map(([code]) => {
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
                    {allCodici.map(([code]) => {
                      const total = data.reduce((s, d) => s + (d.codici[code]?.value || 0), 0)
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
