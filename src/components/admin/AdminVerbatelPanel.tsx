"use client"
import React, { useState } from "react"
import { RefreshCw, X, Play, ClipboardList, UploadCloud, ChevronRight } from "lucide-react"
import toast from "react-hot-toast"

interface AdminVerbatelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  script: string;
  isLoading: boolean;
  onGenerate: () => Promise<void>;
  testMode: boolean;
  onToggleTestMode: (val: boolean) => void;
}

export default function AdminVerbatelPanel({ 
  isOpen, 
  onClose, 
  script, 
  isLoading, 
  onGenerate, 
  testMode, 
  onToggleTestMode 
}: AdminVerbatelPanelProps) {



  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white animate-in zoom-in-95 duration-300">
        
        {/* Header Tech Style */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-orange-50/30 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-orange-200">
               <RefreshCw width={28} height={28} className={isLoading ? "animate-spin" : ""} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sincronizzazione Esterna</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest bg-orange-100 px-2 py-0.5 rounded">Verbatel API Bridge</span>
                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">•</span>
                 <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest uppercase">Sincronizzazione Attiva</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
          >
            <X width={24} height={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 custom-scrollbar">
          
          {/* Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {[
               { step: "01", title: "Aperto Verbatel", desc: "Seleziona 'Prospetto Reperibilità'" },
               { step: "02", title: "Imposta Filtri", desc: "Seleziona il mese e l'anno nel portale" },
               { step: "03", title: "Genera & Incolla", desc: "Usa la Console (F12) per iniettare" }
             ].map((s, idx) => (
               <div key={s.step} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                  <span className="absolute -top-2 -right-2 text-4xl font-black text-slate-50 group-hover:text-orange-50 transition-colors pointer-events-none">{s.step}</span>
                  <p className="text-[10px] font-black text-orange-600 mb-1 uppercase tracking-widest">Passaggio {s.step}</p>
                  <h4 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">{s.title}</h4>
                  <p className="text-[11px] text-slate-500 font-bold">{s.desc}</p>
                  {idx < 2 && <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 text-slate-200"><ChevronRight width={16} height={16} /></div>}
               </div>
             ))}
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-50">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" checked={testMode} onChange={(e) => onToggleTestMode(e.target.checked)} className="peer sr-only" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </div>
                  <span className="font-black text-[12px] text-slate-700 uppercase tracking-tight">Esegui Test di Sicurezza (1 Agente)</span>
                </label>
                <p className="text-[9px] text-slate-400 font-bold uppercase pl-14">Consigliato prima del caricamento massivo</p>
              </div>

              <button 
                onClick={onGenerate}
                disabled={isLoading}
                className="w-full sm:w-auto bg-slate-900 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="animate-spin" width={20} height={20} /> : <Play width={20} height={20} />}
                <span className="uppercase tracking-widest text-[11px]">Avvia Generazione Script</span>
              </button>
            </div>

            {script ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                <div className="flex items-center justify-between px-2">
                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dna dello Script Generato</h5>
                   <span className="text-[9px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">PRONTO PER IL COPIA-INCOLLA</span>
                </div>
                <div className="relative group">
                  <textarea 
                    readOnly 
                    value={script} 
                    className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-[10px] p-6 rounded-[1.5rem] border-2 border-slate-800 focus:outline-none focus:border-orange-500 transition-colors shadow-inner selection:bg-orange-500/30"
                    placeholder="In attesa di generazione dati..."
                  />
                  <button 
                    onClick={() => { void navigator.clipboard.writeText(script); toast.success("Script copiato! Incollalo nella Console di Verbatel."); }}
                    className="absolute right-4 bottom-4 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                     <ClipboardList width={16} height={16} /> Copia Script
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[1.5rem] bg-slate-50/50">
                <UploadCloud className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">In attesa della richiesta di sincronizzazione</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
