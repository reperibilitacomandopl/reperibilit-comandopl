"use client"

import { useState, useEffect, useCallback } from "react"
import toast from "react-hot-toast"
import { CalendarDays, AlertCircle, FileDown, Clock, ShieldCheck, Plus, ChevronLeft, ChevronRight, ListChecks, X, Smartphone, Monitor, Globe, Trash2, Search, BookOpen, Send, Phone, RefreshCw, ChevronDown, CheckCircle2, Car, MapPin, Users, ArrowRightLeft } from "lucide-react"
import { isHoliday } from "@/utils/holidays"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { isMalattia, isMattina } from "@/utils/shift-logic"
import NotificationHub from "@/components/NotificationHub"
import PlanningMobileView from "./PlanningMobileView"
import NotificationManager from "./NotificationManager"
import { cacheDataset, getCachedDataset, storeOfflineRequest, syncOfflineRequests } from "@/lib/offline-sync"

// ====== CODICI AGENDA PERSONALE ======
const AGENDA_CATEGORIES = [
  {
    group: "Ferie e Festività", emoji: "🏖️", color: "amber",
    items: [
      { code: "0015", label: "Ferie Anno Corrente" },
      { code: "0016", label: "Ferie Anni Precedenti" },
      { code: "0010", label: "Festività Soppresse" },
    ]
  },
  {
    group: "Congedi", emoji: "👶", color: "rose",
    items: [
      { code: "0112", label: "Congedo di Paternità" },
      { code: "0111", label: "Congedo Parentale 100% Figlio 1" },
      { code: "0110", label: "Congedo Parentale 100% Figlio 2" },
      { code: "0098", label: "Congedo Parentale 80% Figlio 1" },
      { code: "0095", label: "Congedo Parentale 80% Figlio 2" },
      { code: "0097", label: "Congedo Parentale 30% Figlio 1" },
      { code: "0096", label: "Congedo Parentale 30% Figlio 2" },
    ]
  },
  {
    group: "Permessi", emoji: "📋", color: "blue",
    items: [
      { code: "0004", label: "Permessi Istituzionali Non Retribuiti" },
      { code: "0005", label: "Permessi Istituzionali Retribuiti" },
      { code: "0031", label: "Permessi L.104/92 Art.33 Assistito 1" },
      { code: "0038", label: "Permessi L.104/92 Art.33 Assistito 2" },
      { code: "0014", label: "Particolari Motivi Personali o Familiari" },
      { code: "0002", label: "Esercizio Funzioni Elettorali" },
    ]
  },
  {
    group: "Malattia e Salute", emoji: "🏥", color: "red",
    items: [
      { code: "0018", label: "Malattia Figlio 0-3 Anni Figlio 1" },
      { code: "0019", label: "Malattia Figlio 0-3 Anni Figlio 2" },
      { code: "0032", label: "Visite Terapie Prestazioni o Esami Diagnostici" },
      { code: "0054", label: "Controlli Prenatali" },
      { code: "0003", label: "Allattamento" },
      { code: "0035", label: "Donazione Sangue" },
      { code: "0133", label: "Disponibilità Covid-19" },
    ]
  },
  {
    group: "Recupero Ore", emoji: "🔄", color: "teal",
    items: [
      { code: "0009", label: "Recupero A.O." },
      { code: "0067", label: "Recupero Ore Corsi" },
      { code: "0008", label: "Recupero Ore Eccedenti" },
      { code: "0081", label: "Recupero Ore Straord. Elettorale" },
      { code: "0036", label: "Riposo Compensativo Elettorale" },
      { code: "0037", label: "Riposo Recupero PL" },
      { code: "2027", label: "Ore Servizio Elettorale da Recuperare" },
    ]
  },
  {
    group: "Straordinario", emoji: "⏰", color: "orange",
    items: [
      { code: "2000", label: "Straordinario - Pagamento" },
      { code: "2050", label: "Straordinario A.O." },
      { code: "2001", label: "Straordinario Notturno" },
      { code: "2002", label: "Straordinario Festivo Diurno" },
      { code: "2003", label: "Straordinario Festivo Notturno" },
      { code: "2020", label: "Straordinario Elettorale - Diurno" },
      { code: "2021", label: "Straordinario Notturno" },
      { code: "2022", label: "Straordinario Elettorale Festivo Diurno" },
      { code: "2023", label: "Straordinario Elettorale Festivo Notturno" },
      { code: "2026", label: "Straordinario Stato Civile" },
      { code: "10001", label: "Straordinario Stato Civile Notturno" },
      { code: "10002", label: "Straordinario Stato Civile Festivo Diurno" },
      { code: "10003", label: "Straordinario Stato Civile Festivo Notturno" },
    ]
  },
  {
    group: "Formazione e Altro", emoji: "🎓", color: "indigo",
    items: [
      { code: "2041", label: "Corso di Aggiornamento" },
      { code: "10004", label: "Corso di Formazione" },
      { code: "0012", label: "Concorsi ed Esami" },
      { code: "0011", label: "Diritto allo Studio 150 Ore" },
      { code: "0131", label: "Lavoro Agile" },
      { code: "0068", label: "Missione" },
      { code: "0062", label: "Servizio Fuori Sede" },
    ]
  },
]

// Helper: get category color for a code
function getCategoryForCode(code: string) {
  return AGENDA_CATEGORIES.find(c => c.items.some(i => i.code === code))
}

// Color mapping for badges
const CAT_COLORS: Record<string, { bg: string, text: string, border: string, dot: string, bar: string }> = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400',  bar: 'bg-gradient-to-r from-amber-400 to-amber-600' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',  dot: 'bg-rose-400',   bar: 'bg-gradient-to-r from-rose-400 to-rose-600' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-400',   bar: 'bg-gradient-to-r from-blue-400 to-blue-600' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   dot: 'bg-red-400',    bar: 'bg-gradient-to-r from-red-400 to-red-600' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',  dot: 'bg-teal-400',   bar: 'bg-gradient-to-r from-teal-400 to-teal-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',dot: 'bg-orange-400', bar: 'bg-gradient-to-r from-orange-400 to-orange-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',dot: 'bg-indigo-400', bar: 'bg-gradient-to-r from-indigo-400 to-indigo-600' },
}

// Helper: get bar color for a category
function paramsToColor(color: string) {
  return CAT_COLORS[color]?.bar || 'bg-indigo-500'
}

type AgendaItem = {
  id: string
  date: string
  code: string
  label: string
  hours: number | null
  note: string | null
}

