"use client"

import { useState, useRef, useCallback } from "react"
import { Shield, Loader2 } from "lucide-react"
import AgentSosModal from "./AgentSosModal"
import toast from "react-hot-toast"

interface FloatingSosButtonProps {
  /** Callback passed down from parent to actually send the SOS */
  onSendSos?: (note: string, audioBlob: Blob | null) => Promise<boolean>
}

const LONG_PRESS_DURATION = 2500 // ms

export default function FloatingSosButton({ onSendSos }: FloatingSosButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [pressing, setPressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const startPress = useCallback(() => {
    setPressing(true)
    setProgress(0)
    startTimeRef.current = Date.now()

    // Animate progress
    animRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const p = Math.min(elapsed / LONG_PRESS_DURATION, 1)
      setProgress(p)
      if (p >= 1) {
        if (animRef.current) clearInterval(animRef.current)
      }
    }, 30)

    // Trigger after duration
    timerRef.current = setTimeout(() => {
      setPressing(false)
      setProgress(0)
      if (animRef.current) clearInterval(animRef.current)
      // Vibrate feedback
      if (navigator.vibrate) navigator.vibrate(200)
      setShowModal(true)
    }, LONG_PRESS_DURATION)
  }, [])

  const cancelPress = useCallback(() => {
    setPressing(false)
    setProgress(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (animRef.current) clearInterval(animRef.current)
  }, [])

  const handleSendSos = async (note: string, audioBlob: Blob | null): Promise<boolean> => {
    if (onSendSos) return onSendSos(note, audioBlob)

    // Fallback: direct GPS SOS
    return new Promise<boolean>((resolve) => {
      const toastId = toast.loading("Invio segnale SOS geolocalizzato...")
      
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            let audioBase64 = ""
            if (audioBlob) {
              const reader = new FileReader()
              audioBase64 = await new Promise((res) => {
                reader.onloadend = () => res(reader.result as string)
                reader.readAsDataURL(audioBlob)
              })
            }

            const res = await fetch('/api/admin/alert-emergency', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'SOS',
                message: `🆘 SOS GPS! ${note || 'Richiesta intervento immediato.'}`,
                audio: audioBase64,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              })
            })
            if (res.ok) {
              toast.success("🚨 SEGNALE SOS INVIATO! Resta in attesa.", { id: toastId })
              resolve(true)
            } else {
              toast.error("Errore invio SOS, riprova", { id: toastId })
              resolve(false)
            }
          } catch {
            toast.error("Errore di rete, riprova", { id: toastId })
            resolve(false)
          }
        },
        async () => {
          // Fallback se il GPS fallisce o l'utente nega i permessi
          try {
            let audioBase64 = ""
            if (audioBlob) {
              const reader = new FileReader()
              audioBase64 = await new Promise((res) => {
                reader.onloadend = () => res(reader.result as string)
                reader.readAsDataURL(audioBlob)
              })
            }

            const res = await fetch('/api/admin/alert-emergency', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'SOS',
                message: `🆘 SOS! ${note || 'Richiesta intervento (Posizione GPS non disponibile).'}`,
                audio: audioBase64
              })
            })
            if (res.ok) {
              toast.success("🚨 SEGNALE SOS INVIATO (Senza GPS)!", { id: toastId })
              resolve(true)
            } else {
              toast.error("Errore invio SOS, riprova", { id: toastId })
              resolve(false)
            }
          } catch {
            toast.error("Impossibile inviare SOS. Errore di rete.", { id: toastId })
            resolve(false)
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  // SVG circle progress
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)

  return (
    <>
      {/* Floating SOS Button — long-press activated */}
      <button
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchCancel={cancelPress}
        className={`fixed bottom-32 lg:bottom-8 right-4 z-[90] w-14 h-14 lg:w-16 lg:h-16 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-2xl shadow-red-500/40 flex items-center justify-center transition-all group border-2 ${pressing ? "border-white scale-110" : "border-red-400/50"}`}
        aria-label="SOS Emergenza — Tieni premuto"
        title="Tieni premuto 3 secondi per SOS"
      >
        {/* Progress ring */}
        {pressing && (
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
            <circle cx="38" cy="38" r={radius} fill="none" stroke="white" strokeWidth="3.5"
              strokeDasharray={circumference} strokeDashoffset={dashOffset}
              strokeLinecap="round" className="transition-none" />
          </svg>
        )}

        {/* Pulse ring animation — only when NOT pressing */}
        {!pressing && <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" style={{ animationDuration: '2s' }}></div>}
        
        <div className="relative z-10 flex flex-col items-center">
          <Shield size={pressing ? 20 : 24} className={`transition-transform ${pressing ? "animate-pulse" : "group-hover:scale-110"}`} />
          <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">
            {pressing ? "TIENI..." : "SOS"}
          </span>
        </div>
      </button>

      {/* SOS Modal */}
      {showModal && (
        <AgentSosModal
          onClose={() => setShowModal(false)}
          onSendSos={handleSendSos}
        />
      )}
    </>
  )
}
