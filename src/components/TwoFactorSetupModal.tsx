"use client"

import React, { useState } from "react"
import { ShieldCheck, Smartphone, CheckCircle, RefreshCw, X, Copy, AlertCircle } from "lucide-react"

interface TwoFactorSetupModalProps {
  onClose: () => void
}

export default function TwoFactorSetupModal({ onClose }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState(1) // 1: Info, 2: QR, 3: Verify
  const [setupData, setSetupData] = useState<{ secret: string, qrCodeUrl: string } | null>(null)
  const [token, setToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSetup = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/2fa/setup")
      const data = await res.json()
      setSetupData(data)
      setStep(2)
    } catch (e) {
      setError("Errore durante l'inizializzazione")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (token.length < 6) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "enable" })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStep(4) // Success
      } else {
        setError(data.error || "Codice non valido")
      }
    } catch (e) {
      setError("Errore durante la verifica")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 md:p-10 relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>

          {step === 1 && (
            <div className="space-y-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-5 bg-blue-50 rounded-3xl text-blue-600">
                  <ShieldCheck width={48} height={48} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Autenticazione a 2 Fattori</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Massima Sicurezza per il tuo Account</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left space-y-4">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  L'autenticazione a due fattori (2FA) aggiunge un ulteriore livello di sicurezza al tuo account. Oltre alla password, dovrai inserire un codice generato da un'app sul tuo smartphone (come Google Authenticator o Authy).
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-tight">
                    <CheckCircle className="text-emerald-500" size={16} /> Protezione contro il furto password
                  </li>
                  <li className="flex items-center gap-3 text-xs font-black text-slate-700 uppercase tracking-tight">
                    <CheckCircle className="text-emerald-500" size={16} /> Richiesto per funzioni amministrative
                  </li>
                </ul>
              </div>

              <button 
                onClick={startSetup}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : "Inizia Configurazione"}
              </button>
            </div>
          )}

          {step === 2 && setupData && (
            <div className="space-y-8 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configura la tua App</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                  Inquadra il codice QR con la tua app di autenticazione preferita.
                </p>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-3xl border-2 border-slate-100 shadow-inner">
                <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Codice Segreto (Alternativo)</p>
                <div className="flex items-center justify-center gap-3 font-mono font-bold text-slate-600">
                  <span>{setupData.secret}</span>
                  <button onClick={() => navigator.clipboard.writeText(setupData.secret)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setStep(3)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                Ho inquadrato il codice
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 text-center">
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Verifica Codice</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Inserisci il codice a 6 cifre che vedi ora sulla tua app.
                </p>
              </div>

              <div className="relative max-w-[240px] mx-auto">
                <input 
                  type="text"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  placeholder="000 000"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-center text-3xl font-black tracking-[0.4em] outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-rose-600 bg-rose-50 py-3 rounded-xl border border-rose-100">
                  <AlertCircle size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{error}</span>
                </div>
              )}

              <button 
                onClick={verifyAndEnable}
                disabled={isLoading || token.length < 6}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                Verifica e Attiva 2FA
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="py-12 space-y-10 text-center animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                  <CheckCircle width={56} height={56} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Configurazione Completata</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Il tuo account è ora protetto</p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95"
              >
                Chiudi e Torna alla Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
