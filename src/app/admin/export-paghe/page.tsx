"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, Building2, AlertCircle } from "lucide-react"

export default function ExportPaghePage() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    // Usiamo window.location.href o un hidden <a> per triggerare il download
    const url = `/api/admin/export/payroll?month=${selectedMonth}&year=${selectedYear}`
    
    const a = document.createElement('a')
    a.href = url
    a.download = `Export_Ragioneria_${selectedMonth}_${selectedYear}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => setIsExporting(false), 2000) // Reset after trigger
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-purple-600 mb-2">
          <div className="p-2.5 bg-purple-100 rounded-xl">
            <Building2 size={24} className="text-purple-600" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-slate-800">
            Esportazione Ragioneria
          </h1>
        </div>
        <p className="text-slate-500 text-sm lg:text-base font-medium max-w-2xl">
          Genera e scarica i file Excel formattati per i software Paghe del Comune. Il sistema calcola automaticamente indennità notturne, festive e straordinari maturati.
        </p>
      </div>

      {/* Main Panel */}
      <div className="bg-white border-2 border-purple-100 rounded-3xl p-6 shadow-xl shadow-purple-900/5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="space-y-4 flex-1 w-full relative z-20">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-purple-500" />
              Seleziona Periodo di Computo
            </h2>
            
            <div className="grid grid-cols-2 gap-4 max-w-md relative z-20">
              <div className="space-y-1.5 relative z-20">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mese</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all relative z-20"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  <option value={1}>Gennaio</option>
                  <option value={2}>Febbraio</option>
                  <option value={3}>Marzo</option>
                  <option value={4}>Aprile</option>
                  <option value={5}>Maggio</option>
                  <option value={6}>Giugno</option>
                  <option value={7}>Luglio</option>
                  <option value={8}>Agosto</option>
                  <option value={9}>Settembre</option>
                  <option value={10}>Ottobre</option>
                  <option value={11}>Novembre</option>
                  <option value={12}>Dicembre</option>
                </select>
              </div>

              <div className="space-y-1.5 relative z-20">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anno</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all relative z-20"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  <option value={now.getFullYear()}> {now.getFullYear()} </option>
                  <option value={now.getFullYear() - 1}> {now.getFullYear() - 1} </option>
                  <option value={now.getFullYear() - 2}> {now.getFullYear() - 2} </option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto shrink-0 relative z-10">
            <button
               onClick={handleExport}
               disabled={isExporting}
               className="w-full lg:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-5 rounded-2xl font-black shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 relative z-10"
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Download size={22} />
                  Genera File Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
          <div className="shrink-0 pt-0.5">
            <AlertCircle size={20} className="text-amber-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-800 mb-1">Nota sul Calcolo delle Indennità</h4>
            <p className="text-sm font-medium text-amber-700 leading-relaxed opacity-90">
              Il sistema calcola i festivi incrociando i turni con le Domeniche. I turni notturni vengono estratti cercando la stringa "NOTTE" nel nome originario del turno base. Verifica l'esattezza del report prima di inviarlo al responsabile di ragioneria.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
