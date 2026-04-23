"use client"

import React, { useState, useRef } from "react"
import { 
  UploadCloud, HelpCircle, Trash2, CalendarIcon, Users, ClipboardList, 
  Printer, RefreshCw, Settings, Hash, EyeOff, Eye, Mail, Play, Shield, 
  Wand2, FileDown, Smartphone, Radio, Car, LayoutGrid, FileText, Megaphone
} from "lucide-react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface AdminToolbarProps {
  currentMonth: number
  currentYear: number
  currentMonthName: string
  isPublished: boolean
  isLocked?: boolean
  onPublish: () => void
  onLock?: () => void
  onShowAnagrafica: () => void
  onShowAudit: () => void
  onShowBulkAbsence: () => void
  onShowSettings: () => void
  onShowVerbatel: () => void
  onShowSwaps: () => void
  onShowBacheca: () => void
  pendingSwapsCount: number
  pendingRequestsCount: number
  onShowSalaOperativa: () => void
  onShowStampaOds: () => void
  onShowParcoAuto: () => void
  onShowSezioni: () => void
  onSearch: (q: string) => void
  onRoleFilter: (role: string) => void
  onExportExcel: () => void
  onExportRepExcel: () => void
  onExportUfficialiExcel: () => void
  onExportPayroll: () => void
  onExportPDF: () => void
  onExportRepPDF: () => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onClear: (type: "all" | "base" | "rep") => void
  onSyncVerbatel: () => void
  onAIResolve: () => void
  onSendPec: () => void
  onSendAlert: () => void
  onImportShifts: (file: File, type: "base" | "rep") => void
  onGenerateMonth: () => void
  isGenerating: boolean
  isResolving: boolean
  isSendingPec: boolean
  isSendingAlert: boolean
  isExportingPDF: boolean
  isPublishing: boolean
  isClearing: boolean
  uploadStatus: string
  isMobileView: boolean
  onToggleMobileView: () => void
  currentUser?: any
}

