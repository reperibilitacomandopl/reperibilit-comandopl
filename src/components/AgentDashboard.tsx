"use client"

import toast from "react-hot-toast"
import { useState, useEffect, useCallback } from "react"
import { CalendarDays, AlertCircle, FileDown, Clock, ShieldCheck, Plus, ChevronLeft, ChevronRight, ListChecks, X, Smartphone, Monitor, Globe, Trash2, Search, BookOpen, Send, Phone } from "lucide-react"
import { isHoliday } from "@/utils/holidays"
import Link from "next/link"

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
const CAT_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', dot: 'bg-amber-400' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',  dot: 'bg-rose-400' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',  dot: 'bg-blue-400' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   dot: 'bg-red-400' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',  dot: 'bg-teal-400' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200',dot: 'bg-orange-400' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',dot: 'bg-indigo-400' },
}

type AgendaItem = {
  id: string
  date: string
  code: string
  label: string
  hours: number | null
  note: string | null
}

export default function AgentDashboard({ currentUser, shifts, allAgents, currentYear, currentMonth, isPublished }: { currentUser: { id: string, matricola: string, name: string }, shifts: { userId: string, date: Date | string, type: string, repType: string | null }[], allAgents: any[], currentYear: number, currentMonth: number, isPublished: boolean }) {
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
  
  const myShifts = shifts.filter(s => s.userId === currentUser.id)

  // Fetch Duty Team if Officer
  useEffect(() => {
    async function fetchDutyTeam() {
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
    }
    fetchDutyTeam()
  }, [])

  // Fetch agenda entries for current month
  const fetchAgenda = useCallback(async () => {
    try {
      const res = await fetch(`/api/agenda?month=${currentMonth}&year=${currentYear}`)
      if (res.ok) {
        const data = await res.json()
        setAgendaEntries(data)
      }
    } catch { /* silent */ }
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
    return { day: d, name: dayNames[date.getDay()], isWeekend: isFestivo }
  })

  // Collect REP days for this agent
  const repDays: { day: number; dayName: string; repType: string; baseType: string }[] = []
  dayInfo.forEach(di => {
    const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
    const sObj = myShifts.find(s => new Date(s.date).toISOString() === targetDate)
    if (sObj?.repType?.toUpperCase().includes("REP")) {
      repDays.push({
        day: di.day,
        dayName: di.name,
        repType: sObj.repType || "REP",
        baseType: (sObj.type || "").toUpperCase()
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
    doc.text(`Comando Polizia Locale di Altamura`, 14, 30)
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

  return (
    <div className="space-y-8 pb-10">
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

      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-20 -mb-20 blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-200 text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-md">
                Dashboard Agente
              </span>
              <div className="h-1 w-1 rounded-full bg-blue-400"></div>
              <span className="text-blue-300/80 text-xs font-medium">Matr. {currentUser.matricola}</span>
            </div>
            <h2 className="text-4xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Ciao, {currentUser.name.split(' ')[0]}
            </h2>
            <p className="text-blue-200/60 text-sm max-w-md font-medium">
          Consulta i tuoi turni e gestisci le tue disponibilità per {currentMonthName} {currentYear}.
            </p>
            <p className="text-blue-300/40 text-[10px] font-bold uppercase tracking-widest mt-1">Polizia Locale di Altamura</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                <ShieldCheck className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-[10px] text-emerald-300/60 font-black uppercase tracking-wider">Reperibilità</p>
                <p className="text-2xl font-black text-white">{repCount} <span className="text-xs text-white/40 font-bold uppercase">Turni</span></p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowSyncModal(true)}
              className="group flex items-center gap-3 bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <CalendarDays size={20} className="text-blue-600" />
              Sincronizza Calendario
            </button>
          </div>
        </div>
      </div>

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
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
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
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {/* Weekday headers */}
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(dn => (
                <div key={dn} className={`text-center text-[10px] font-black uppercase tracking-widest py-2 ${dn === "Sab" || dn === "Dom" ? "text-red-400" : "text-slate-400"}`}>
                  {dn}
                </div>
              ))}

              {/* Empty cells for offset */}
              {(() => {
                const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
                // Convert Sun=0 to Mon-based: Mon=0, Tue=1, ... Sun=6
                const offset = firstDay === 0 ? 6 : firstDay - 1
                return Array.from({ length: offset }, (_, i) => (
                  <div key={`empty-${i}`} className="h-20"></div>
                ))
              })()}

              {/* Day cells */}
              {dayInfo.map(di => {
                const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
                const sObj = myShifts.find(s => new Date(s.date).toISOString() === targetDate)
                const sType = (sObj?.type || "").toUpperCase()
                const rType = (sObj?.repType || "").toUpperCase()
                const dayAgendaItems = agendaEntries.filter(e => new Date(e.date).getUTCDate() === di.day)

                const isRep = rType.includes("REP")
                const isFerie = sType.startsWith("F") || sType === "104" || sType === "FERIE"
                const isMalattia = sType.startsWith("M")
                const isToday = new Date().getDate() === di.day && new Date().getMonth() === currentMonth - 1 && new Date().getFullYear() === currentYear

                let cellBg = "bg-white hover:bg-slate-50"
                let borderStyle = "border border-slate-100"
                let dayNumClass = "text-slate-800"
                let badgeEl = null

                if (isRep) {
                  cellBg = "bg-emerald-50 hover:bg-emerald-100"
                  borderStyle = "border-2 border-emerald-400"
                  badgeEl = <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black tracking-widest bg-emerald-600 text-white rounded-md shadow-sm">REP</span>
                } else if (isFerie) {
                  cellBg = "bg-amber-50 hover:bg-amber-100"
                  borderStyle = "border border-amber-200"
                  badgeEl = <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-amber-500 text-white rounded-md">{sType}</span>
                } else if (isMalattia) {
                  cellBg = "bg-blue-50 hover:bg-blue-100"
                  borderStyle = "border border-blue-200"
                  badgeEl = <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-blue-500 text-white rounded-md">{sType}</span>
                } else if (sType) {
                  badgeEl = <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-slate-200 text-slate-600 rounded-md">{sType}</span>
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
                    key={di.day} 
                    className={`relative rounded-xl p-2 h-20 flex flex-col items-center justify-start transition-all cursor-pointer ${cellBg} ${borderStyle}`}
                    onClick={() => { setAgendaDate(String(di.day)); setShowAgenda(true) }}
                  >
                    {isToday && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    {dayAgendaItems.length > 0 && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-purple-500 rounded-full" title={`${dayAgendaItems.length} voce/i agenda`}></div>
                    )}
                    <span className={`text-sm font-black ${dayNumClass}`}>{di.day}</span>
                    <span className={`text-[8px] uppercase font-bold tracking-widest ${di.isWeekend ? "text-red-400" : "text-slate-400"}`}>{di.name}</span>
                    {badgeEl}
                    {isRep && sType && (
                      <span className="text-[7px] font-bold text-emerald-700 mt-0.5">base: {sType}</span>
                    )}
                  </div>
                )
              })}
              </div>
          )}
        </div>
      </div>

      {/* === LE MIE STATISTICHE === */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-2xl">
            <Clock size={24} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg text-slate-900">Le Mie Statistiche</h3>
            <p className="text-xs text-slate-500 font-medium">Riepilogo {currentMonthName} {currentYear} — Calcolato dalla tua Agenda Personale</p>
          </div>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md group"
          >
            <FileDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
            Esporta PDF
          </button>
        </div>

        <div className="p-6">
          {(() => {
            // Straordinario codes
            const straCodes = ['2000','2050','2001','2002','2003','2020','2021','2022','2023','2026','10001','10002','10003']
            // Ferie codes
            const ferieCodes = ['0015','0016','0010']
            // Recupero codes
            const recCodes = ['0009','0067','0008','0081','0036','0037']

            const straEntries = agendaEntries.filter(e => straCodes.includes(e.code))
            const ferieEntries = agendaEntries.filter(e => ferieCodes.includes(e.code))
            const recEntries = agendaEntries.filter(e => recCodes.includes(e.code))

            const straHours = straEntries.reduce((sum, e) => sum + (e.hours || 0), 0)
            const ferieDays = new Set(ferieEntries.map(e => new Date(e.date).getUTCDate())).size
            const recHours = recEntries.reduce((sum, e) => sum + (e.hours || 0), 0)

            const stats = [
              {
                label: 'Straordinario',
                value: straHours,
                unit: 'ore',
                count: straEntries.length,
                icon: '⏰',
                gradient: 'from-orange-500 to-amber-500',
                bgLight: 'bg-orange-50',
                textColor: 'text-orange-700',
                borderColor: 'border-orange-200',
                barColor: 'bg-orange-500',
                maxVal: 30, // reference max: 30h
              },
              {
                label: 'Ferie',
                value: ferieDays,
                unit: 'giorni',
                count: ferieEntries.length,
                icon: '🏖️',
                gradient: 'from-amber-500 to-yellow-400',
                bgLight: 'bg-amber-50',
                textColor: 'text-amber-700',
                borderColor: 'border-amber-200',
                barColor: 'bg-amber-500',
                maxVal: 26, // reference: 26 days/year
              },
              {
                label: 'Recupero Ore',
                value: recHours,
                unit: 'ore',
                count: recEntries.length,
                icon: '🔄',
                gradient: 'from-teal-500 to-emerald-400',
                bgLight: 'bg-teal-50',
                textColor: 'text-teal-700',
                borderColor: 'border-teal-200',
                barColor: 'bg-teal-500',
                maxVal: 20, // reference max
              },
            ]

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {stats.map((st, idx) => {
                  const pct = Math.min(100, st.maxVal > 0 ? ((st.value / st.maxVal) * 100) : 0)
                  
                  return (
                    <div key={idx} className={`${st.bgLight} border ${st.borderColor} rounded-2xl p-5 flex flex-col items-center text-center transition-all hover:shadow-md hover:scale-[1.02]`}>
                      <div className="text-3xl mb-2">{st.icon}</div>
                      <h4 className={`text-xs font-black uppercase tracking-widest ${st.textColor} mb-3`}>{st.label}</h4>
                      
                      {/* Circular Progress */}
                      <div className="relative w-24 h-24 mb-3">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200" />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className={st.textColor}
                            stroke="currentColor"
                            strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-black ${st.textColor}`}>{st.value}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{st.unit}</span>
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {st.count} {st.count === 1 ? 'voce' : 'voci'} registrate
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {agendaEntries.length === 0 && (
            <div className="text-center py-4 mt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 italic">Nessun dato nell&apos;agenda. Inserisci le tue ore nell&apos;Agenda Personale per vedere le statistiche.</p>
            </div>
          )}
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
                    <div className="shrink-0">
                      <span className="inline-block px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm">
                        REP
                      </span>
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

        {/* Richiesta Assenze + Prossimo Turno */}
        {/* Right column: Prossimo Turno + Agenda */}
        <div className="lg:col-span-2 flex flex-col gap-6">

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

      {/* Telegram Link Widget */}
      <div className="bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="p-4 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <Send size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black">Notifiche Telegram</h3>
              <p className="text-blue-100/80 text-sm font-medium mt-1">
                Collega il tuo account Telegram per ricevere le allerte di emergenza dal Comando direttamente sul telefono.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 min-w-[260px]">
            {telegramCode ? (
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-center w-full">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/70 mb-2">Il tuo codice (valido 15 min)</p>
                <p className="text-3xl font-black tracking-[.3em] text-white">{telegramCode}</p>
                <a
                  href={`https://t.me/Reperibilita_Altamura_bot?start=${telegramCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-transform"
                >
                  <Send size={16} />
                  Apri Telegram
                </a>
              </div>
            ) : (
              <button
                disabled={telegramLoading}
                onClick={async () => {
                  setTelegramLoading(true)
                  try {
                    const res = await fetch('/api/telegram/link', { method: 'POST' })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error)
                    setTelegramCode(data.code)
                    toast.success('Codice generato! Clicca su Apri Telegram.')
                  } catch {
                    toast.error('Errore nella generazione del codice.')
                  } finally {
                    setTelegramLoading(false)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-white text-blue-700 px-6 py-4 rounded-xl font-black text-sm shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                <Send size={18} />
                {telegramLoading ? 'Generazione...' : 'Genera Codice di Collegamento'}
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
    </div>
  )
}

