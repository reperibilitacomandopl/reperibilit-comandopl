"use client"

import React from "react"
import { 
  FileText, 
  AlertCircle, 
  Upload, 
  Clock, 
  CalendarDays,
  History,
  Info
} from "lucide-react"
import PersonalBalances from "./PersonalBalances"
import PersonalClockHistory from "./PersonalClockHistory"
import CartellinoSummaryView from "@/components/shared/CartellinoSummaryView"

interface AgentTimecardViewProps {
  admin: any
  onShowRequest: () => void
  onShowMancataTimb: () => void
  onShowUpload: () => void
}

export default function AgentTimecardView({ 
  admin, 
  onShowRequest, 
  onShowMancataTimb, 
  onShowUpload 
}: AgentTimecardViewProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER / QUICK ACTIONS */}
      <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h2 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">Gestione Cartellino</h2>
              <p className="text-blue-100/80 text-sm sm:text-base font-medium max-w-xl">
                Monitora i tuoi saldi, visualizza lo storico delle timbrature e invia richieste al comando.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
               <button 
                onClick={onShowRequest}
                className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
               >
                 <CalendarDays size={18} />
                 Nuova Richiesta
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            <button 
              onClick={onShowMancataTimb}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all text-left"
            >
              <div className="p-3 bg-amber-500 rounded-xl shadow-lg">
                <AlertCircle size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-200">Timbrature</p>
                <p className="font-bold text-sm">Segnala Errore / Mancata</p>
              </div>
            </button>

            <button 
              onClick={onShowUpload}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4 hover:bg-white/20 transition-all text-left"
            >
              <div className="p-3 bg-indigo-500 rounded-xl shadow-lg">
                <Upload size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Documenti</p>
                <p className="font-bold text-sm">Invia Allegato / Certificato</p>
              </div>
            </button>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl flex items-center gap-4 text-left hidden lg:flex">
              <div className="p-3 bg-emerald-500 rounded-xl shadow-lg">
                <Info size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-200">Supporto</p>
                <p className="font-bold text-sm">Contatta l&apos;Ufficio</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BALANCES AND CLOCK HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PersonalBalances />
        <PersonalClockHistory 
          onViewHistory={() => {}} // Could open a modal if needed
          records={admin.clockRecords}
          loading={admin.clockLoading}
        />
      </div>

      {/* REQUEST HISTORY (RIEPILOGO) */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <History className="text-indigo-600" size={28} />
          Storico Richieste e Approvazioni
        </h3>
        <div className="bg-white rounded-[2.5rem] p-4 sm:p-8 border border-slate-200 shadow-xl overflow-hidden">
          <CartellinoSummaryView 
            requests={admin.requests}
            balances={admin.balances || null}
            mode="USER"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 items-start">
        <div className="p-3 bg-blue-600 rounded-2xl shrink-0">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h4 className="font-black text-blue-900 uppercase tracking-widest text-xs mb-1">Informazione Importante</h4>
          <p className="text-blue-800/70 text-sm font-medium leading-relaxed">
            Tutte le richieste inserite tramite questo portale sono soggette a verifica da parte dell&apos;Amministratore. 
            Riceverai una notifica push quando lo stato della tua richiesta cambierà.
          </p>
        </div>
      </div>

    </div>
  )
}
