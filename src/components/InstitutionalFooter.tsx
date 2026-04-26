"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, Accessibility, FileText, Info, Building2, X, ChevronUp, ExternalLink } from "lucide-react"

export default function InstitutionalFooter() {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentYear = new Date().getFullYear()

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3">
        {!isExpanded && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full py-2 px-4 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest hidden md:block">Compliance PA</span>
            <div className="w-px h-4 bg-white/10 hidden md:block"></div>
            <button 
              onClick={() => setIsExpanded(true)}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 group"
              aria-label="Apri informazioni istituzionali"
            >
              <Shield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Overlay / Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            onClick={() => setIsExpanded(false)}
          ></div>
          
          <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-8 py-6 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tight">Sentinel Security Suite</h3>
                  <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Compliance & Trasparenza PA</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Brand & Mission */}
                <div className="col-span-1 md:col-span-1">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    La piattaforma cloud avanzata per la gestione operativa dei Comandi di Polizia Locale. 
                    Sicurezza, efficienza e trasparenza al servizio del cittadino e delle istituzioni.
                  </p>
                  <div className="mt-6 flex items-center gap-2">
                    <span className="text-[10px] font-black bg-slate-800 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
                      v2.5.0-PROD
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      Operativo
                    </div>
                  </div>
                </div>

                {/* Legal & Compliance */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" /> Compliance PA
                  </h4>
                  <ul className="space-y-4 text-sm font-medium">
                    <li>
                      <Link href="/policy" onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Privacy Policy (GDPR)
                      </Link>
                    </li>
                    <li>
                      <Link href="/cookie-policy" onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Cookie Policy
                      </Link>
                    </li>
                    <li>
                      <Link href="/accessibilita" onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <Accessibility className="w-4 h-4" /> Dichiarazione Accessibilità
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Institutional Links */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" /> Trasparenza
                  </h4>
                  <ul className="space-y-4 text-sm font-medium">
                    <li>
                      <Link href="/terms" onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Termini di Servizio
                      </Link>
                    </li>
                    <li>
                      <Link href="/trasparenza" onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <Info className="w-4 h-4" /> Amministrazione Trasparente
                      </Link>
                    </li>
                    <li>
                      <a href="mailto:supporto@sentinel-pl.it" className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" /> Supporto Tecnico
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="mt-12 pt-8 border-t border-slate-800 flex justify-between items-center">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                  © {currentYear} Sentinel Security Suite — Prodotto SaaS per la PA.
                </div>
                <div className="text-[10px] text-slate-600 font-bold italic">
                  Sicurezza • Efficienza • Legalità
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