export default function AgentDashboard({ currentUser, shifts, allAgents, currentYear, currentMonth, isPublished, currentView, tenantName, tenantSlug, canManageShifts, canManageUsers, canVerifyClockIns, canConfigureSystem, userRole }: { currentUser: { id: string, matricola: string, name: string, telegramChatId?: string | null }, shifts: { userId: string, date: Date | string, type: string, repType: string | null }[], allAgents: any[], currentYear: number, currentMonth: number, isPublished: boolean, currentView?: string, tenantName?: string | null, tenantSlug?: string | null, canManageShifts?: boolean, canManageUsers?: boolean, canVerifyClockIns?: boolean, canConfigureSystem?: boolean, userRole?: string }) {
  const router = useRouter()
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [showAgenda, setShowAgenda] = useState(false)
  const [agendaEntries, setAgendaEntries] = useState<AgendaItem[]>([])
  const [agendaDate, setAgendaDate] = useState('')
  const [agendaCode, setAgendaCode] = useState('')
  const [agendaHours, setAgendaHours] = useState('')
  const [agendaNote, setAgendaNote] = useState('')
  const [agendaSearch, setAgendaSearch] = useState('')
  const [agendaSaving, setAgendaSaving] = useState(false)
  const [telegramCode, setTelegramCode] = useState('')
  const [telegramLoading, setTelegramLoading] = useState(false)
  
  // Duty Officer State
  const [dutyTeam, setDutyTeam] = useState<any[]>([])
  const [isOfficerOnDuty, setIsOfficerOnDuty] = useState(false)
  const [loadingDutyTeam, setLoadingDutyTeam] = useState(false)

  // Shift Swap State
  const [swapRequests, setSwapRequests] = useState<any[]>([])
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showAbsenceModal, setShowAbsenceModal] = useState(false)
  const [reqDate, setReqDate] = useState('')
  const [reqEndDate, setReqEndDate] = useState('')
  const [reqCode, setReqCode] = useState('')
  const [reqNotes, setReqNotes] = useState('')
  const [reqStartTime, setReqStartTime] = useState('')
  const [reqEndTime, setReqEndTime] = useState('')
  const [reqHours, setReqHours] = useState('')
  const [isHourlyRequest, setIsHourlyRequest] = useState(false)
  const [reqLoading, setReqLoading] = useState(false)
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<any>(null)
  const [targetColleagueId, setTargetColleagueId] = useState('')
  const [swapLoading, setSwapLoading] = useState(false)
  
  // Daily OdS State
  const [myOds, setMyOds] = useState<any>(null)
  
  // Balances
  const [balances, setBalances] = useState<any>(null)
  
  // Clock-in / GPS State
  const [isClockedIn, setIsClockedIn] = useState<'IN' | 'OUT' | null>(null)
  const [clockLoading, setClockLoading] = useState(false)
  const [lastClockTime, setLastClockTime] = useState<string | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)

  const myShifts = shifts.filter(s => s.userId === currentUser.id)

  const fetchBalances = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/balances?year=${currentYear}`)
      if (res.ok) {
        const data = await res.json()
        setBalances(data) // Now stores { year, user { qualifica, ... }, details: [...] }
      }
    } catch { /* silent */ }
  }, [currentYear])

  // Fetch Duty Team if Officer
  const fetchDutyTeam = useCallback(async () => {
    try {
      setLoadingDutyTeam(true)
      const res = await fetch('/api/officer/duty-team')
      if (res.ok) {
        const data = await res.json()
        setDutyTeam(data.team || [])
        setIsOfficerOnDuty(true)
      }
    } catch (err) {
      console.error("Error fetching duty team:", err)
    } finally {
      setLoadingDutyTeam(false)
    }
  }, [])

  // Fetch Swap Requests
  const fetchSwaps = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts/swap')
      if (res.ok) {
        const data = await res.json()
        setSwapRequests(data)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    // Avvio sincronizzazione se siamo tornati online
    if (navigator.onLine) {
      syncOfflineRequests()
    }

    fetchDutyTeam()
    fetchSwaps()
    fetchBalances()
    
    // Fetch Last Clock-in Status
    fetch('/api/admin/clock-in')
      .then(res => res.json())
      .then(data => {
        if (data.records && data.records.length > 0) {
          const last = data.records[0]
          const today = new Date().toDateString()
          if (new Date(last.timestamp).toDateString() === today) {
            setIsClockedIn(last.type)
            setLastClockTime(new Date(last.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          }
        }
      }).catch(() => {
        // Tentativo recupero stato timbratura da IndexedDB (futuro)
      })

    // Fetch ODS con Caching
    fetch('/api/my-ods')
      .then(res => res.json())
      .then(data => {
        if(data.success && data.shift && (data.shift.timeRange || data.shift.serviceCategoryId)) {
          const odsPayload = { shift: data.shift, partners: data.partners }
          setMyOds(odsPayload)
          cacheDataset('my-ods', odsPayload) // Salva in locale
        }
      })
      .catch(async () => {
        const cachedOds = await getCachedDataset('my-ods')
        if (cachedOds) {
          setMyOds(cachedOds)
          console.log('[PWA] Caricato ODS dalla cache locale.')
        }
      })

    // Listener globale per tornare online
    const handleOnline = () => {
       toast.success("Connessione ripristinata! Sincronizzazione in corso...")
       syncOfflineRequests()
    }
    window.addEventListener('online', handleOnline)

    // Gestione AZIONI da URL (PWA Shortcuts)
    const urlParams = new URLSearchParams(window.location.search)
    const action = urlParams.get('action')
    if (action) {
      if (action === 'sos') {
        const confirmSos = window.confirm("🚨 INVIARE SOS GPS ALLA CENTRALE? La tua posizione attuale verrà trasmessa immediatamente.")
        if (confirmSos) {
          // Trigger manuale SOS (uso timeout per garantire che il componente sia pronto)
          setTimeout(() => {
             const sosBtn = document.getElementById('btn-sos-pwa')
             if (sosBtn) (sosBtn as HTMLElement).click()
          }, 500)
        }
      } else if (action === 'clockin') {
        if (isClockedIn !== 'IN') {
           setTimeout(() => handleClockAction('IN'), 800)
        }
      } else if (action === 'planning') {
        toast("Visualizzazione turni mensili", { icon: "📅" })
      }
      
      // Pulisci URL per evitare loop
      window.history.replaceState({}, '', window.location.pathname)
    }

    return () => window.removeEventListener('online', handleOnline)
  }, [fetchDutyTeam, fetchSwaps, fetchBalances, isClockedIn])

  const handleRespondSwap = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    setSwapLoading(true)
    try {
      const res = await fetch(`/api/shifts/swap/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        toast.success(status === 'ACCEPTED' ? "Scambio accettato! In attesa di approvazione Admin." : "Scambio rifiutato.")
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

  const handleRequestSwap = async () => {
    if (!selectedShiftForSwap || !targetColleagueId) return
    setSwapLoading(true)
    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: selectedShiftForSwap.id, targetUserId: targetColleagueId })
      })
      if (res.ok) {
        toast.success("Proposta di scambio inviata al collega!")
        setShowSwapModal(false)
        fetchSwaps()
      } else {
        const d = await res.json()
        toast.error(d.error || "Errore nell'invio")
      }
    } catch {
      toast.error("Errore di rete")
    } finally {
      setSwapLoading(false)
    }
  }

  // Fetch agenda entries for current month
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
        console.log(`[PWA] Caricata Agenda da cache locale per ${currentMonth}/${currentYear}`)
      }
    }
  }, [currentMonth, currentYear])

  useEffect(() => { fetchAgenda() }, [fetchAgenda])

  const handleSaveAgenda = async () => {
    if (!agendaDate || !agendaCode) return
    const item = AGENDA_CATEGORIES.flatMap(c => c.items).find(i => i.code === agendaCode)
    if (!item) return
    setAgendaSaving(true)
    try {
      const res = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(Date.UTC(currentYear, currentMonth - 1, parseInt(agendaDate))).toISOString(),
          code: item.code,
          label: item.label,
          hours: agendaHours ? parseFloat(agendaHours) : null,
          note: agendaNote || null,
        })
      })
      if (res.ok) {
        setAgendaCode('')
        setAgendaHours('')
        setAgendaNote('')
        setAgendaDate('')
        fetchAgenda()
      } else {
        const errData = await res.json()
        console.error('Save failed:', errData)
        toast.error('Errore durante il salvataggio: ' + (errData.error || 'Server error'))
      }
    } catch (err) {
      console.error('Save exception:', err)
      toast.error('Errore di connessione o del server.')
    }
    setAgendaSaving(false)
  }

  const handleClockAction = (type: 'IN' | 'OUT') => {
    if (!navigator.geolocation) {
      return toast.error("Il tuo browser non supporta la geolocalizzazione.")
    }

    setClockLoading(true)
    const toastId = toast.loading(`${type === 'IN' ? 'Entrata' : 'Uscita'} in corso...`)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
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
          setIsClockedIn(type)
          setLastClockTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          toast.success(`Timbratura ${type === 'IN' ? 'Entrata' : 'Uscita'} registrata!`, { id: toastId })
        } catch (err: any) {
          console.warn('[PWA] Invio timbratura fallito, tento archiviazione locale...', err)
          
          // Fallback Offline: Parcheggia la richiesta nel DB Locale
          await storeOfflineRequest('/api/admin/clock-in', 'POST', {
            type,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          })
          
          setIsClockedIn(type)
          setLastClockTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          toast.success(`⚠️ Offline: Timbratura ${type === 'IN' ? 'Entrata' : 'Uscita'} archiviata localmente. Verrà inviata appena torna il segnale.`, { id: toastId, duration: 5000 })
        } finally {
          setClockLoading(false)
        }
      },
      (err) => {
        setClockLoading(false)
        toast.error("Impossibile ottenere la posizione. Verifica i permessi GPS.", { id: toastId })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }


  const handleDeleteAgenda = async (id: string) => {
    if (!confirm('Eliminare questa voce dall\'agenda?')) return
    try {
      await fetch('/api/agenda', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      fetchAgenda()
    } catch { /* */ }
  }
  
  // Dynamic Month Info
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
  const currentMonthName = monthNames[currentMonth - 1]
  
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  const dayInfo = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const date = new Date(currentYear, currentMonth - 1, d)
    const isFestivo = isHoliday(date)
    return { day: d, name: dayNames[date.getDay()], isWeekend: isFestivo, isNextMonth: false }
  })

  // Add First Day of Next Month as "Ghost Day" for context
  const nextDay1 = new Date(currentYear, currentMonth, 1)
  dayInfo.push({ 
    day: 1, 
    name: dayNames[nextDay1.getDay()], 
    isWeekend: isHoliday(nextDay1),
    isNextMonth: true 
  })

  // Collect REP days for this agent
  const repDays: { day: number; dayName: string; repType: string; baseType: string; shiftObj: any }[] = []
  dayInfo.forEach(di => {
    if (di.isNextMonth) return
    const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
    const sObj = myShifts.find(s => new Date(s.date).toISOString() === targetDate)
    if (sObj?.repType?.toUpperCase().includes("REP")) {
      repDays.push({
        day: di.day,
        dayName: di.name,
        repType: sObj.repType || "REP",
        baseType: (sObj.type || "").toUpperCase(),
        shiftObj: sObj
      })
    }
  })
  const repCount = repDays.length

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    const monthYear = `${monthNames[currentMonth - 1]} ${currentYear}`
    
    // Header
    doc.setFontSize(20)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text('Resoconto Mensile Attività', 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(`Polizia Locale ${tenantName ? `di ${tenantName}` : "Nazionale"}`, 14, 30)
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`, 14, 35)
    
    // Personal Info
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.text(`Agente: ${currentUser.name}`, 14, 50)
    doc.text(`Matricola: ${currentUser.matricola}`, 14, 57)
    doc.text(`Periodo: ${monthYear}`, 14, 64)
    
    // Stats Summary Table
    const straCodes = ['2000','2050','2001','2002','2003','2020','2021','2022','2023','2026','10001','10002','10003']
    const ferieCodes = ['0015','0016','0010']
    const recCodes = ['0009','0067','0008','0081','0036','0037']
    
    const straHours = agendaEntries.filter(e => straCodes.includes(e.code)).reduce((sum, e) => sum + (e.hours || 0), 0)
    const ferieDays = new Set(agendaEntries.filter(e => ferieCodes.includes(e.code)).map(e => new Date(e.date).getUTCDate())).size
    const recHours = agendaEntries.filter(e => recCodes.includes(e.code)).reduce((sum, e) => sum + (e.hours || 0), 0)

    autoTable(doc, {
      startY: 75,
      head: [['Categoria', 'Valore', 'Unità']],
      body: [
        ['Straordinario', straHours, 'ore'],
        ['Ferie / Festività', ferieDays, 'giorni'],
        ['Recupero Ore', recHours, 'ore'],
        ['Reperibilità', repCount, 'turni'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    })

    // Details Table
    doc.setFontSize(14)
    doc.text('Dettaglio Agenda Personale', 14, (doc as any).lastAutoTable.finalY + 15)
    
    const tableData = agendaEntries.map(e => [
      new Date(e.date).toLocaleDateString('it-IT'),
      e.code,
      e.label,
      e.hours ? `${e.hours}h` : '-',
      e.note || '-'
    ])

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Data', 'Cod.', 'Descrizione', 'Ore', 'Note']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] }, // slate-700
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 15 },
        3: { cellWidth: 15 },
      }
    })

    doc.save(`Resoconto_${currentUser.matricola}_${currentMonth}_${currentYear}.pdf`)
  }

  if (!isPublished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-700">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <div className="relative p-8 bg-white rounded-full shadow-2xl border-4 border-slate-50">
            <CalendarDays size={64} className="text-blue-600" />
            <div className="absolute -bottom-1 -right-1 p-2 bg-amber-500 rounded-full border-4 border-white shadow-lg shadow-amber-200">
              <Clock size={20} className="text-white animate-spin-slow" />
            </div>
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Turni in fase di pubblicazione</h2>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
          L&apos;ufficio sta finalizzando la programmazione per il mese di <span className="font-bold text-slate-700">{currentMonthName} {currentYear}</span>. 
          Riprova più tardi per consultare la tua agenda definitiva.
        </p>

        <div className="flex gap-4">
          <Link 
            href={`/${tenantSlug}?month=${prevMonth}&year=${prevYear}${currentView ? `&view=${currentView}` : ''}`}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <ChevronLeft size={18} />
            Mese Precedente
          </Link>
          
          <select 
            value={currentMonth}
            onChange={(e) => router.push(`/${tenantSlug}?month=${e.target.value}&year=${currentYear}${currentView ? `&view=${currentView}` : ''}`)}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {monthNames.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
          </select>

          <button 
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <RefreshCw size={18} />
            Aggiorna
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Gestore Notifiche PWA */}
      <NotificationManager />

      {/* Duty Officer Dashboard Section (Solo se in servizio oggi) */}
      {isOfficerOnDuty && dutyTeam.length > 0 && (
        <div className="bg-white rounded-[2rem] border-4 border-blue-600 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <ShieldCheck size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Centrale Operativa</h3>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Riepilogo Reperibili di Oggi</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black uppercase opacity-60">Ufficiale di Servizio</p>
              <p className="font-bold text-sm">{currentUser.name}</p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dutyTeam.map((member) => (
                <div key={member.id} className="group relative bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-xl hover:border-blue-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-blue-600 uppercase tracking-wider">{member.repType}</span>
                        {member.telegramChatId ? (
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Telegram OK</span>
                        ) : (
                          <span className="bg-slate-200 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">No Telegram</span>
                        )}
                      </div>
                      <h4 className="font-black text-slate-900 line-clamp-1">{member.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Matricola: {member.matricola}</p>
                    </div>

                    {member.phone && (
                      <a 
                        href={`tel:${member.phone}`}
                        className="p-4 bg-white border border-slate-200 text-blue-600 rounded-2xl shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:scale-110 active:scale-95 transition-all"
                        title="Chiama ora"
                      >
                        <Phone size={24} fill="currentColor" fillOpacity={0.1} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-sm text-center sm:text-left">
                ℹ️ Questa rubrica è visibile esclusivamente all'Ufficiale incaricato per la giornata odierna.
              </p>
              <button 
                onClick={async () => {
                  if (!confirm('🚨 Inviare allerta emergenza via Telegram a tutto il team?')) return
                  const res = await fetch('/api/admin/alert-emergency', { method: 'POST' })
                  if (res.ok) toast.success('🚨 Allerta inviata con successo!')
                  else toast.error('Impossibile inviare l\'allerta.')
                }}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black text-sm shadow-xl shadow-red-200 transition-all hover:scale-[1.03] active:scale-[0.97]"
              >
                <Send size={18} />
                Lancia Allerta Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY SOS QUICK ACTION */}
      <div className="block lg:hidden px-2 mb-2">
         <button 
           id="btn-sos-pwa"
           onClick={async () => {
             if (!confirm('🚨 INVIARE SOS GPS ALLA CENTRALE? La tua posizione attuale verrà trasmessa immediatamente.')) return
             const toastId = toast.loading("Inviando SOS GPS...")
             navigator.geolocation.getCurrentPosition(async (pos) => {
               try {
                 const res = await fetch('/api/admin/alert-emergency', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ 
                     userId: currentUser.id,
                     type: 'SOS',
                     message: `🆘 SOS GPS! L'operatore ${currentUser.name} (Matr. ${currentUser.matricola}) ha lanciato un SOS.`,
                     lat: pos.coords.latitude,
                     lng: pos.coords.longitude
                   })
                 })
                 if (res.ok) toast.success('🚨 SOS INVIATO! Resta in attesa di istruzioni.', { id: toastId })
                 else throw new Error('Send failed')
               } catch (err) {
                 console.warn('[PWA] Invio SOS fallito, archiviazione locale SOS...', err)
                 await storeOfflineRequest('/api/admin/alert-emergency', 'POST', {
                   userId: currentUser.id,
                   type: 'SOS',
                   message: `🆘 SOS GPS! L'operatore ${currentUser.name} (Matr. ${currentUser.matricola}) ha lanciato un SOS.`,
                   lat: pos.coords.latitude,
                   lng: pos.coords.longitude
                 })
                 toast.success('🚨 SOS ARCHIVIATO! Verrà inviato appena torna il segnale.', { id: toastId, duration: 8000 })
               }
             }, () => {
               toast.error("Impossibile ottenere GPS per SOS.", { id: toastId })
             }, { enableHighAccuracy: true })
           }}
           className="w-full bg-red-600 active:bg-red-800 text-white rounded-2xl py-5 px-4 flex items-center justify-center gap-3 shadow-xl shadow-red-200 animate-pulse border-4 border-red-500/50"
         >
           <AlertCircle size={32} className="shrink-0" />
           <div className="text-left">
              <p className="font-black text-lg leading-tight uppercase">SOS GPS EMERGENZA</p>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Invia Posizione alla Centrale</p>
           </div>
         </button>
      </div>

      <div className="bg-slate-900 text-white rounded-[2.5rem] p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex-1">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter leading-tight mb-2">
              Ciao, {currentUser.name.split(" ")[0]}! 👋
            </h2>
            
            {/* Widget Timbratura GPS */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl shadow-xl">
                <div className={`p-3 rounded-2xl ${isClockedIn === 'IN' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-slate-800'}`}>
                  <Clock size={24} className={isClockedIn === 'IN' ? 'text-white' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Status Servizio</p>
                  <p className="text-sm font-black text-white uppercase">
                    {isClockedIn === 'IN' ? `In Servizio (Dalle ${lastClockTime})` : 'Fuori Servizio'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={clockLoading || isClockedIn === 'IN'}
                  onClick={() => handleClockAction('IN')}
                  className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    isClockedIn === 'IN'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/30 active:scale-95'
                  }`}
                >
                  {clockLoading && isClockedIn !== 'OUT' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <MapPin size={16} />}
                  Entra
                </button>

                <button
                  disabled={clockLoading || isClockedIn !== 'IN'}
                  onClick={() => handleClockAction('OUT')}
                  className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    isClockedIn !== 'IN'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/30 active:scale-95'
                  }`}
                >
                  {clockLoading && isClockedIn === 'IN' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <ArrowRightLeft size={16} />}
                  Esci
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-8">
              <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl p-1 border border-white/10">
                <Link 
                  href={`/${tenantSlug}?month=${prevMonth}&year=${prevYear}${currentView ? `&view=${currentView}` : ''}`} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                  title="Mese precedente"
                >
                  <ChevronLeft size={20} />
                </Link>
                
                <div className="flex items-center gap-1">
                  <select 
                    value={currentMonth}
                    onChange={(e) => router.push(`/${tenantSlug}?month=${e.target.value}&year=${currentYear}${currentView ? `&view=${currentView}` : ''}`)}
                    className="bg-transparent border-none text-xs font-black uppercase tracking-widest text-center focus:ring-0 cursor-pointer py-2 pl-2 pr-6 appearance-none"
                    style={{ backgroundPosition: 'right 0.2rem center' }}
                  >
                    {monthNames.map((name, i) => (
                      <option key={name} value={i + 1} className="text-slate-900">{name.substring(0,3)}</option>
                    ))}
                  </select>
                  <select 
                    value={currentYear}
                    onChange={(e) => router.push(`/${tenantSlug}?month=${currentMonth}&year=${e.target.value}${currentView ? `&view=${currentView}` : ''}`)}
                    className="bg-transparent border-none text-xs font-black text-white/40 focus:ring-0 cursor-pointer py-2 pl-1 pr-6 appearance-none"
                    style={{ backgroundPosition: 'right 0.2rem center' }}
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y} className="text-slate-900">{y}</option>
                    ))}
                  </select>
                </div>
 
                <Link 
                  href={`/${tenantSlug}?month=${nextMonth}&year=${nextYear}${currentView ? `&view=${currentView}` : ''}`} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  title="Mese successivo"
                >
                  <ChevronRight size={20} />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-4">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl shadow-inner">
                <ShieldCheck className="text-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-[9px] text-emerald-300/60 font-black uppercase tracking-wider">Reperibilità</p>
                <p className="text-xl font-black text-white">{repCount}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-start gap-4">
              {(canManageShifts || canManageUsers || canVerifyClockIns || canConfigureSystem || userRole === "ADMIN") && (
                <Link
                  href={`/${tenantSlug}/admin/pannello`}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ShieldCheck size={18} />
                  <span className="hidden sm:inline">Area Admin</span>
                </Link>
              )}
              <NotificationHub userRole={userRole} />
              <button 
                onClick={() => setShowSyncModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <CalendarDays size={18} className="text-blue-600" />
                Sincronizza
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TOP INFO CARDS: ANAGRAFICA & TURNO OGGI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 -mt-4">
        {/* Scheda Anagrafica Premium */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden group hover:border-blue-400 transition-all duration-300 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-40 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
          <div className="p-8 flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-200 group-hover:rotate-3 transition-transform">
              <Users size={36} className="drop-shadow-lg" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Dati Qualifica Agente</p>
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{currentUser.name}</h3>
              <div className="flex flex-wrap gap-2.5 mt-3">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-lg border border-slate-200 shadow-sm">
                   Matr. <span className="text-slate-900">{currentUser.matricola}</span>
                </div>
                {balances?.user?.qualifica && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-200 shadow-sm">
                    {balances.user.qualifica}
                  </div>
                )}
                {balances?.user?.ruoloInSquadra && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-200 shadow-sm">
                    {balances.user.ruoloInSquadra}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scheda Turno Oggi Premium */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden group hover:border-emerald-400 transition-all duration-300 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 opacity-40 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:scale-150"></div>
          <div className="p-8 flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-200 group-hover:-rotate-3 transition-transform">
              <Clock size={36} className="drop-shadow-lg" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Servizio di Oggi</p>
              </div>
              {myOds?.shift ? (
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                    {myOds.shift.timeRange || myOds.shift.type}
                  </h3>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      {myOds.shift.serviceCategory?.name || "Operativo"} 
                      {myOds.shift.serviceType && ` · ${myOds.shift.serviceType.name}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-2xl font-black text-slate-400 leading-tight italic tracking-tight">Servizio non assegnato</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Consulta l'agenda per dettagli</p>
                </div>
              )}
            </div>
            {myOds?.shift?.vehicle && (
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2.5 shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                <Car size={16} className="text-emerald-400" />
                {myOds.shift.vehicle.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DAILY ODS WIDGET (Il mio servizio per oggi) */}
      {myOds && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-blue-100/30 overflow-hidden animate-in zoom-in-95 duration-500">
           <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><CheckCircle2 size={24}/></div>
                 <div>
                    <h3 className="font-black text-xl text-slate-900">Il Tuo Ordine di Servizio (Oggi)</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Turno Assegnato: {myOds.shift.timeRange || myOds.shift.type}</p>
                 </div>
              </div>
           </div>
           <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1"><MapPin size={14}/> Servizio / Zona</div>
                 <h4 className="font-black text-slate-800 text-lg leading-tight">
                    {myOds.shift.serviceCategory?.name || "Non specificato"}
                    {myOds.shift.serviceType && <span className="block text-blue-600 text-sm mt-1">{myOds.shift.serviceType.name}</span>}
                 </h4>
                 {myOds.shift.serviceDetails && <p className="text-sm font-medium text-slate-600 italic bg-white p-2 rounded-xl mt-2 border border-slate-200">{myOds.shift.serviceDetails}</p>}
              </div>

              <div className="flex flex-col gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                 <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase text-[10px] tracking-widest mb-1"><Car size={14}/> Auto Assegnata</div>
                 {myOds.shift.vehicle ? (
                   <h4 className="font-black text-emerald-800 text-lg leading-tight">{myOds.shift.vehicle.name}</h4>
                 ) : (
                   <span className="font-bold text-emerald-700/60 text-sm">Nessun veicolo (A piedi o Centrale)</span>
                 )}
              </div>

              <div className="flex flex-col gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                 <div className="flex items-center gap-2 text-amber-600 font-bold uppercase text-[10px] tracking-widest mb-1"><Users size={14}/> Colleghi di Pattuglia</div>
                 {myOds.partners?.length > 0 ? (
                   <div className="space-y-2">
                     {myOds.partners.map((p:any) => (
                       <div key={p.id} className="font-black text-amber-900 bg-white px-3 py-2 border border-amber-200 rounded-xl flex items-center justify-between">
                         {p.user.name} <span className="text-[10px] font-bold text-amber-600">Matr. {p.user.matricola}</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <span className="font-bold text-amber-700/60 text-sm mt-1">Lavori in autonomia</span>
                 )}
              </div>

           </div>
        </div>
      )}

      {/* Calendar Section */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <CalendarDays size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900">Il Mio Calendario</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">Focus {currentMonthName} {currentYear} · {daysInMonth} Giorni</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Toggle */}
            <button 
              onClick={() => setIsMobileView(!isMobileView)}
              className={`p-2.5 rounded-xl transition-all border shadow-sm ${isMobileView ? "bg-blue-600 text-white border-blue-700" : "bg-white text-slate-400 border-slate-200"}`}
              title="Passa a Vista Card (Mobile)"
            >
              <Smartphone size={18} />
            </button>

            <div className="hidden sm:flex bg-slate-100 rounded-lg p-1">
              <Link href={`/?view=agent&month=${prevMonth}&year=${prevYear}`} className="p-2 text-slate-500 hover:text-slate-900 rounded-md transition-all hover:bg-white">
                <ChevronLeft size={16} />
              </Link>
              <div className="px-3 py-1.5 text-sm font-bold text-slate-700 min-w-[130px] text-center uppercase tracking-wider">
                {currentMonthName} {currentYear}
              </div>
              <Link href={`/?view=agent&month=${nextMonth}&year=${nextYear}`} className="p-2 text-slate-500 hover:text-slate-900 rounded-md transition-all hover:bg-white">
                <ChevronRight size={16} />
              </Link>
            </div>

            {/* Legenda compatta */}
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span> Rep
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm ml-2"></span> Turno
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm ml-2"></span> Assenza
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm ml-2"></span> Festivo
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm ml-2"></span> Agenda
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-x-auto custom-scrollbar">
          {!isPublished ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-amber-50 flex items-center justify-center rounded-2xl mb-4 border border-amber-100">
                 <AlertCircle size={32} className="text-amber-500" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Turni In Fase di Elaborazione</h4>
              <p className="text-sm text-slate-500 max-w-sm mt-2">I turni di reperibilità per questo mese non sono ancora stati consolidati e pubblicati dall&apos;Amministratore.</p>
              <PlanningMobileView 
                 agents={[{ ...currentUser, isUfficiale: false } as any]}
                 shifts={shifts}
                 dayInfo={dayInfo}
                 currentYear={currentYear}
                 currentMonth={currentMonth}
                 userRole={userRole}
               />
             </div>
          ) : isMobileView ? (
             <div className="pb-4">
               <PlanningMobileView 
                 agents={[{ ...currentUser, isUfficiale: false } as any]}
                 shifts={shifts}
                 dayInfo={dayInfo}
                 currentYear={currentYear}
                 currentMonth={currentMonth}
                 userRole={userRole}
               />
             </div>
          ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2 w-full">
              {/* Weekday headers */}
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(dn => (
                <div key={dn} className={`text-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-2 ${dn === "Sab" || dn === "Dom" ? "text-red-400" : "text-slate-400"}`}>
                  <span className="sm:hidden">{dn.charAt(0)}</span>
                  <span className="hidden sm:inline">{dn}</span>
                </div>
              ))}

              {/* Empty cells for offset */}
              {(() => {
                const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
                // Convert Sun=0 to Mon-based: Mon=0, Tue=1, ... Sun=6
                const offset = firstDay === 0 ? 6 : firstDay - 1
                return Array.from({ length: offset }, (_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-20"></div>
                ))
              })()}

              {/* Day cells */}
              {dayInfo.map(di => {
                const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                const sObj = myShifts.find(s => new Date(s.date).toISOString() === targetDate)
                const sType = (sObj?.type || "").toUpperCase()
                const rType = (sObj?.repType || "").toUpperCase()
                const dayAgendaItems = di.isNextMonth ? [] : agendaEntries.filter(e => new Date(e.date).getUTCDate() === di.day)

                const isRep = rType.includes("REP")
                const FERIE_ALL = ["F", "FERIE", "FERIE_AP", "FEST_SOP", "104", "MOT_PERS", "ELETT", "CONG_PAT", "CONG_PAR"]
                const isFerie = FERIE_ALL.includes(sType) || sType.startsWith("F")
                const _isMalattia = isMalattia(sType)
                const isToday = !di.isNextMonth && new Date().getDate() === di.day && new Date().getMonth() === currentMonth - 1 && new Date().getFullYear() === currentYear

                let cellBg = "bg-white hover:bg-slate-50"
                let borderStyle = "border border-slate-100"
                let dayNumClass = "text-slate-800"
                let badgeEl = null

                if (isRep) {
                  cellBg = "bg-emerald-50 hover:bg-emerald-100"
                  borderStyle = "border-2 border-emerald-400"
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-black tracking-widest bg-emerald-600 text-white rounded shadow-sm">REP</span>
                } else if (isFerie) {
                  cellBg = "bg-amber-50 hover:bg-amber-100"
                  borderStyle = "border border-amber-200"
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-amber-500 text-white rounded truncate max-w-[90%]">{sType}</span>
                } else if (_isMalattia) {
                  cellBg = "bg-blue-50 hover:bg-blue-100"
                  borderStyle = "border border-blue-200"
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-blue-500 text-white rounded truncate max-w-[90%]">{sType}</span>
                } else if (sType) {
                  badgeEl = <span className="inline-block mt-0.5 sm:mt-1 px-1 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-slate-200 text-slate-600 rounded truncate max-w-[90%]">{sType}</span>
                }

                if (di.isWeekend && !isRep) {
                  cellBg = "bg-red-50/40 hover:bg-red-50"
                  dayNumClass = "text-red-500"
                }

                if (isToday) {
                  borderStyle = isRep ? borderStyle : "border-2 border-blue-500"
                }

                return (
                  <div 
                    key={di.isNextMonth ? 'next-1' : di.day} 
                    className={`relative rounded-lg sm:rounded-xl p-1 sm:p-2 h-16 sm:h-20 flex flex-col items-center justify-start transition-all overflow-hidden ${di.isNextMonth ? "bg-slate-100 opacity-40 grayscale cursor-not-allowed" : `cursor-pointer ${cellBg} ${borderStyle}`}`}
                    onClick={() => { 
                      if (di.isNextMonth) return
                      setAgendaDate(String(di.day))
                      setShowAgenda(true) 
                    }}
                  >
                    {isToday && !di.isNextMonth && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    {dayAgendaItems.length > 0 && !di.isNextMonth && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-purple-500 rounded-full" title={`${dayAgendaItems.length} voce/i agenda`}></div>
                    )}
                    <span className={`text-sm font-black ${di.isNextMonth ? "text-slate-300" : dayNumClass}`}>{di.day}{di.isNextMonth ? '*' : ''}</span>
                    <span className={`text-[8px] uppercase font-bold tracking-widest ${di.isNextMonth ? "text-slate-300" : (di.isWeekend ? "text-red-400" : "text-slate-400")}`}>{di.name}</span>
                    {badgeEl}
                    {isRep && sType && !di.isNextMonth && (
                      <span className="text-[7px] font-bold text-emerald-700 mt-0.5">base: {sType}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* === IL MIO BILANCIO (PREMIUM REDESIGN) === */}
      <div className="space-y-8 relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
               <BookOpen className="text-white" size={24} />
            </div> 
            Il Mio Bilancio
          </h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
             Anno {currentYear} · Contatori Attivi
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-12">
          {AGENDA_CATEGORIES.map((cat: any) => {
            const catDetails = (balances?.details || []).filter((d: any) => 
              cat.items.some((i: any) => i.code === d.code) && d.initialValue > 0
            );

            if (catDetails.length === 0) return null;

            const colors = CAT_COLORS[cat.color] || CAT_COLORS.blue;

            return (
              <div key={cat.group} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-4 group">
                   <div className={`p-3 rounded-2xl ${colors.bg} ${colors.text} shadow-sm group-hover:scale-110 transition-transform duration-300 border ${colors.border}`}>
                      <span className="text-2xl">{cat.emoji}</span>
                   </div>
                   <div>
                      <h3 className={`text-base font-black uppercase tracking-wider ${colors.text}`}>{cat.group}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{catDetails.length} {catDetails.length === 1 ? 'voce attiva' : 'voci attive'}</p>
                   </div>
                   <div className="h-px flex-1 bg-slate-200 group-hover:bg-slate-300 transition-colors"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {catDetails.map((d: any) => {
                    const pct = Math.min(100, (d.used / d.initialValue) * 100);
                    const unitLabel = d.unit === "HOURS" ? "Ore" : "Giorni";
                    const unitShort = d.unit === "HOURS" ? "H" : "G";
                    
                    return (
                      <div 
                        key={d.code} 
                        className="group relative bg-white rounded-[2rem] border border-slate-200 p-6 pt-7 shadow-sm hover:shadow-2xl transition-all duration-300 hover:border-indigo-400 hover:-translate-y-1 overflow-hidden"
                      >
                        {/* Decorative background blob */}
                        <div className={`absolute top-0 right-0 w-24 h-24 ${colors.bg} opacity-30 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover:scale-150`}></div>
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="flex-1 min-w-0 pr-4">
                             <div className="flex items-center gap-2 mb-1.5 ">
                                <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono">{d.code}</span>
                                <div className={`w-1 h-1 rounded-full ${colors.dot}`}></div>
                                <span className={`px-2 py-0.5 ${colors.bg} ${colors.text} text-[8px] font-black rounded-md border ${colors.border} uppercase`}>
                                   {unitShort}
                                </span>
                             </div>
                             <h4 className="font-extrabold text-slate-800 text-sm leading-[1.3] group-hover:text-indigo-900 transition-colors h-10 line-clamp-2">{d.label}</h4>
                          </div>
                        </div>

                        <div className="mt-auto relative z-10">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[.15em]">Utilizzo</span>
                            <span className="text-sm font-black text-slate-800">
                              {d.used} <span className="text-[10px] text-slate-300 font-bold">/ {d.initialValue}</span>
                            </span>
                          </div>
                          
                          {/* Modern Slim Progress Bar */}
                          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                            <div 
                              className={`h-full rounded-full ${paramsToColor(cat.color)} transition-all duration-1000 ease-out shadow-sm`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <p className="text-[9px] text-right mt-1.5 font-bold text-slate-400 uppercase tracking-widest">{Math.round(pct)}% Consumato</p>
                        </div>

                        <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center relative z-10">
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Residuo Netto</span>
                          </div>
                          <div className={`flex items-baseline gap-1 ${d.residue > 0 ? (pct > 90 ? 'text-rose-600' : colors.text) : 'text-slate-300'}`}>
                            <span className="text-2xl font-black tracking-tight">{d.residue}</span>
                            <span className="text-[10px] font-black uppercase opacity-60">{unitLabel}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riepilogo Reperibilità Mensile + Richiesta Assenze */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Riepilogo REP del mese */}
        <div className="lg:col-span-3 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-2xl">
              <ListChecks size={24} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900">Riepilogo Reperibilità</h3>
              <p className="text-xs text-slate-500 font-medium">{currentMonthName} {currentYear} — {repCount} {repCount === 1 ? 'turno' : 'turni'} assegnati</p>
            </div>
          </div>

          <div className="p-6">
            {!isPublished ? (
              <p className="text-sm text-slate-400 italic text-center py-6">I turni non sono ancora stati pubblicati.</p>
            ) : repDays.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500">Nessuna reperibilità assegnata per questo mese.</p>
                <p className="text-xs text-slate-400 mt-1">Controlla i mesi successivi per le prossime assegnazioni.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {repDays.map((rd, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3 transition-colors">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm">
                      <span className="text-sm font-black leading-none">{rd.day}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest opacity-80">{rd.dayName}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">
                        Reperibilità <span className="text-emerald-600">{rd.repType}</span>
                      </p>
                      {rd.baseType && (
                        <p className="text-[11px] text-slate-500">Turno Base: <span className="font-semibold">{rd.baseType}</span></p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                       <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShiftForSwap(rd.shiftObj);
                          setShowSwapModal(true);
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1.5 group"
                      >
                        <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                        Scambia
                      </button>
                    </div>
                  </div>
                ))}

                {/* Totale */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Totale Reperibilità Mese</span>
                  <span className="text-lg font-black text-emerald-700">{repCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Modulo Richieste + Prossimo Turno */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* PULSANTE RAPIDO RICHIESTE SEGRETERIA */}
          <button 
             onClick={() => setShowAbsenceModal(true)}
             className="relative bg-gradient-to-r from-amber-500 to-orange-500 rounded-[2rem] p-8 overflow-hidden shadow-xl shadow-amber-200 hover:shadow-2xl hover:-translate-y-1 transition-all group text-left w-full border-none"
          >
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition-all"></div>
             <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white mb-1 drop-shadow-md">Richiesta Congedi/Assenze</h3>
                  <p className="text-sm font-bold text-amber-50 drop-shadow-sm opacity-90 tracking-wide">Ferie, Permessi 104, Malattia e Recuperi</p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl group-hover:scale-110 transition-transform">
                  <CalendarDays size={28} className="text-white drop-shadow-md" />
                </div>
             </div>
          </button>

          {/* PROSSIMO TURNO REP (dinamico!) */}
          {(() => {
            const today = new Date()
            today.setHours(0,0,0,0)
            let nextRepDate: Date | null = null
            let nextRepType = ""

            // Cerca la prossima REP tra TUTTE le shifts dell'utente
            const allMyReps = shifts
              .filter(s => s.userId === currentUser.id && s.repType?.toUpperCase().includes("REP"))
              .map(s => ({ date: new Date(s.date), repType: s.repType || "REP" }))
              .sort((a, b) => a.date.getTime() - b.date.getTime())

            for (const r of allMyReps) {
              const rd = new Date(r.date)
              rd.setHours(0,0,0,0)
              if (rd >= today) {
                nextRepDate = rd
                nextRepType = r.repType
                break
              }
            }

            if (nextRepDate) {
              const diffMs = nextRepDate.getTime() - today.getTime()
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
              const nDay = nextRepDate.getDate()
              const nMonthName = monthNames[nextRepDate.getMonth()]

              return (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col items-center text-center shadow-lg">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="text-emerald-600" size={28} />
                  </div>
                  <h4 className="font-black text-lg text-slate-900 mb-1">Prossima Reperibilità</h4>
                  <p className="text-slate-400 text-xs font-medium mb-4">{nextRepType}</p>
                  <div className="text-4xl font-black text-emerald-700">{nDay} {nMonthName}</div>
                  <p className="text-sm font-bold text-slate-500 mt-2">
                    {diffDays === 0 ? (
                      <span className="text-red-600 animate-pulse">🔴 OGGI!</span>
                    ) : diffDays === 1 ? (
                      <span className="text-amber-600">⚠️ Domani</span>
                    ) : (
                      <>tra <span className="text-emerald-600">{diffDays}</span> giorni</>
                    )}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-100 w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orario: 22:00 – 07:00</div>
                </div>
              )
            } else {
              return (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 flex flex-col items-center text-center shadow-lg">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <Clock className="text-blue-600" size={28} />
                  </div>
                  <h4 className="font-black text-lg text-slate-900 mb-1">Prossima Reperibilità</h4>
                  <p className="text-sm text-slate-400 font-medium mt-2">Nessuna reperibilità futura programmata.</p>
                </div>
              )
            }
          })()}

          {/* Agenda Personale — Premium Card */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-900/90 to-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/15 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                  <BookOpen size={24} className="text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Agenda Personale</h3>
                  <p className="text-purple-300/80 text-[10px] font-bold uppercase tracking-widest">{currentMonthName} {currentYear}</p>
                </div>
              </div>

              {/* Live Mini Stats */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                  <span className="text-2xl font-black block">{agendaEntries.length}</span>
                  <span className="text-[8px] uppercase tracking-widest text-purple-300/70 font-bold">Voci</span>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                  <span className="text-2xl font-black block">{agendaEntries.filter(e => e.hours).reduce((a, e) => a + (e.hours || 0), 0)}</span>
                  <span className="text-[8px] uppercase tracking-widest text-purple-300/70 font-bold">Ore</span>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
                  <span className="text-2xl font-black block">{new Set(agendaEntries.map(e => new Date(e.date).getUTCDate())).size}</span>
                  <span className="text-[8px] uppercase tracking-widest text-purple-300/70 font-bold">Giorni</span>
                </div>
              </div>
              
              {/* Category mini-legend */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {AGENDA_CATEGORIES.map(cat => {
                  const count = agendaEntries.filter(e => cat.items.some(i => i.code === e.code)).length
                  if (count === 0) return null
                  return (
                    <span key={cat.group} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-[9px] font-bold text-white/80">
                      <span>{cat.emoji}</span> {count}
                    </span>
                  )
                })}
              </div>

              <button 
                onClick={() => setShowAgenda(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-purple-900/50 active:scale-[0.97]"
              >
                <Plus size={18} />
                Gestisci Agenda
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bacheca Scambio Turni */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-6 text-white flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30">
            <RefreshCw size={24} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Bacheca Scambi</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Gestisci le tue proposte di scambio</p>
          </div>
        </div>

        <div className="p-6">
          {swapRequests.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 text-sm font-medium italic">Nessuna proposta di scambio attiva.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {swapRequests.map((req) => {
                const isIncoming = req.targetUserId === currentUser.id
                const dateStr = new Date(req.shift.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
                
                return (
                  <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border-2 transition-all ${isIncoming ? 'bg-indigo-50 border-indigo-100 hover:border-indigo-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${isIncoming ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-500/10 text-slate-600'}`}>
                        {isIncoming ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${isIncoming ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'}`}>
                            {isIncoming ? 'Ricevuta' : 'Inviata'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{dateStr}</span>
                        </div>
                        <h4 className="font-black text-slate-900">
                          {isIncoming ? `Scambio da ${req.requester.name}` : `Proposta a ${req.targetUser.name}`}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">Turno: <span className="font-bold text-blue-600">{req.shift.repType}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === 'PENDING' ? (
                        isIncoming ? (
                          <>
                            <button 
                              disabled={swapLoading}
                              onClick={() => handleRespondSwap(req.id, "REJECTED")}
                              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Rifiuta
                            </button>
                            <button 
                              disabled={swapLoading}
                              onClick={() => handleRespondSwap(req.id, "ACCEPTED")}
                              className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs font-black rounded-xl hover:from-indigo-600 hover:to-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:scale-[1.05] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              {swapLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                              Accetta
                            </button>
                          </>
                        ) : (
                          <span className="px-4 py-2 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-xl">In attesa...</span>
                        )
                      ) : (
                        <span className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl ${
                          req.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                          req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {req.status === 'ACCEPTED' ? 'Accettata (In attesa Admin)' : 
                           req.status === 'REJECTED' ? 'Rifiutata' : 
                           'Approvata Admin'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Scambio */}
      {showSwapModal && selectedShiftForSwap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSwapModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/20 rounded-2xl border border-white/20">
                  <RefreshCw size={24} />
                </div>
                <button onClick={() => setShowSwapModal(false)} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <h3 className="text-2xl font-black tracking-tight">Proponi Scambio</h3>
              <p className="text-blue-100 text-sm mt-2 opacity-80">
                Data: <b>{new Date(selectedShiftForSwap.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleziona il collega</label>
                <div className="relative">
                  <select 
                    value={targetColleagueId}
                    onChange={(e) => setTargetColleagueId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer hover:bg-white transition-all shadow-sm"
                  >
                    <option value="">Scegli un collega...</option>
                    {allAgents.filter(a => a.id !== currentUser.id).map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name} (Matr. {agent.matricola})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={18} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest text-center leading-relaxed">
                  ⚠️ Una volta inviata, il collega dovrà accettare la proposta. Successivamente l'Admin darà l'OK finale per aggiornare la griglia.
                </p>
              </div>

              <button 
                disabled={!targetColleagueId || swapLoading}
                onClick={handleRequestSwap}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {swapLoading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                Invia Proposta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Link Widget */}
      <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl mb-8">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-4 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <Send size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black">Notifiche Telegram Hub</h3>
              <p className="text-blue-100/80 text-sm font-medium mt-1">
                {balances?.user?.telegramChatId 
                  ? "✅ Il tuo account è collegato correttamente. Riceverai qui le allerte del Comando."
                  : "Collega il tuo account Telegram per ricevere le allerte di emergenza dal Comando direttamente sul tuo telefono."
                }
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 min-w-[260px]">
            {balances?.user?.telegramChatId ? (
              <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 rounded-2xl px-6 py-4 flex items-center gap-3 text-emerald-100 font-black text-sm">
                <CheckCircle2 size={20} className="text-emerald-400" />
                CONNESSO
              </div>
            ) : telegramCode ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center w-full shadow-2xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/70 mb-2">Codice (Scade tra 15 min)</p>
                <p className="text-3xl font-black tracking-[.3em] text-white my-1">{telegramCode}</p>
                <div className="mt-4 flex flex-col gap-2">
                   <a
                    href="https://t.me/Reperibilita_Altamura_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-transform"
                  >
                    🚀 Vai al Bot
                  </a>
                  <p className="text-[10px] text-blue-200/60 font-bold uppercase">Invia il comando: <code>/link {telegramCode}</code></p>
                </div>
              </div>
            ) : (
              <button
                disabled={telegramLoading}
                onClick={async () => {
                  setTelegramLoading(true)
                  try {
                    const res = await fetch('/api/telegram/link-code', { method: 'POST' })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error)
                    setTelegramCode(data.code)
                    toast.success('Codice generato! Invia /link seguito dal codice al Bot.')
                  } catch (err: any) {
                    toast.error(err.message || 'Errore nella generazione del codice.')
                  } finally {
                    setTelegramLoading(false)
                  }
                }}
                className="w-full flex items-center justify-center gap-3 bg-white text-blue-700 px-6 py-4 rounded-xl font-black text-sm shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-50"
              >
                <Smartphone size={20} />
                {telegramLoading ? 'Generazione...' : 'Inizia Sincronizzazione'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-slate-100 mt-4">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          Comando di Polizia Locale di Altamura · Sistema Reperibilità v1.0
        </p>
      </footer>

      {/* === MODALE SINCRONIZZAZIONE CALENDARIO === */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSyncModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">Sincronizza Calendario</h3>
                <p className="text-blue-200 text-xs mt-0.5">Scegli il tuo dispositivo per importare tutte le reperibilità</p>
              </div>
              <button onClick={() => setShowSyncModal(false)} className="text-white/70 hover:text-white p-1"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">

              {/* iPhone / iPad */}
              <button
                onClick={() => {
                  window.location.href = `webcal://${window.location.host}/api/calendar/${currentUser.id}`
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
              >
                <div className="p-3 bg-slate-100 rounded-xl shrink-0"><Smartphone size={24} className="text-slate-700" /></div>
                <div>
                  <p className="font-bold text-sm text-slate-800">iPhone / iPad / Mac</p>
                  <p className="text-xs text-slate-500">Abbonamento automatico. Le reperibilità appariranno nel tuo Calendario Apple e si aggiorneranno in automatico.</p>
                </div>
              </button>

              {/* Windows / Outlook */}
              <button
                onClick={() => {
                  window.location.href = `webcal://${window.location.host}/api/calendar/${currentUser.id}`
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left"
              >
                <div className="p-3 bg-slate-100 rounded-xl shrink-0"><Monitor size={24} className="text-slate-700" /></div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Windows / Outlook</p>
                  <p className="text-xs text-slate-500">Abbonamento a calendario Internet. Outlook importerà tutti gli eventi e li terrà aggiornati.</p>
                </div>
              </button>

              {/* Google Calendar */}
              <button
                onClick={() => {
                  const calUrl = `${window.location.protocol}//${window.location.host}/api/calendar/${currentUser.id}`
                  const gcalUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calUrl)}`
                  window.open(gcalUrl, '_blank')
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
              >
                <div className="p-3 bg-slate-100 rounded-xl shrink-0"><Globe size={24} className="text-slate-700" /></div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Google Calendar</p>
                  <p className="text-xs text-slate-500">Apre Google Calendar e aggiunge l&apos;abbonamento. Tutti gli eventi REP appariranno automaticamente.</p>
                </div>
              </button>

              {/* Scarica File */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    window.location.href = `/api/calendar/${currentUser.id}`
                    setShowSyncModal(false)
                  }}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 py-2 transition-colors"
                >
                  <FileDown size={14} />
                  Scarica file .ics manualmente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* === MODALE AGENDA PERSONALE — PREMIUM === */}
      {showAgenda && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowAgenda(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}
            style={{ animation: 'fadeInUp 0.3s ease-out' }}
          >
            {/* Header Gradient */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl">
                    <BookOpen size={28} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Agenda Personale</h2>
                    <p className="text-white/70 text-xs font-semibold mt-0.5">{currentMonthName} {currentYear} · {currentUser.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Quick Stats in header */}
                  <div className="hidden md:flex items-center gap-4 mr-4">
                    <div className="text-center">
                      <span className="text-2xl font-black block leading-none">{agendaEntries.length}</span>
                      <span className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Voci</span>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="text-center">
                      <span className="text-2xl font-black block leading-none">{agendaEntries.filter(e => e.hours).reduce((a, e) => a + (e.hours || 0), 0)}</span>
                      <span className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Ore Tot.</span>
                    </div>
                  </div>
                  <button onClick={() => setShowAgenda(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body — two columns */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* Left: Form */}
              <div className="w-full md:w-[380px] bg-slate-50 border-r border-slate-100 p-5 overflow-y-auto custom-scrollbar flex-shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">✏️ Nuovo Appunto</p>

                <div className="space-y-3">
                  {/* Date Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">📅 Giorno</label>
                    <select 
                      value={agendaDate} 
                      onChange={e => setAgendaDate(e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors"
                    >
                      <option value="">Seleziona giorno...</option>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d} {currentMonthName} {currentYear}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">🔍 Cerca Tipo</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Ferie, 104, straord..."
                        value={agendaSearch}
                        onChange={e => setAgendaSearch(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Category List — compact and colorful */}
                  <div className="max-h-52 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar border-2 border-slate-100 rounded-xl p-3 bg-white">
                    {AGENDA_CATEGORIES.map(cat => {
                      const filteredItems = cat.items.filter(i => 
                        i.label.toLowerCase().includes(agendaSearch.toLowerCase()) || 
                        i.code.includes(agendaSearch)
                      )
                      if (filteredItems.length === 0) return null
                      const colors = CAT_COLORS[cat.color] || CAT_COLORS.blue
                      return (
                        <div key={cat.group}>
                          <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${colors.text}`}>
                            <span className="text-sm">{cat.emoji}</span> {cat.group}
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {filteredItems.map(item => (
                              <button
                                key={item.code}
                                onClick={() => setAgendaCode(item.code)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 ${
                                  agendaCode === item.code 
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-[1.01]' 
                                    : `${colors.bg} ${colors.text} border ${colors.border} hover:shadow-sm`
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agendaCode === item.code ? 'bg-white' : colors.dot}`}></span>
                                <span className="truncate">{item.label}</span>
                                <span className={`ml-auto text-[9px] shrink-0 ${agendaCode === item.code ? 'text-white/60' : 'opacity-40'}`}>{item.code}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Hours + Note row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">⏱ Ore</label>
                      <input 
                        type="number" step="0.5" min="0" max="24" placeholder="0"
                        value={agendaHours} onChange={e => setAgendaHours(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">📝 Note</label>
                      <input
                        type="text"
                        placeholder="Opzionale..."
                        value={agendaNote} onChange={e => setAgendaNote(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveAgenda}
                    disabled={!agendaDate || !agendaCode || agendaSaving}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-black text-sm transition-all shadow-lg shadow-purple-200 active:scale-[0.97] flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    {agendaSaving ? 'Salvataggio...' : 'Aggiungi all\'Agenda'}
                  </button>
                </div>
              </div>

              {/* Right: Entries List */}
              <div className="flex-1 p-5 flex flex-col bg-white overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">I Tuoi Appunti</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{agendaEntries.length} {agendaEntries.length === 1 ? 'voce' : 'voci'} registrate</p>
                  </div>
                  {/* Category filter chips */}
                  <div className="hidden lg:flex flex-wrap gap-1">
                    {AGENDA_CATEGORIES.map(cat => {
                      const count = agendaEntries.filter(e => cat.items.some(i => i.code === e.code)).length
                      if (count === 0) return null
                      return (
                        <span key={cat.group} className="text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{cat.emoji} {count}</span>
                      )
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {agendaEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2rem] flex items-center justify-center mb-5 text-4xl">
                        📋
                      </div>
                      <p className="text-slate-700 text-base font-black">Nessun appunto ancora</p>
                      <p className="text-slate-400 text-xs mt-1.5 max-w-xs">Usa il form a sinistra per aggiungere ferie, permessi, straordinari e altro alla tua agenda personale.</p>
                    </div>
                  ) : (
                    agendaEntries.map(entry => {
                      const cat = getCategoryForCode(entry.code)
                      const colors = cat ? (CAT_COLORS[cat.color] || CAT_COLORS.blue) : CAT_COLORS.blue
                      const emoji = cat?.emoji || '📌'
                      return (
                        <div key={entry.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 ${colors.border} ${colors.bg} transition-all hover:shadow-md group`}>
                          {/* Day badge */}
                          <div className="w-11 h-11 bg-white rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm border border-slate-100">
                            <span className="text-base font-black text-slate-800 leading-none">{new Date(entry.date).getUTCDate()}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">{['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][new Date(entry.date).getUTCDay()]}</span>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm">{emoji}</span>
                              <span className={`text-sm font-bold ${colors.text}`}>{entry.label}</span>
                              {entry.hours != null && entry.hours > 0 && (
                                <span className="text-[10px] bg-white/80 text-slate-600 rounded-full px-2 py-0.5 font-bold border border-slate-100">{entry.hours}h</span>
                              )}
                            </div>
                            {entry.note && <p className="text-[11px] text-slate-500 mt-0.5 truncate italic">&ldquo;{entry.note}&rdquo;</p>}
                          </div>
                          {/* Delete */}
                          <button 
                            onClick={() => handleDeleteAgenda(entry.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Elimina"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
                
                {/* Bottom stats */}
                {agendaEntries.length > 0 && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest">Totale</p>
                        <p className="text-lg font-black text-purple-700">{agendaEntries.length} <span className="text-xs font-bold text-purple-400">voci</span></p>
                      </div>
                      {agendaEntries.filter(e => e.hours).length > 0 && (
                        <>
                          <div className="w-px h-8 bg-purple-200"></div>
                          <div>
                            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Ore</p>
                            <p className="text-lg font-black text-indigo-700">{agendaEntries.filter(e => e.hours).reduce((a, e) => a + (e.hours || 0), 0)}<span className="text-xs font-bold text-indigo-400">h</span></p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {AGENDA_CATEGORIES.map(cat => {
                        const count = agendaEntries.filter(e => cat.items.some(i => i.code === e.code)).length
                        if (count === 0) return null
                        const colors = CAT_COLORS[cat.color] || CAT_COLORS.blue
                        return <span key={cat.group} className={`w-3 h-3 rounded-full ${colors.dot}`} title={`${cat.group}: ${count}`}></span>
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Richiesta Assenze */}
      {showAbsenceModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAbsenceModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 sm:p-8 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl border border-white/20 shadow-inner">
                  <CalendarDays size={24} />
                </div>
                <button onClick={() => setShowAbsenceModal(false)} className="text-white/80 hover:text-white transition-colors bg-black/10 rounded-full p-1">
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-2xl font-black tracking-tight mt-4 relative z-10">Inoltra Richiesta</h3>
              <p className="text-amber-50 text-sm mt-1 opacity-90 relative z-10 font-medium">
                Le richieste inserite qui verranno notificate al Comando Centrale per l'approvazione automatica.
              </p>
            </div>

            <div className="p-6 sm:p-8 bg-slate-50">
               {balances && (
                 <div className="mb-6 grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Ferie</p>
                      <p className="text-xl font-black text-slate-800">{balances.ferieResidue}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">di {balances.ferieTotali}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] font-black uppercase text-blue-500 tracking-wider">L. 104</p>
                      <p className="text-xl font-black text-slate-800">{balances.permessi104Residui}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">di {balances.permessi104Totali}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm">
                      <p className="text-[9px] font-black uppercase text-teal-500 tracking-wider">Festività</p>
                      <p className="text-xl font-black text-slate-800">{balances.festivitaResidue}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">di {balances.festivitaTotali}</p>
                    </div>
                 </div>
               )}
               <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Inizio</label>
                    <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data Fine <span className="text-slate-300 normal-case">(opzionale, se periodo)</span></label>
                    <input type="date" value={reqEndDate} onChange={e => setReqEndDate(e.target.value)} min={reqDate} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleziona Causale</label>
                    <div className="relative">
                      <select value={reqCode} onChange={e => setReqCode(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none appearance-none pr-10">
                        <option value="">Seleziona tipo di assenza...</option>
                        {AGENDA_CATEGORIES.map(cat => (
                           <optgroup key={cat.group} label={cat.group}>
                              {cat.items.map(item => (
                                 <option key={item.code} value={item.code}>{cat.emoji} {item.label} ({item.code})</option>
                              ))}
                           </optgroup>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Toggle Richiesta Oraria */}
                  <div className="flex items-center gap-2 px-1">
                    <input 
                      type="checkbox" 
                      id="hourlyReqToggle" 
                      checked={isHourlyRequest} 
                      onChange={(e) => setIsHourlyRequest(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 border-slate-300"
                    />
                    <label htmlFor="hourlyReqToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
                      Richiesta a ore (Permesso orario)
                    </label>
                  </div>

                  {isHourlyRequest && (
                    <div className="grid grid-cols-3 gap-2 bg-amber-50 border border-amber-100 p-3 rounded-xl animate-in slide-in-from-top-2">
                       <div>
                         <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Inizio</label>
                         <input type="time" value={reqStartTime} onChange={e => setReqStartTime(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none" />
                       </div>
                       <div>
                         <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Fine</label>
                         <input type="time" value={reqEndTime} onChange={e => setReqEndTime(e.target.value)} className="w-full bg-white border border-amber-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none" />
                       </div>
                       <div>
                         <label className="block text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Tot. Ore</label>
                         <input type="number" step="0.5" min="0" max="24" value={reqHours} onChange={e => setReqHours(e.target.value)} placeholder="0" className="w-full bg-white border border-amber-200 rounded-lg px-2 py-2 text-sm font-bold text-slate-800 focus:border-amber-500 outline-none" />
                       </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Note / Messaggio</label>
                    <textarea value={reqNotes} onChange={e => setReqNotes(e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 transition-all outline-none resize-none" placeholder="Motivo o riferimenti..."></textarea>
                  </div>
               </div>

               <div className="mt-8">
                  <button 
                     disabled={reqLoading}
                     onClick={async () => {
                        if (!reqDate || !reqCode) {
                          toast.error("Compila la data e la causale");
                          return;
                        }
                        setReqLoading(true);
                        try {
                           const res = await fetch("/api/requests", {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ 
                               date: reqDate, 
                               endDate: reqEndDate || null, 
                               code: reqCode, 
                               notes: reqNotes,
                               startTime: isHourlyRequest ? reqStartTime : null,
                               endTime: isHourlyRequest ? reqEndTime : null,
                               hours: isHourlyRequest ? reqHours : null
                             })
                           })
                           const data = await res.json()
                           if (!res.ok) throw new Error(data.error || "Errore")
                           toast.success("✅ Richiesta inviata!");
                           setShowAbsenceModal(false);
                           setReqDate(''); setReqEndDate(''); setReqCode(''); setReqNotes('');
                           setReqStartTime(''); setReqEndTime(''); setReqHours(''); setIsHourlyRequest(false);
                        } catch (err: any) {
                           toast.error(err.message)
                        } finally {
                           setReqLoading(false);
                        }
                     }}
                     className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl py-4 font-black text-sm shadow-xl shadow-amber-200 hover:-translate-y-0.5 hover:shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                     <Send size={18} />
                     {reqLoading ? "Invio in corso..." : "Invia Richiesta"}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

