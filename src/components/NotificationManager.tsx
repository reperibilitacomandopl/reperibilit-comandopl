"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, Loader2, ShieldCheck, Smartphone } from "lucide-react"
import toast from "react-hot-toast"

export default function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      
      // Controlla se c'è già una sottoscrizione attiva
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscription(sub)
        })
      })
    }
  }, [])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      // 1. Richiedi Permesso
      const res = await Notification.requestPermission()
      setPermission(res)
      if (res !== "granted") {
         toast.error("Permesso notifiche negato.")
         return
      }

      // 2. Ottieni sottoscrizione dal browser
      const vapidKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim().replace(/["']/g, "")
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })

      // 3. Invia al Backend
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() })
      })

      if (response.ok) {
        setSubscription(sub)
        toast.success("Notifiche Push Sentinel attivate! 🚀")
      } else {
        throw new Error("Errore durante la registrazione sul server")
      }
    } catch (err) {
      console.error("Errore Sottoscrizione:", err)
      toast.error("Impossibile attivare le notifiche push.")
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-6 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Bell size={80} />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Smartphone className="text-blue-600" size={24} />
            Notifiche Push Sentinel
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-lg">
            Ricevi avvisi in tempo reale per allarmi SOS, variazioni turni e messaggi della Centrale direttamente sul tuo dispositivo, anche ad app chiusa.
          </p>
        </div>

        <div>
          {subscription ? (
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-5 py-3 rounded-2xl border border-emerald-100 italic font-bold text-sm">
              <ShieldCheck size={20} />
              Notifiche Attive
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Bell size={20} className="group-hover:animate-bounce" />}
              ATTIVA ORA
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