export function AdminToolbar({
  currentMonth, currentYear, currentMonthName,
  isPublished, isLocked, onPublish, onLock, onShowAnagrafica, onShowAudit, onShowBulkAbsence,
  onShowSettings, onShowVerbatel, onShowSwaps, onShowBacheca,
  pendingSwapsCount, pendingRequestsCount,
  onSearch, onRoleFilter, onExportExcel, onExportRepExcel, onExportUfficialiExcel, onExportPayroll, onExportPDF, onExportRepPDF,
  onPrevMonth, onNextMonth, onClear, onSyncVerbatel, onAIResolve, onSendPec, onSendAlert,
  onImportShifts, onGenerateMonth, isGenerating, isResolving, isSendingPec, isSendingAlert, 
  isExportingPDF, isPublishing, isClearing, uploadStatus,
  isMobileView, onToggleMobileView,
  onShowSalaOperativa, onShowStampaOds, onShowParcoAuto, onShowSezioni,
  currentUser
}: AdminToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeImportType, setActiveImportType] = useState<"base" | "rep">("base")

  const triggerImport = (type: "base" | "rep") => {
    setActiveImportType(type)
    setTimeout(() => fileInputRef.current?.click(), 10)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImportShifts(file, activeImportType)
    }
  }

  const downloadTemplate = () => {
    const csvContent = "NOME COGNOME;MATRICOLA;DATA;TIPO TURNO;QUALIFICA;SQUADRA\nMARIO ROSSI;;01/05/2026;M7;AGENTE;Viabilita\nLUIGI VERDI;;02/05/2026;RP;ISPETTORE;Pronto Intervento\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Modello_Importazione.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const canManageShifts = currentUser?.role === "ADMIN" || currentUser?.isSuperAdmin || currentUser?.canManageShifts;
  const canManageUsers = currentUser?.role === "ADMIN" || currentUser?.isSuperAdmin || currentUser?.canManageUsers;
  const canConfigureSystem = currentUser?.role === "ADMIN" || currentUser?.isSuperAdmin || currentUser?.canConfigureSystem;

  return (
    <div className="flex flex-col gap-6">
      {/* SECTION 1: CABINA DI REGIA (Main Actions) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="shrink-0">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Cabina di Regia</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             Dashboard Gestionale Avanzata
          </p>
        </div>

        {/* MONTH NAVIGATOR (Recuperato e stilizzato) */}
        <div className="flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
          <button 
            type="button"
            onClick={onPrevMonth}
            className="p-4 md:p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-indigo-600 active:scale-75 touch-manipulation z-10"
            title="Mese Precedente"
          >
            <Play className="rotate-180" width={18} height={18} fill="currentColor" />
          </button>
          
          <div className="flex flex-col items-center min-w-[120px]">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1">{currentYear}</span>
            <span className="text-lg font-black text-slate-900 leading-none uppercase">{currentMonthName}</span>
          </div>

          <button 
            type="button"
            onClick={onNextMonth}
            className="p-4 md:p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-indigo-600 active:scale-75 touch-manipulation z-10"
            title="Mese Successivo"
          >
            <Play width={18} height={18} fill="currentColor" />
          </button>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative group flex-1 md:flex-none">
            <input 
              type="text" 
              placeholder="Cerca agente..." 
              onChange={e => onSearch(e.target.value)}
              className="pl-4 pr-10 py-2.5 text-sm bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white outline-none font-bold w-full md:w-[200px] transition-all"
            />
          </div>
          <select
            onChange={e => onRoleFilter(e.target.value)}
            className="px-4 py-2.5 text-sm bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-slate-700 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-all uppercase"
          >
            <option value="ALL">Tutti Operatori</option>
            <option value="UFF">Solo Ufficiali</option>
            <option value="AGT">Solo Agenti</option>
          </select>
        </div>

        {/* TOP STATUS (Upload Status if any) */}
        {uploadStatus && (
           <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 animate-pulse">
              {uploadStatus}
           </div>
        )}
      </div>

      {/* SECTION 2: STRUMENTI OPERATIVI (The Premium Buttons) */}
      <div className="flex bg-slate-900 px-4 py-3 rounded-[2rem] gap-3 items-center shadow-lg border border-slate-700">
        <button 
          onClick={onShowSalaOperativa} 
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          title="Gestione Squadre e Pattuglie (Sala Operativa)"
        >
          <Radio width={16} height={16} /> <span className="hidden md:inline">Sala Operativa</span>
        </button>
        <button 
          onClick={onShowStampaOds} 
          className="flex items-center gap-2 bg-slate-800 text-slate-200 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
          title="Stampa Ordine di Servizio Giornaliero"
        >
          <FileText width={16} height={16} /> <span className="hidden md:inline">Stampa OdS</span>
        </button>
        
        <div className="w-[1px] h-6 bg-slate-700 mx-1"></div>
        
        {canConfigureSystem && (
          <button 
            onClick={onShowParcoAuto} 
            className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            title="Gestione Flotta Veicoli"
          >
            <Car width={14} height={14} /> Mezzi
          </button>
        )}
        {canConfigureSystem && (
          <button 
            onClick={onShowSezioni} 
            className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            title="Configurazione Squadre/Sezioni"
          >
            <LayoutGrid width={14} height={14} /> Sezioni
          </button>
        )}
      </div>

      {/* SECTION 3: OPERATIONAL TOOLS (The Premium Buttons) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* RESOURCE TOOLS */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          {canManageUsers && (
            <button onClick={onShowAnagrafica} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-800 shadow-sm hover:bg-slate-800 transition-all active:scale-95" title="Gestione Personale e Fascicoli">
              <Users width={16} height={16} /> <span className="hidden lg:inline">Gestione Personale</span>
            </button>
          )}
          {canManageShifts && (
            <button onClick={onShowBulkAbsence} className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95" title="Assenze Multiple">
              <CalendarIcon width={16} height={16} /> <span className="hidden lg:inline">Assenze</span>
            </button>
          )}
          <button onClick={onShowAudit} className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95" title="Log Audit">
            <ClipboardList width={16} height={16} /> <span className="hidden lg:inline">Audit</span>
          </button>
        </div>

        {/* APPROVAL HUB */}
        <button 
          onClick={onShowSwaps} 
          className={`relative flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-100 text-indigo-700 rounded-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all hover:bg-indigo-50 ${pendingSwapsCount + pendingRequestsCount > 0 ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
        >
           <RefreshCw width={16} height={16} /> 
           <span>Coda Approvazioni</span>
           {pendingSwapsCount + pendingRequestsCount > 0 && (
             <span className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white flex items-center justify-center rounded-full text-[10px] animate-bounce shadow-lg border-2 border-white">{pendingSwapsCount + pendingRequestsCount}</span>
           )}
        </button>

        {/* IMPORT/RESET TOOLS */}
        {canManageShifts && (
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 items-center">
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            
            {/* Download Template Button */}
            <button onClick={downloadTemplate} className="flex items-center gap-2 bg-white text-emerald-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm hover:bg-emerald-50 transition-all active:scale-95" title="Scarica Modello Excel/CSV per Importazioni">
              <FileDown width={16} height={16} /> <span className="hidden xl:inline">Modello</span>
            </button>
            
            <button onClick={() => triggerImport("base")} className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-blue-100 shadow-sm hover:bg-blue-50 transition-all active:scale-95" title="Importa Turni da Excel">
              <UploadCloud width={16} height={16} /> <span className="hidden xl:inline">Import Turni</span>
            </button>
            <button onClick={() => triggerImport("rep")} className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-purple-100 shadow-sm hover:bg-purple-50 transition-all active:scale-95" title="Importa Reperibilità da Excel">
              <UploadCloud width={16} height={16} /> <span className="hidden xl:inline">Import REP</span>
            </button>
            <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
            <button disabled={isClearing} onClick={() => onClear("base")} className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-2.5 rounded-xl uppercase tracking-tighter disabled:opacity-50" title="Reset Turni">Reset <span className="hidden sm:inline">Turni</span></button>
            <button disabled={isClearing} onClick={() => onClear("rep")} className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-2.5 rounded-xl uppercase tracking-tighter disabled:opacity-50" title="Reset REP">Reset <span className="hidden sm:inline">REP</span></button>
          </div>
        )}

        {/* COMMUNICATION TOOLS (The real power) */}
        {canConfigureSystem && (
          <div className="flex bg-slate-900 p-1 rounded-2xl gap-1">
          <button 
            onClick={onShowBacheca} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95 shadow-md shadow-indigo-500/20"
            title="Gestisci Comunicazioni e Bacheca"
          >
            <Megaphone width={16} height={16} /> Bacheca
          </button>
          <button 
            disabled={isSendingPec || !isPublished} 
            onClick={onSendPec} 
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-30"
            title="Invia PEC con valore di notifica legale"
          >
            <Mail width={16} height={16} /> Invia PEC
          </button>
          <button 
            disabled={isSendingAlert} 
            onClick={onSendAlert} 
            className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-500 transition-all active:scale-95 disabled:opacity-30"
            title="Chiama tutti i reperibili di oggi via Telegram"
          >
            <Radio width={16} height={16} /> Chiama Reperibili
          </button>
        </div>
        )}

        {/* AI & SYNC TOOLS */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
           <button 
            disabled={isResolving || isGenerating} 
            onClick={onGenerateMonth} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"
            title="Generazione Automatica Reperibilità Mensile"
          >
            <RefreshCw className={isGenerating ? "animate-spin" : ""} width={16} height={16} /> Generatore Auto
          </button>
           <button 
            disabled={isResolving || isGenerating} 
            onClick={onAIResolve} 
            className="flex items-center gap-2 bg-white text-fuchsia-700 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-fuchsia-100 shadow-sm hover:bg-fuchsia-50 transition-all active:scale-95 disabled:opacity-50"
            title="Copertura buchi organico con AI"
          >
            <Wand2 width={16} height={16} /> AI Resolver
          </button>
          <button 
            onClick={onShowVerbatel} 
            className="flex items-center gap-2 bg-white text-orange-600 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-orange-100 shadow-sm hover:bg-orange-50 transition-all active:scale-95"
          >
            <RefreshCw width={16} height={16} /> Verbatel Sync
          </button>
        </div>

        {/* EXPORT TOOLS */}
        <div className="flex bg-slate-900 p-1 rounded-2xl gap-1">
           <button onClick={onExportPDF} disabled={isExportingPDF} className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95" title="PDF Prospetto">
              <Printer width={16} height={16} /> <span className="hidden sm:inline">PDF PRO</span>
           </button>
           <button onClick={onExportRepPDF} disabled={isExportingPDF} className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95" title="PDF Reperibilità">
              <Printer width={16} height={16} /> <span className="hidden sm:inline">PDF REP</span>
           </button>
           <button onClick={onExportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all active:scale-95" title="Esporta Excel Turni">
              <FileDown width={16} height={16} /> <span className="hidden sm:inline">Excel</span>
           </button>
           <button onClick={onExportRepExcel} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-violet-500 transition-all active:scale-95" title="Esporta Solo Reperibilità in Excel">
              <FileDown width={16} height={16} /> <span className="hidden sm:inline">Excel REP</span>
           </button>
           <button onClick={onExportPayroll} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-pink-500 transition-all active:scale-95" title="Esporta Riepilogo Mensile per Ufficio Paghe (Excel/CSV)">
              <FileDown width={16} height={16} /> <span className="hidden sm:inline">Export Paghe</span>
           </button>
        </div>

        {/* SYSTEM TOOLS */}
        <div className="flex items-center gap-2 ml-auto">
          <button 
            onClick={onToggleMobileView}
            className={`p-3 rounded-2xl transition-all active:scale-95 border-2 ${isMobileView ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"}`}
            title="Vista Mobile/Tabella"
          >
            <Smartphone width={20} height={20} />
          </button>
          {canConfigureSystem && (
            <button onClick={onShowSettings} className="p-3 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 border border-slate-200" title="Impostazioni Sistema">
              <Settings width={20} height={20} />
            </button>
          )}
          <button 
            disabled={isPublishing} 
            onClick={onPublish} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${isPublished ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-emerald-600 text-white shadow-emerald-500/20"}`}
          >
            {isPublished ? <><EyeOff width={16} height={16} /> Nascondi</> : <><Eye width={16} height={16} /> Pubblica</>}
          </button>
          
          <button 
            disabled={isPublishing} 
            onClick={onLock} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${isLocked ? "bg-red-600 text-white shadow-red-500/20" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"}`}
            title={isLocked ? "Sblocca Mese" : "Congela Mese (Blocca modifiche ai turni)"}
          >
            <Shield width={16} height={16} className={isLocked ? "fill-white" : "fill-slate-400"} /> 
            {isLocked ? "Mese Chiuso" : "Mese Aperto"}
          </button>
        </div>
      </div>
    </div>
  )
}
