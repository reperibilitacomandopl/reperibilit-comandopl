"use client"

import React, { useState, useEffect } from "react"
import { Shield, MapPin, CheckCircle, Info, Lock } from "lucide-react"
import { useSession } from "next-auth/react"

export default function PrivacyConsentModal() {
  const { data: session, update } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Privacy, 2: GPS
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session?.user) {
      const localPrivacy = localStorage.getItem("privacy_accepted")
      const localGps = localStorage.getItem("gps_accepted")
      
      const needsPrivacy = !session.user.privacyAcceptedAt && !localPrivacy
      const needsGps = !session.user.gpsAcceptedAt && !localGps
      
      if (needsPrivacy || needsGps) {
        setIsOpen(true)
        if (!needsPrivacy && needsGps) setStep(2)
      } else {
        setIsOpen(false)
      }
    }
  }, [session])

  if (!isOpen) return null

  const handleAcceptPrivacy = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyConsent: true })
      })
      if (res.ok) {
        const data = await res.json()
        await update({ 
          privacyConsent: data.privacyConsent,
          privacyAcceptedAt: data.privacyAcceptedAt
        })
      }
      
      // Fallback: permetti sempre di procedere nella UI per non bloccare l'utente
      localStorage.setItem("privacy_accepted", "true")
      if (session?.user.gpsAcceptedAt || localStorage.getItem("gps_accepted")) {
        setIsOpen(false)
      } else {
        setStep(2)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptGps = async () => {
    setIsSubmitting(true)
    setIsOpen(false) // Chiudi subito per UX fluida
    try {
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gpsConsent: true })
      })
      const data = await res.json()
      await update({ 
        gpsConsent: data.gpsConsent,
        gpsAcceptedAt: data.gpsAcceptedAt
      })
      localStorage.setItem("gps_accepted", "true")
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeclineGps = async () => {
    setIsSubmitting(true)
    setIsOpen(false) // Chiudi subito
    try {
      // Salviamo comunque il fatto che l'utente ha fatto una scelta (anche se negativa)
      // per non riproporre la modale ossessivamente
      const res = await fetch("/api/user/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gpsConsent: false, skipGps: true })
      })
      const data = await res.json()
      await update({ 
        gpsConsent: data.gpsConsent,
        gpsAcceptedAt: data.gpsAcceptedAt
      })
      localStorage.setItem("gps_accepted", "true")
    } catch (e) {
      console.error(e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 md:p-12">
          {step === 1 ? (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600">
                  <Shield width={48} height={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Privacy & Compliance</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">Aggiornamento Regolamento GDPR</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-indigo-500">
                    <Lock width={20} height={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase">Segregazione dei Dati</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">I tuoi dati sono isolati a livello di database e accessibili solo al tuo Comando di appartenenza.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-indigo-500">
                    <CheckCircle width={20} height={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase">Tracciabilità Trasparente</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">Ogni azione amministrativa viene registrata in un log inattaccabile per la tua tutela legale.</p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium leading-relaxed bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                <p>Continuando, dichiari di aver preso visione dell'informativa sulla privacy del portale e di accettare il trattamento dei dati personali necessario per l'espletamento delle attività di servizio.</p>
              </div>

              <button 
                onClick={handleAcceptPrivacy}
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Accetto e Proseguo"}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-emerald-50 rounded-3xl text-emerald-600">
                  <MapPin width={48} height={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">Servizi di Posizione</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">Geolocalizzazione per Timbratura</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-emerald-500">
                    <Info width={20} height={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase">Finalità del Servizio</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">La posizione GPS viene acquisita esclusivamente nel momento della timbratura (Entrata/Uscita) e per la funzione SOS.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 text-emerald-500">
                    <Shield width={20} height={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase">Nessun Pedinamento</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">Il sistema non traccia la tua posizione in background quando non sei in servizio o l'app è chiusa.</p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium leading-relaxed bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                <p>Per conformità con le normative vigenti e il Garante Privacy, è richiesto il tuo consenso esplicito per l'uso dei sensori di posizione del dispositivo.</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleAcceptGps}
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Attiva e Prosegui"}
                </button>
                
                <button 
                  onClick={handleDeclineGps}
                  disabled={isSubmitting}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Continua senza GPS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
