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
import { isAssenza } from "@/utils/shift-logic"

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

interface UseAgentDataProps {
  currentUser: any
  currentYear: number
  currentMonth: number
  shifts: DashboardShift[]
  tenant?: any
}

export function useAgentData({ currentUser, currentYear, currentMonth, shifts, tenant }: UseAgentDataProps) {
  // Data State
  const [balances, setBalances] = useState<BalanceData | null>(null)
  const [dutyTeam, setDutyTeam] = useState<DutyMember[]>([])
  const [isOfficerOnDuty, setIsOfficerOnDuty] = useState(false)
  const [loadingDutyTeam, setLoadingDutyTeam] = useState(false)
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([])
  const [agendaEntries, setAgendaEntries] = useState<AgendaItem[]>([])
  const [requests, setRequests] = useState<any[]>([])
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
      // Usiamo l'endpoint cartellino che ora restituisce sia agenda che richieste
      const res = await fetch(`/api/admin/cartellino?userId=${currentUser.id}&month=${currentMonth}&year=${currentYear}`)
      if (res.ok) {
        const data = await res.json()
        setAgendaEntries(data.agenda || [])
        setRequests(data.requests || [])
        if (data.balances) setBalances(data.balances)
        cacheDataset(`agenda-${currentMonth}-${currentYear}`, data.agenda)
      }
    } catch { 
      const cached = await getCachedDataset(`agenda-${currentMonth}-${currentYear}`)
      if (cached) {
        setAgendaEntries(cached)
      }
    }
  }, [currentMonth, currentYear, currentUser.id])

  const fetchClockRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/clock-records?limit=100')
      const data = await res.json()
      if (data.records) {
        setClockRecords(data.records)
        if (data.records.length > 0) {
          const last = data.records[0]
          // BUGFIX: Se l'ultimo record è IN, allora siamo IN anche se è passato un giorno.
          // Solo se l'ultimo record è OUT allora siamo effettivamente fuori.
          setIsClockedIn(last.type)
          setLastClockTime(new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        } else {
          setIsClockedIn('OUT')
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

  // --- PROACTIVE REMINDERS ---
  useEffect(() => {
    const reminderInterval = setInterval(() => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const todayShift = myShifts.find(s => {
        const sDate = s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date.split('T')[0]
        return sDate === today && !isAssenza(s.type)
      })

      if (!todayShift || !todayShift.timeRange) return

      try {
        const parts = todayShift.timeRange.split(/[-–]/).map(p => p.trim())
        const startTimeStr = parts[0]
        const endTimeStr = parts[1]

        const [sh, sm] = startTimeStr.split(':').map(Number)
        const [eh, em] = endTimeStr.split(':').map(Number)

        const startTime = new Date(now)
        startTime.setHours(sh, sm, 0, 0)
        
        const endTime = new Date(now)
        endTime.setHours(eh, em, 0, 0)
        // Handle night shifts for end time
        if (endTime < startTime) endTime.setDate(endTime.getDate() + 1)

        // 1. ENTRY REMINDER (If not clocked in)
        if (isClockedIn === 'OUT') {
          const diffStart = (now.getTime() - startTime.getTime()) / (60 * 1000)
          if (Math.abs(diffStart) <= 15) {
            const lastReminder = localStorage.getItem('last_clockin_reminder_time')
            if (lastReminder !== todayShift.id) {
               toast("⏰ Promemoria: Il tuo servizio inizia/è iniziato ora. Non dimenticare di timbrare!", { 
                 icon: '⏳',
                 duration: 10000,
                 style: { border: '2px solid #3b82f6', fontWeight: 'bold' }
               })
               localStorage.setItem('last_clockin_reminder_time', todayShift.id)
            }
          }

          // Location-based reminder
          if (tenant?.lat && tenant?.lng) {
            navigator.geolocation.getCurrentPosition((pos) => {
              const distance = getDistance(pos.coords.latitude, pos.coords.longitude, tenant.lat, tenant.lng)
              const radius = tenant.clockInRadius || 500
              if (distance <= radius + 50) {
                const lastLocReminder = localStorage.getItem('last_clockin_reminder_loc')
                const nowTime = Date.now()
                if (!lastLocReminder || (nowTime - Number(lastLocReminder) > 3600000)) {
                   toast("📍 Sei vicino al Comando! Vuoi timbrare l'entrata?", { 
                     icon: '🏢',
                     duration: 10000,
                     style: { border: '2px solid #10b981', fontWeight: 'bold' }
                   })
                   localStorage.setItem('last_clockin_reminder_loc', nowTime.toString())
                }
              }
            }, null, { enableHighAccuracy: false })
          }
        }

        // 2. EXIT REMINDER (If clocked in)
        if (isClockedIn === 'IN') {
          const diffEnd = (now.getTime() - endTime.getTime()) / (60 * 1000)
          // Remind 5 mins before or up to 15 mins after end time
          if (diffEnd >= -5 && diffEnd <= 15) {
            const lastExitReminder = localStorage.getItem('last_clockout_reminder_time')
            if (lastExitReminder !== todayShift.id) {
               toast((t) => (
                 <div className="flex flex-col gap-2">
                   <p className="font-bold">🏁 Il tuo turno sta per finire/è finito ({endTimeStr}).</p>
                   <p className="text-xs">Stai ancora lavorando (straordinario) o hai terminato regolarmente?</p>
                   <div className="flex gap-2 mt-2">
                     <button 
                       onClick={() => {
                         toast.dismiss(t.id)
                         toast.success("Ricevuto! Ricordati di timbrare l'uscita quando finisci.")
                       }}
                       className="bg-amber-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase"
                     >
                       Ancora Lavoro
                     </button>
                     <button 
                       onClick={() => {
                         toast.dismiss(t.id)
                         handleClockAction('OUT')
                       }}
                       className="bg-emerald-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase"
                     >
                       Esco Ora
                     </button>
                   </div>
                 </div>
               ), { 
                 duration: 20000,
                 style: { border: '2px solid #f59e0b', padding: '12px' }
               })
               localStorage.setItem('last_clockout_reminder_time', todayShift.id)
            }
          }
        }

      } catch(e) { /* silent parse error */ }

    }, 60000) // Check every minute

    return () => clearInterval(reminderInterval)
  }, [isClockedIn, myShifts, tenant])

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
        
        // 1. Detect Overtime/Correction for OUT
        let overtimeReason = null
        let isCorrection = false
        let activeShiftId = null

        if (type === 'OUT') {
          const now = new Date()
          const today = now.toISOString().split('T')[0]
          const todayShift = myShifts.find(s => {
            const sDate = s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date.split('T')[0]
            return sDate === today && !isAssenza(s.type)
          })

          if (todayShift && todayShift.timeRange) {
            activeShiftId = todayShift.id
            try {
              const [, endTimeStr] = todayShift.timeRange.split(/[-–]/).map(p => p.trim())
              const [eh, em] = endTimeStr.split(':').map(Number)
              const plannedEnd = new Date(now)
              plannedEnd.setHours(eh, em, 0, 0)

              // Handle night shift scavalco
              const startTimeStr = todayShift.timeRange.split(/[-–]/)[0].trim()
              const [sh] = startTimeStr.split(':').map(Number)
              if (eh < sh) plannedEnd.setDate(plannedEnd.getDate() + 1)

              const diffMins = Math.floor((now.getTime() - plannedEnd.getTime()) / (1000 * 60))

              if (diffMins >= 15) {
                const choice = window.confirm(
                  `⚠️ FINE TURNO RILEVATA: ${endTimeStr}\n\nSei in ritardo di ${diffMins} minuti.\n\nVuoi richiedere lo STRAORDINARIO?\n(Clicca OK per SI, ANNULLA se hai solo dimenticato di timbrare)`
                )
                
                if (choice) {
                  const reason = window.prompt("Inserisci la motivazione dello straordinario (es: Intervento imprevisto):")
                  if (reason) {
                    overtimeReason = reason
                  } else {
                    toast.error("Motivazione obbligatoria per lo straordinario. Operazione annullata.", { id: toastId })
                    setClockLoading(false)
                    return
                  }
                } else {
                  const confirmCorrection = window.confirm("Confermi di voler registrare l'uscita all'orario ufficiale di fine turno?")
                  if (confirmCorrection) {
                    isCorrection = true
                  } else {
                    toast.error("Operazione annullata.", { id: toastId })
                    setClockLoading(false)
                    return
                  }
                }
              }
            } catch (e) { console.error("Shift parse error", e) }
          }
        }

        try {
          const res = await fetch('/api/admin/clock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              overtimeReason,
              isCorrection,
              shiftId: activeShiftId
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
    requests,
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


