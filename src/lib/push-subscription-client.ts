/** Client-side Web Push: subscribe + sync con il backend */

export function getVapidPublicKey(): string {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim().replace(/["']/g, "")
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/** Registra sul server la sottoscrizione push corrente (se esiste). */
export async function syncPushSubscriptionToServer(): Promise<boolean> {
  if (!isPushSupported()) return false
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false

  const registration = await navigator.serviceWorker.ready
  const sub = await registration.pushManager.getSubscription()
  if (!sub) return false

  const response = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  return response.ok
}

/** Richiede permesso + subscribe (richiede gesto utente su iOS). */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  const vapidKey = getVapidPublicKey()
  if (!vapidKey) {
    throw new Error("Chiave VAPID pubblica non configurata")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") return null

  const registration = await navigator.serviceWorker.ready
  let sub = await registration.pushManager.getSubscription()
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })
  }

  const response = await fetch("/api/notifications/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  if (!response.ok) throw new Error("Errore registrazione push sul server")

  return sub
}
