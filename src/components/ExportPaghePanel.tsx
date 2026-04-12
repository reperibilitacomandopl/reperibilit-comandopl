"use client"

import { useState, useEffect, useCallback } from "react"
import { Download, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react"
import toast from "react-hot-toast"
import * as XLSX from "xlsx"

interface PayrollData {
  id: string
  nome: string
  matricola: string
  codici: Record<string, number>
}

// Codici principali per Ragioneria
const COMMON_CODES = [
  { code: "2000", label: "Straordinario Pagamento (h)" },
  { code: "2001", label: "Straordinario Notturno (h)" },
  { code: "2002", label: "Straordinario Festivo (h)" },
  { code: "0015", label: "Ferie Anno C. (gg)" },
  { code: "0018", label: "Malattia (gg)" },
  { code: "0031", label: "Permessi 104 (gg)" },
]

export default function ExportPaghePanel() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PayrollData[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/export-paghe?year=${year}&month=${month}`)
      if (res.ok) setData(await res.json())
    } catch {
      toast.error("Errore caricamento dati")
    }
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  const changeMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m)
    setYear(y)
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()
    
    // Raccoglie tutti i codici univoci presenti nel mese, oltre a quelli base
    let allCodes = new Set(COMMON_CODES.map(c => c.code))
    data.forEach(d => {
       Object.keys(d.codici).forEach(k => allCodes.add(k))
    })

    const codeArray = Array.from(allCodes).sort()

    const formatted = data.map(d => {
       let row: any = {
          "Matricola": d.matricola,
          "Nominativo": d.nome
       }
       codeArray.forEach(code => {
          // Ricerca la label se conosciuta, sennò usa il codice
          const cc = COMMON_CODES.find(c => c.code === code)
          const key = cc ? `${code} - ${cc.label}` : code
          row[key] = d.codici[code] || 0
       })
       return row
    })

    const ws = XLSX.utils.json_to_sheet(formatted)
    XLSX.utils.book_append_sheet(wb, ws, `Flusso Paghe ${String(month).padStart(2, '0')}-${year}`)
    XLSX.writeFile(wb, `Flusso_Ragioneria_${year}_${String(month).padStart(2, '0')}.xlsx`)
    toast.success("Tracciato Paghe scaricato!")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <div className="p-2 bg-purple-100 rounded-xl"><FileSpreadsheet className="w-6 h-6 text-purple-600" /></div>
             <h1 className="text-2xl font-black text-slate-800 tracking-tight">Export Ragioneria</h1>
           </div>
           <p className="text-sm text-slate-500 font-medium ml-12">Monitoraggio causali e generazione flussi paghe</p>
        </div>

        <div className="flex items-center gap-3">
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
             className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center gap-2"
          >
             <Download className="w-4 h-4" /> Esporta XLSX
          </button>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-start gap-3">
         <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
         <p className="text-sm text-purple-800 font-medium">
            Questo strumento calcola automaticamente le indennità e le assenze incrociando i turni con l&apos;agenda del personale. L&apos;esportato è formattato a colonne (es. Codice Causale 2000) per l&apos;importazione rapida nei software dell&apos;Ufficio Personale / Ragioneria.
         </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm">
               <thead className="bg-slate-50">
                  <tr>
                     <th className="p-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">Matr.</th>
                     <th className="p-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 sticky left-0 bg-slate-50">Agente</th>
                     {COMMON_CODES.map(c => (
                        <th key={c.code} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200" title={c.label}>
                           <div className="text-slate-600 font-mono bg-white px-2 py-1 rounded inline-block border border-slate-200">{c.code}</div>
                        </th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                     <tr><td colSpan={10} className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" /></td></tr>
                  ) : data.length === 0 ? (
                     <tr><td colSpan={10} className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest">Nessun dato</td></tr>
                  ) : (
                     data.map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? "bg-white hover:bg-purple-50/50" : "bg-slate-50/30 hover:bg-purple-50/50"}>
                           <td className="p-4 text-xs font-mono text-slate-500 border-b border-slate-50">{row.matricola}</td>
                           <td className="p-4 font-bold text-slate-800 border-b border-slate-50 sticky left-0 bg-inherit">{row.nome}</td>
                           {COMMON_CODES.map(c => {
                              const val = row.codici[c.code]
                              return (
                                 <td key={c.code} className="p-4 text-center border-b border-slate-50 font-black">
                                    {val ? <span className="text-purple-600">{val}</span> : <span className="text-slate-300">-</span>}
                                 </td>
                              )
                           })}
                        </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
