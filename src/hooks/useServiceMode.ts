"use client"

import { useState, useEffect, useCallback } from "react"

interface ServiceModeState {
  isClockedIn: boolean
  clockInTime: Date | null
  elapsed: string
}

export function useServiceMode(userId?: string) {
  const [state, setState] = useState<ServiceModeState>({
    isClockedIn: false,
    clockInTime: null,
    elapsed: "0:00"
  })

  // Polla lo stato timbratura ogni 30 secondi
  useEffect(() => {
    if (!userId) return

    let interval: NodeJS.Timeout
    const check = async () => {
      try {
        const res = await fetch(`/api/agent/clock-records?userId=${userId}&limit=1`)
        const data = await res.json()
        const last = data.records?.[0]
        if (last && last.type === "IN" && !last.clockOut) {
          setState({
            isClockedIn: true,
            clockInTime: new Date(last.timestamp),
            elapsed: calcElapsed(last.timestamp)
          })
        } else {
          setState({ isClockedIn: false, clockInTime: null, elapsed: "0:00" })
        }
      } catch { /* offline o errore, manteniamo stato corrente */ }
    }

    check()
    interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [userId])

  // Aggiorna contatore minuti
  useEffect(() => {
    if (!state.isClockedIn || !state.clockInTime) return
    const interval = setInterval(() => {
      setState(s => ({ ...s, elapsed: calcElapsed(s.clockInTime!) }))
    }, 60000)
    return () => clearInterval(interval)
  }, [state.isClockedIn, state.clockInTime])

  return state
}

function calcElapsed(since: Date): string {
  const diff = Math.floor((Date.now() - since.getTime()) / 60000)
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}` : `${m} min`
}

// Pattern di vibrazione
export function useHaptics() {
  const sosVibrate = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]) // SOS pattern: corto-corto-lungo
    }
  }, [])

  const alertVibrate = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 100]) // Triplo impulso
    }
  }, [])

  const notifyVibrate = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50) // Singolo breve
    }
  }, [])

  return { sosVibrate, alertVibrate, notifyVibrate }
}
