"use client"

import { useEffect, useRef } from "react"

interface UseGpsTrackingProps {
  isClockedIn: 'IN' | 'OUT' | 'LOADING'
  intervalMs?: number
}

export function useGpsTracking({ isClockedIn, intervalMs = 60000 }: UseGpsTrackingProps) {
  const watchId = useRef<number | null>(null)
  const lastUpdate = useRef<number>(0)

  useEffect(() => {
    // Se non è in servizio, interrompiamo qualsiasi tracciamento esistente (PRIVACY)
    if (isClockedIn !== 'IN') {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      return
    }

    // Se è in servizio, attiviamo il monitoraggio della posizione
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          const now = Date.now()

          // Evitiamo di intasare il server: aggiorniamo solo ogni 'intervalMs'
          if (now - lastUpdate.current > intervalMs) {
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
        },
        (error) => {
          console.warn("[GPS_GEOLOC_ERROR]", error.message)
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000
        }
      )
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [isClockedIn, intervalMs])
}
