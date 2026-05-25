"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, BellOff, Loader2, Smartphone, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"
import {
  isPushSupported,
  subscribeToPush,
  syncPushSubscriptionToServer,
  getVapidPublicKey,
} from "@/lib/push-subscription-client"

export default function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [loading, setLoading] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [vapidConfigured, setVapidConfigured] = useState(true)

  const refreshSubscription = useCallback(async () => {
    if (!isPushSupported()) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscription(sub)
    if (sub && typeof Notification !== "undefined" && Notification.permission === "granted") {
      await syncPushSubscriptionToServer()
    }
  }, [])

  useEffect(() => {
    const supported = isPushSupported()
    setIsSupported(supported)
    setVapidConfigured(!!getVapidPublicKey())
    if (!supported) return
    if (typeof Notification !== "undefined") setPermission(Notification.permission)
    refreshSubscription()
  }, [refreshSubscription])

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      if (!vapidConfigured) {
        toast.error("Notifiche push non configurate sul server. Contatta l'amministratore.")
        return
      }
      const sub = await subscribeToPush()
      if (!sub) {
        setPermission(typeof Notification !== "undefined" ? Notification.permission : "denied")
        toast.error("Permesso notifiche negato.")
        return
      }
      setSubscription(sub)
      setPermission("granted")
      toast.success("Notifiche Push Sentinel attivate!")
    } catch (err) {
      console.error("Errore Sottoscrizione:", err)
      toast.error("Impossibile attivare le notifiche push.")
    } finally {
      setLoading(false)
    }
  }

  const handleResync = async () => {
    setLoading(true)
    try {
      const ok = await syncPushSubscriptionToServer()
      if (ok) {
        await refreshSubscription()
        toast.success("Sottoscrizione push aggiornata.")
      } else {
        toast.error("Nessuna sottoscrizione attiva sul dispositivo. Tocca «Attiva ora».")
      }
    } catch {
      toast.error("Errore durante la sincronizzazione.")
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  // Permesso concesso e sottoscrizione valida: niente banner
  if (subscription && permission === "granted") return null

  const needsReconnect =
    permission === "granted" && !subscription

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm mb-6 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Bell size={60} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h3 className="text-sm md:text-base font-black text-slate-800 flex items-center gap-2">
            <Smartphone className="text-blue-600 w-4 h-4 md:w-5 md:h-5" />
            Notifiche Push Sentinel
          </h3>
          <p className="text-[11px] md:text-xs text-slate-500 font-medium mt-1 max-w-lg">
            {needsReconnect
              ? "Su iPhone le notifiche richiedono l'app aggiunta alla Home e una nuova attivazione dopo aggiornamenti. Tocca il pulsante per riconnetterti."
              : "Ricevi avvisi in tempo reale per SOS, variazioni turni e messaggi della Centrale. Su iPhone: Safari → Condividi → «Aggiungi a Home»."}
          </p>
          {!vapidConfigured && (
            <p className="text-[10px] text-amber-700 font-bold mt-2">
              Configurazione server incompleta (VAPID). Riavvio deploy necessario.
            </p>
          )}
        </div>

        <div>
          {permission === "denied" ? (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3 bg-red-50 text-red-700 px-5 py-3 rounded-2xl border border-red-100 font-bold text-sm">
                <BellOff size={20} />
                Permessi negati dal browser
              </div>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter text-right max-w-[220px]">
                Impostazioni iPhone → Sentinel → Notifiche: attiva. Poi riapri l&apos;app dalla Home.
              </p>
            </div>
          ) : needsReconnect ? (
            <button
              onClick={handleSubscribe}
              disabled={loading || !vapidConfigured}
              className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
              RICONNETTI NOTIFICHE
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading || !vapidConfigured}
              className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Bell size={20} className="group-hover:animate-bounce" />}
              ATTIVA ORA
            </button>
          )}
          {subscription && permission !== "granted" && (
            <button
              type="button"
              onClick={handleResync}
              className="mt-2 text-[10px] font-bold text-slate-500 underline"
            >
              Sincronizza con server
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
