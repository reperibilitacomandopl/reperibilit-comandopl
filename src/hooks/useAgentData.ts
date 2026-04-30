"use client"

import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import { 
  cacheDataset, 
  getCachedDataset, 
  storeOfflineRequest, 
  syncOfflineRequests 
} from "@/lib/offline-sync"
import { 
  DashboardShift, 
  BalanceData, 
  DutyMember, 
  SwapRequest, 
  OdsData, 
  AgendaItem 
} from "@/types/dashboard"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"

interface UseAgentDataProps {
  currentUser: any
  currentYear: number
  currentMonth: number
  shifts: DashboardShift[]
}

export function useAgentData({ currentUser, currentYear, currentMonth, shifts }: UseAgentDataProps) {
  // Data State
  const [balances, setBalances] = useState<BalanceData | null>(null)
  const [dutyTeam, setDutyTeam] = useState<DutyMember[]>([])
  const [isOfficerOnDuty, setIsOfficerOnDuty] = useState(false)
  const [loadingDutyTeam, setLoadingDutyTeam] = useState(false)
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [agendaEntries, setAgendaEntries] = useState<AgendaItem[]>([])
  const [myOds, setMyOds] = useState<OdsData | null>(null)
  const [isClockedIn, setIsClockedIn] = useState<'IN' | 'OUT' | null>(null)
  const [lastClockTime, setLastClockTime] = useState<string | null>(null)
  const [clockRecords, setClockRecords] = useState<any[]>([])
  
  // UI State (for hooks/actions)
  const [clockLoading, setClockLoading] = useState(false)
  const [swapLoading, setSwapLoading] = useState(false)
  const [agendaSaving, setAgendaSaving] = useState(false)
  const [telegramCode, setTelegramCode] = useState('')
  const [telegramLoading, setTelegramLoading] = useState(false)

  const myShifts = shifts.filter(s => s.userId === currentUser.id)

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/balances?year=${currentYear}`)
      if (res.ok) {
        const data = await res.json()
        setBalances(data) 
      }
    } catch { /* silent */ }
  }, [currentYear])

  const fetchDutyTeam = useCallback(async () => {
    try {
      setLoadingDutyTeam(true)
      const res = await fetch('/api/officer/duty-team')
      if (res.ok) {
        const data = await res.json()
        setDutyTeam(data.team || [])
        setIsOfficerOnDuty(true)
      }
    } catch (error) {
      console.error("Error fetching duty team:", error)
    } finally {
      setLoadingDutyTeam(false)
    }
  }, [])

  const fetchSwaps = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts/swap')
      if (res.ok) {
        const data = await res.json()
        setSwapRequests(data)
      }
    } catch { /* silent */ }
  }, [])

  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch(`/api/agenda?month=${currentMonth}&year=${currentYear}`)
      if (res.ok) {
        const data = await res.json()
        setAgendaEntries(data)
        cacheDataset(`agenda-${currentMonth}-${currentYear}`, data)
      }
    } catch { 
      const cached = await getCachedDataset(`agenda-${currentMonth}-${currentYear}`)
      if (cached) {
        setAgendaEntries(cached)
      }
    }
  }, [currentMonth, currentYear])

  const fetchClockRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/clock-records?limit=100')
      const data = await res.json()
      if (data.records) {
        setClockRecords(data.records)
        if (data.records.length > 0) {
          const last = data.records[0]
          const today = new Date().toDateString()
          if (new Date(last.timestamp).toDateString() === today) {
            setIsClockedIn(last.type)
            setLastClockTime(new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          } else {
            setIsClockedIn('OUT')
          }
        }
      }
    } catch { /* silent */ }
  }, [])

  const fetchOds = useCallback(async () => {
    try {
      const res = await fetch('/api/my-ods')
      const data = await res.json()
      if(data.success && data.shift && (data.shift.timeRange || data.shift.serviceCategoryId)) {
        const odsPayload = { shift: data.shift, partners: data.partners }
        setMyOds(odsPayload)
        cacheDataset('my-ods', odsPayload) 
      }
    } catch {
      const cachedOds = await getCachedDataset('my-ods')
      if (cachedOds) {
        setMyOds(cachedOds)
      }
    }
  }, [])

  useEffect(() => {
    if (navigator.onLine) syncOfflineRequests()
    fetchDutyTeam()
    fetchSwaps()
    fetchBalances()
    fetchClockRecords()
    fetchOds()
    fetchAgenda()

    const handleOnline = () => {
       toast.success("Connessione ripristinata! Sincronizzazione in corso...")
       syncOfflineRequests()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [currentMonth, currentYear, fetchDutyTeam, fetchSwaps, fetchBalances, fetchClockRecords, fetchOds, fetchAgenda])

  const handleClockAction = async (type: 'IN' | 'OUT') => {
    if (!navigator.geolocation) {
      return toast.error("Il tuo browser non supporta la geolocalizzazione.")
    }

    setClockLoading(true)
    const toastId = toast.loading(`${type === 'IN' ? 'Entrata' : 'Uscita'} in corso...`)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (pos.coords.accuracy > 500) {
          setClockLoading(false)
          return toast.error("Segnale GPS troppo debole! Esci all'aperto o attendi un segnale più preciso.", { id: toastId })
        }
        
        if (pos.coords.accuracy > 100) {
          toast("Segnale GPS impreciso, la timbratura potrebbe essere rifiutata.", { icon: "⚠️" })
        }
        
        try {
          const res = await fetch('/api/admin/clock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            })
          })

          const data = await res.json()

          if (res.ok) {
            setIsClockedIn(type)
            setLastClockTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
            toast.success(`Timbratura ${type === 'IN' ? 'Entrata' : 'Uscita'} registrata!`, { id: toastId })
          } else {
            const errorMsg = data.distance ? 
              `Troppo lontano! Sei a ${data.distance}m (Limite: ${data.allowed}m)` : 
              (data.error || "Errore durante la timbratura")
            toast.error(errorMsg, { id: toastId, duration: 6000 })
          }
        } catch (error) {
          await storeOfflineRequest('/api/admin/clock-in', 'POST', {
            type, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy
          })
          setIsClockedIn(type)
          setLastClockTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          toast.success(`⚠️ Offline: Timbratura archiviata localmente.`, { id: toastId })
        } finally {
          setClockLoading(false)
        }
      },
      () => {
        setClockLoading(false)
        toast.error("Impossibile ottenere la posizione. Verifica i permessi GPS.", { id: toastId })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleRespondSwap = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    setSwapLoading(true)
    try {
      const res = await fetch(`/api/shifts/swap/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        toast.success(status === 'ACCEPTED' ? "Scambio accettato!" : "Scambio rifiutato.")
        fetchSwaps()
      } else {
        const d = await res.json()
        toast.error(d.error || "Errore")
      }
    } catch {
      toast.error("Errore di connessione")
    } finally {
      setSwapLoading(false)
    }
  }

  const handleSaveAgenda = async (date: number, code: string, hours: string, note: string) => {
    const item = AGENDA_CATEGORIES.flatMap(c => c.items).find(i => i.code === code)
    if (!item) return false
    setAgendaSaving(true)
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(Date.UTC(currentYear, currentMonth - 1, date)).toISOString(),
          code: item.code,
          label: item.label,
          hours: hours ? parseFloat(hours) : null,
          note: note || null,
        })
      })
      if (res.ok) {
        fetchAgenda()
        return true
      } else {
        const errData = await res.json()
        toast.error('Errore: ' + (errData.error || 'Server error'))
        return false
      }
    } catch {
      toast.error('Errore di connessione.')
      return false
    } finally {
      setAgendaSaving(false)
    }
  }

  const handleDeleteAgenda = async (id: string) => {
    if (!confirm('Eliminare questa voce dall\'agenda?')) return
    try {
      const res = await fetch('/api/agenda', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) fetchAgenda()
    } catch { /* */ }
  }

  const handleGenerateTelegramCode = async () => {
    setTelegramLoading(true)
    try {
      const res = await fetch('/api/telegram/link-code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTelegramCode(data.code)
      toast.success('Codice generato!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore.')
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleSendFullSos = async (note: string, audioBlob: Blob | null) => {
    const toastId = toast.loading("Inviando SOS GPS Premium...")
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
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
              userId: currentUser.id,
              type: 'SOS',
              message: `🆘 SOS GPS! ${currentUser.name} (Matr. ${currentUser.matricola})`,
              note: note,
              audio: audioBase64,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            })
          })
          
          if (res.ok) {
            toast.success('🚨 SOS INVIATO CON SUCCESSO!', { id: toastId })
            resolve(true)
          } else {
            throw new Error('Send failed')
          }
        } catch {
          toast.error('Errore invio SOS.', { id: toastId })
          resolve(false)
        }
      }, () => {
        toast.error("GPS non disponibile.", { id: toastId })
        resolve(false)
      }, { enableHighAccuracy: true })
    })
  }

  return {
    balances,
    dutyTeam,
    isOfficerOnDuty,
    loadingDutyTeam,
    swapRequests,
    agendaEntries,
    myOds,
    isClockedIn,
    lastClockTime,
    clockRecords,
    clockLoading,
    swapLoading,
    agendaSaving,
    telegramCode,
    telegramLoading,
    myShifts,
    handleClockAction,
    handleRespondSwap,
    handleSaveAgenda,
    handleDeleteAgenda,
    handleGenerateTelegramCode,
    handleSendFullSos,
    fetchSwaps,
    fetchBalances,
    fetchAgenda,
    fetchClockRecords
  }
}


