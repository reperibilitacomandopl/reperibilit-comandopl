"use client"

import { useState } from "react"
import { Shield, Loader2 } from "lucide-react"
import AgentSosModal from "./AgentSosModal"
import toast from "react-hot-toast"

interface FloatingSosButtonProps {
  /** Callback passed down from parent to actually send the SOS */
  onSendSos?: (note: string, audioBlob: Blob | null) => Promise<boolean>
}

export default function FloatingSosButton({ onSendSos }: FloatingSosButtonProps) {
  const [showModal, setShowModal] = useState(false)

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

  return (
    <>
      {/* Floating SOS Button — always visible */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 lg:bottom-8 right-4 z-[90] w-16 h-16 bg-red-600 hover:bg-red-500 active:scale-90 text-white rounded-full shadow-2xl shadow-red-500/40 flex items-center justify-center transition-all group border-2 border-red-400/50"
        aria-label="SOS Emergenza"
        title="SOS Emergenza GPS"
      >
        {/* Pulse ring animation */}
        <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" style={{ animationDuration: '2s' }}></div>
        <div className="relative z-10 flex flex-col items-center">
          <Shield size={24} className="group-hover:scale-110 transition-transform" />
          <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">SOS</span>
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
