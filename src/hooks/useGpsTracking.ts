"use client"

import { useEffect, useRef, useState } from "react"

interface UseGpsTrackingProps {
  isClockedIn: 'IN' | 'OUT' | 'LOADING'
  intervalMs?: number
  tenant?: { lat: number | null, lng: number | null, name?: string, clockInRadius?: number }
  myShifts?: any[]
}

// Calcolo distanza tra due punti in metri (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function useGpsTracking({ isClockedIn, intervalMs = 300000, tenant, myShifts }: UseGpsTrackingProps) {
  const watchId = useRef<number | null>(null)
  const lastUpdate = useRef<number>(0)
  const lastReminder = useRef<number>(0)
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null)

  useEffect(() => {
    // Monitoraggio attivo se l'utente ha dato il consenso
    if (!("geolocation" in navigator)) return

    const startWatching = () => {
      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          const now = Date.now()
          setCoords({ lat: latitude, lng: longitude })

          // 1. INVIO POSIZIONE AL SERVER (Solo se timbrato IN)
          if (isClockedIn === 'IN' && now - lastUpdate.current > intervalMs) {
            try {
              await fetch("/api/agent/location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lat: latitude, lng: longitude })
              })
              lastUpdate.current = now
            } catch (err) {
              console.error("[GPS_HOOK_ERROR]", err)
            }
          }

          // 2. LOGICA PROMEMORIA PROSSIMITÀ (GEOFENCING SMART)
          if (tenant?.lat && tenant?.lng && myShifts && now - lastReminder.current > 600000) { // Max 1 promemoria ogni 10 min
            const distance = getDistance(latitude, longitude, tenant.lat, tenant.lng)
            const threshold = tenant.clockInRadius || 300
            
            const today = new Date().toISOString().split('T')[0]
            const todayShift = myShifts.find(s => s.date.startsWith(today))
            
            if (todayShift) {
              const shiftTime = todayShift.timeRange?.split('-')[0]?.trim() // Es: "08:00"
              const shiftEndTime = todayShift.timeRange?.split('-')[1]?.trim() // Es: "14:00"
              
              const [h, m] = shiftTime ? shiftTime.split(':').map(Number) : [8, 0]
              const [eh, em] = shiftEndTime ? shiftEndTime.split(':').map(Number) : [14, 0]
              
              const shiftStart = new Date()
              shiftStart.setHours(h, m, 0, 0)
              
              const shiftEnd = new Date()
              shiftEnd.setHours(eh, em, 0, 0)

              // A. REMINDER ENTRATA: Arrivato in sede + Turno sta per iniziare + Non timbrato IN
              if (isClockedIn === 'OUT' && distance <= threshold) {
                const diff = (shiftStart.getTime() - now) / 60000
                if (diff < 30 && diff > -60) { // Entro 30 min prima o 60 min dopo l'inizio
                   new Notification("📍 Sei arrivato al Comando", {
                     body: `Il tuo turno inizia alle ${shiftTime}. Ricordati di timbrare l'entrata!`,
                     icon: "/icon-192.png",
                     tag: "clock-reminder"
                   })
                   lastReminder.current = now
                }
              }

              // B. REMINDER USCITA: Si allontana dalla sede + Turno finito + Non timbrato OUT
              if (isClockedIn === 'IN' && distance > threshold + 100) {
                const diffEnd = (now - shiftEnd.getTime()) / 60000
                if (diffEnd > -15) { // Da 15 min prima della fine in poi
                   new Notification("🏃 Ti stai allontanando?", {
                     body: `Il tuo turno è terminato alle ${shiftEndTime}. Ricordati di timbrare l'uscita!`,
                     icon: "/icon-192.png",
                     tag: "clock-reminder"
                   })
                   lastReminder.current = now
                }
              }
            }
          }
        },
        (error) => console.warn("[GPS_GEOLOC_ERROR]", error.message),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      )
    }

    // Richiedi permessi notifiche se necessario
    if (Notification.permission === "default") {
      Notification.requestPermission()
    }

    startWatching()

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [isClockedIn, intervalMs, tenant, myShifts])

  return coords
}
