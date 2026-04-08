"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, Building2, AlertCircle, Calendar, ShieldCheck } from "lucide-react"

export default function ExportPaghePage() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = () => {
    setIsExporting(true)
    const url = `/api/admin/export/payroll?month=${selectedMonth}&year=${selectedYear}`
    
    const a = document.createElement('a')
    a.href = url
    a.download = `Export_Ragioneria_${selectedMonth}_${selectedYear}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    setTimeout(() => setIsExporting(false), 2000)
  }

  return (
    <div className="p-4 lg:p-12 max-w-5xl mx-auto space-y-12 animate-fade-up">
      
      {/* Header Premium style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200 pb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 ring-1 ring-white/20">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 font-sans italic lowercase">ragioneria <span className="text-indigo-600 not-italic uppercase">export</span></h1>
              <p className="text-slate-500 font-medium mt-1">Generazione reportistica per software paghe comunale.</p>
            </div>
          </div>
        </div>
        
        <div className="glass-effect px-5 py-2.5 rounded-2xl flex items-center gap-3 ring-1 ring-indigo-200 shadow-lg shadow-indigo-500/5">
           <ShieldCheck size={18} className="text-indigo-600" />
           <span className="text-sm font-black text-indigo-700 font-sans uppercase tracking-widest leading-none mt-0.5">Sistema Certificato</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Configuration Card */}
        <div className="lg:col-span-2 space-y-8">
           <div className="premium-card p-8 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                <FileSpreadsheet size={160} className="text-indigo-900" />
              </div>

              <div className="space-y-6 relative z-10">
                <h2 className="text-lg font-black text-slate-900 font-sans flex items-center gap-2">
                  <Calendar size={20} className="text-indigo-600" />
                  Periodo di Computo
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleziona Mese</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-sans"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    >
                      {["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map((m, i) => (
                        <option key={i+1} value={i+1}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleziona Anno</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm font-sans"
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

              <div className="pt-4 relative z-10">
                <button
                   onClick={handleExport}
                   disabled={isExporting}
                   className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isExporting ? (
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={20} />
                  )}
                  {isExporting ? "GENERAZIONE IN CORSO..." : "SALVA REPORT EXCEL"}
                </button>
              </div>
           </div>

           {/* Info Banner */}
           <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-8 flex gap-6 items-start">
              <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                <AlertCircle size={24} className="text-amber-600" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Logica di Calcolo Automatizzata</h4>
                <p className="text-sm text-amber-700/80 leading-relaxed font-medium">
                  Il file generato incrocia i turni operativi con le <span className="font-bold text-amber-900 underline decoration-amber-300">Domeniche e le Festività nazionali</span>. 
                  Le indennità notturne vengono rilevate tramite stringa "NOTTE" nel turno. 
                  In caso di incongruenze, verificare il turno dell'agente nel pannello di pianificazione.
                </p>
              </div>
           </div>
        </div>

        {/* Sidebar Info/Status */}
        <div className="space-y-6">
           <div className="premium-card p-6 bg-slate-900 border-slate-800 text-white">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4 px-2 border-l-2 border-indigo-500">Statistiche Export</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-slate-400 font-medium font-sans">Ultimo Export</span>
                    <span className="text-xs font-bold font-mono">MAI</span>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-slate-400 font-medium font-sans">Formato</span>
                    <span className="text-xs font-bold text-emerald-400">XLSX (Excel)</span>
                 </div>
                 <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-slate-400 font-medium font-sans">Voci Incluse</span>
                    <span className="text-xs font-bold">ORDINARIO, NOTT, FEST</span>
                 </div>
              </div>
           </div>
           
           <div className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                I report sono compatibili con <br/> Microsoft Excel 2016+ e Google Sheets.
              </p>
           </div>
        </div>
      </div>
    </div>
  )
}
