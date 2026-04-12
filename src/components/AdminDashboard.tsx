"use client"

import toast from "react-hot-toast"
import { useState, useRef, useMemo } from "react"
import { Calendar as CalendarIcon, UploadCloud, Users, Smartphone, ChevronLeft, ChevronRight, Settings, Settings2, FileDown, CheckCircle2, RefreshCw, X, FileEdit, Trash2, Shield, AlertCircle, HelpCircle, EyeOff, Eye, Mail, Play, Plus, ClipboardList, Printer, Hash, Phone, Award, Calendar, FileText, MapPin, Briefcase, Save, Filter, Wand2 } from "lucide-react"
import SettingsPanel from "./SettingsPanel"
import * as XLSX from "xlsx"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { isHoliday } from "../utils/holidays"
import { isMalattia, isMattina, isPomeriggio, isAssenza } from "../utils/shift-logic"
import { AGENDA_CATEGORIES } from "../utils/agenda-codes"
import { generatePlanningPDF } from "../utils/pdf-generator"
import PlanningMobileView from "./PlanningMobileView"

type EditingCell = { agentId: string; agentName: string; day: number; currentType: string; warningMsg?: string } | null

interface DashboardAgent {
  id: string;
  name: string;
  matricola: string;
  isUfficiale: boolean;
  email: string | null;
  phone: string | null;
  qualifica: string | null;
  gradoLivello: number;
  squadra: string | null;
  massimale: number;
  defaultServiceCategoryId?: string | null;
  defaultServiceTypeId?: string | null;
  rotationGroupId?: string | null;
  dataAssunzione?: string | Date | null;
  scadenzaPatente?: string | Date | null;
  scadenzaPortoArmi?: string | Date | null;
  noteInterne?: string | null;
  repTotal: number;
}

interface DashboardShift {
  id: string;
  userId: string;
  date: Date | string;
  type: string;
  repType: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  adminName: string | null;
  createdAt: string | Date;
  details: string;
  targetName?: string | null;
  targetId?: string | null;
}

interface PendingRequest {
  id: string;
  date: string | Date;
  user: { name: string };
  code: string;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  notes?: string | null;
}

interface PendingSwap {
  id: string;
  shift: { date: string | Date; type: string };
  requester: { name: string };
  targetUser: { name: string };
}

interface BalanceDetail {
  id: string;
  code: string;
  label: string;
  initialValue: number;
  unit: 'DAYS' | 'HOURS';
}

interface AgentBalances {
  balance: { details: BalanceDetail[] } | null;
  usage: {
    absences: { code: string }[];
    agendaEntries: { code: string; hours?: number }[];
  };
  requests: { code: string }[];
}

interface ImportShiftData {
  name: string;
  matricola: string;
  qualifica: string;
  squadra: string;
  date: string;
  type: string;
}

export default function AdminDashboard({ allAgents, shifts, currentYear, currentMonth, isPublished, currentView, settings, tenantSlug }: { 
  allAgents: Omit<DashboardAgent, 'repTotal'>[], 
  shifts: DashboardShift[], 
  currentYear: number, 
  currentMonth: number, 
  isPublished: boolean, 
  currentView?: string, 
  settings?: { massimaleAgente: number, massimaleUfficiale: number },
  rotationGroups?: { id: string, name: string }[],
  categories?: { id: string, name: string, color?: string }[],
  tenantSlug?: string | null
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [isTogglingUff, setIsTogglingUff] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isSavingCell, setIsSavingCell] = useState(false)
  const [recalcAgent, setRecalcAgent] = useState<string | null>(null)
  const [showAnagrafica, setShowAnagrafica] = useState(false)
  const [showSettings, setShowSettings] = useState<boolean | string>(false)
  const [editingAgent, setEditingAgent] = useState<Omit<DashboardAgent, 'repTotal'> | null>(null)
  const [tempEmail, setTempEmail] = useState("")
  const [tempPhone, setTempPhone] = useState("")
  const [tempName, setTempName] = useState("")
  const [tempMatricola, setTempMatricola] = useState("")
  const [tempSquadra, setTempSquadra] = useState("")
  const [tempMassimale, setTempMassimale] = useState(8)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSendingPec, setIsSendingPec] = useState(false)
  const [onlyRepFilter, setOnlyRepFilter] = useState(false)
  const [sortConfig, setSortConfig] = useState<{key: 'name'|'repTotal', dir: 'asc'|'desc'} | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL"|"UFF"|"AGT">("ALL")
  
  // Anagrafica advanced filters & state
  const [anagSearchQuery, setAnagSearchQuery] = useState("")
  const [anagSquadraFilter, setAnagSquadraFilter] = useState("ALL")
  const [anagQualificaFilter, setAnagQualificaFilter] = useState("ALL")
  const [selectedAgentForDetails, setSelectedAgentForDetails] = useState<DashboardAgent | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<"ANAGRAFICA" | "SALDI" | "STORICO" | "NOTE">("ANAGRAFICA")
  const [agentBalances, setAgentBalances] = useState<AgentBalances | null>(null)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)

  // New Personnel Fields
  const [tempDataAssunzione, setTempDataAssunzione] = useState("")
  const [tempScadenzaPatente, setTempScadenzaPatente] = useState("")
  const [tempScadenzaPortoArmi, setTempScadenzaPortoArmi] = useState("")
  const [tempNoteInterne, setTempNoteInterne] = useState("")
  const [tempQualifica, setTempQualifica] = useState("")
  const [newPass, setNewPass] = useState("")

  // Audit Log
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)

  // Verbatel Sync
  const [showVerbatelSync, setShowVerbatelSync] = useState(false)
  const [verbatelTestMode, setVerbatelTestMode] = useState(true)
  const [verbatelScript, setVerbatelScript] = useState("")
  const [isLoadingVerbatel, setIsLoadingVerbatel] = useState(false)

  // Emergency Alert
  const [isSendingAlert, setIsSendingAlert] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  // Approvals (Swaps & Requests)
  const [showSwapApprovals, setShowSwapApprovals] = useState(false)
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false)
  const [importType, setImportType] = useState<"base" | "rep">("base")

  // Bulk Absence Modal
  const [showBulkAbsence, setShowBulkAbsence] = useState(false)
  const [bulkData, setBulkData] = useState({ agentId: "", startDate: "", endDate: "", code: "" })
  const [isSavingBulk, setIsSavingBulk] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  const handleToggleUff = async (userId: string) => {
    setIsTogglingUff(userId)
    try {
      const res = await fetch("/api/admin/toggle-uff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })
      if (res.ok) router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      setIsTogglingUff(null)
    }
  }

  // === CELL EDITING ===
  const openCellEditor = (agentId: string, agentName: string, day: number, currentType: string) => {
    // Controllo blocchi (stesso giorno e giorno dopo)
    const targetDateStr = new Date(Date.UTC(currentYear, currentMonth - 1, day)).toISOString()
    const nextDateStr = new Date(Date.UTC(currentYear, currentMonth - 1, day + 1)).toISOString()
    
    const todayShift = shifts.find(s => s.userId === agentId && new Date(s.date).toISOString() === targetDateStr)
    const nextShift = shifts.find(s => s.userId === agentId && new Date(s.date).toISOString() === nextDateStr)

    const isBlocked = (shiftType: string) => {
      const s = shiftType.toUpperCase().trim()
      return isAssenza(s)
    }

    const tType = todayShift?.type || ""
    const nType = nextShift?.type || ""
    
    let warningMsg = ""
    if (tType === "BR") {
      warningMsg = `BLOCCO REPERIBILITÀ ATTIVO: Non assegnare reperibilità in questo giorno.`
    } else if (tType && isBlocked(tType)) {
      warningMsg = `Attenzione: l'agente ha un'assenza registrata oggi (${tType}). La reperibilità NON dovrebbe essere assegnata.`
    } else if (nType === "BR") {
      warningMsg = `BLOCCO REPERIBILITÀ DOMANI: L'agente è bloccato il giorno successivo.`
    } else if (nType && isBlocked(nType)) {
      warningMsg = `Attenzione: l'agente ha un'assenza registrata domani (${nType}). La reperibilità odierna NON dovrebbe essere assegnata.`
    }

    setEditingCell({ agentId, agentName, day, currentType, warningMsg })
    setEditValue(currentType)
  }

  const saveCellEdit = async (value: string) => {
    if (!editingCell) return
    setIsSavingCell(true)
    
    let finalValue = value.trim()
    if (finalValue.toUpperCase() === "REP") { 
      finalValue = "rep" 
    } else {
      finalValue = finalValue.toUpperCase()
    }

    try {
      const res = await fetch('/api/admin/edit-shift', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingCell.agentId,
          date: new Date(Date.UTC(currentYear, currentMonth - 1, editingCell.day)).toISOString(),
          type: finalValue
        })
      })
      if (!res.ok) throw new Error("Errore salvataggio")
      setEditingCell(null)
      router.refresh()
    } catch {
      toast.error("Errore nel salvataggio")
    } finally {
      setIsSavingCell(false)
    }
  }

  // === BULK EDITING ===
  const handleBulkSave = async () => {
    if (!bulkData.agentId || !bulkData.startDate || !bulkData.endDate || !bulkData.code) {
      toast.error("Compila tutti i campi!")
      return
    }
    const start = new Date(bulkData.startDate)
    const end = new Date(bulkData.endDate)
    if (end < start) {
      toast.error("La data di fine non può essere precedente all'inizio")
      return
    }

    if (!confirm(`Sei sicuro di voler inserire "${bulkData.code}" per il periodo selezionato? Sovrascriverà i turni attuali.`)) return

    setIsSavingBulk(true)
    try {
      const res = await fetch('/api/admin/bulk-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: bulkData.agentId,
          startDate: bulkData.startDate,
          endDate: bulkData.endDate,
          type: bulkData.code
        })
      })
      if (!res.ok) throw new Error("Errore salvataggio massivo")
      toast.success("Assenze inserite con successo!")
      setShowBulkAbsence(false)
      setBulkData({ agentId: "", startDate: "", endDate: "", code: "" })
      router.refresh()
    } catch {
      toast.error("Errore durante l'inserimento")
    } finally {
      setIsSavingBulk(false)
    }
  }

  // === PER-AGENT RECALC ===
  const handleRecalcAgent = async (agentId: string) => {
    if (!confirm("Ricalcolare le reperibilità di questo agente per questo mese? Le REP fisse non verranno toccate, ma i buchi verranno riempiti se necessario.")) return
    
    setRecalcAgent(agentId)
    try {
      const res = await fetch("/api/admin/generate-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, month: currentMonth, year: currentYear })
      })
      if (!res.ok) throw new Error("Errore ricalcolo")
      router.refresh()
    } catch (error) {
       console.error(error)
      toast.error("Errore durante il ricalcolo")
    } finally {
      setRecalcAgent(null)
    }
  }

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true)
    try {
      const res = await fetch("/api/admin/audit")
      if (res.ok) {
        const data = await res.json() as AuditLog[]
        setAuditLogs(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingAudit(false)
    }
  }
  const fetchPendingApprovals = async () => {
    setIsLoadingSwaps(true)
    try {
      const res = await fetch("/api/admin/approvals")
      if (res.ok) {
        const data = await res.json()
        setPendingSwaps(data.pendingSwaps || [])
        setPendingRequests(data.pendingRequests || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoadingSwaps(false)
    }
  }

  const handleApproveAction = async (type: string, id: string, action: "APPROVE" | "REJECT") => {
    if (!confirm(`Confermi l'azione su questa richiesta?`)) return
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, action })
      })
      if (res.ok) {
        toast.success("Operazione completata e griglia aggiornata!")
        fetchPendingApprovals()
        router.refresh()
      } else {
        toast.error("Errore durante l'operazione")
      }
    } catch {
      toast.error("Errore di rete")
    }
  }

  const generateVerbatelScript = async () => {
    setIsLoadingVerbatel(true)
    setVerbatelScript("")
    try {
      const res = await fetch(`/api/admin/verbatel-export?mese=${currentMonth}&anno=${currentYear}`)
      const data = await res.json()
      
      if (!Array.isArray(data)) throw new Error("Errore API Verbatel export")

      const turni = verbatelTestMode && data.length > 0 ? [data[0]] : data;

      const scriptCode = `(async function() {
    const turniDaInserire = ${JSON.stringify(turni)};
    const table = document.getElementById('tableProspetto');
    if(!table) return alert('Tabella Verbatel non trovata! Assicurati di essere nella pagina corretta (Prospetto Reperibilità).');
    
    // Mappatura Colonne -> Giorni
    const ths = table.querySelectorAll('thead tr th');
    const columnToDayMap = {};
    ths.forEach((th, index) => {
        if(index === 0) return;
        const testText = th.innerText || th.textContent || "";
        const match = testText.match(/(\\d{2})\\/\\d{2}/);
        if(match) columnToDayMap[index - 1] = parseInt(match[1], 10);
    });

    const sleep = ms => new Promise(res => setTimeout(res, ms));
    function simulateClick(el, x = 0, y = 0) {
        ['mousedown', 'mouseup', 'click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { 
                view: window, bubbles: true, cancelable: true, buttons: 1,
                clientX: x, clientY: y, screenX: x, screenY: y
            }));
        });
    }

    let modificheFatte = 0;
    const rows = table.querySelectorAll('tbody tr');

    for(const turno of turniDaInserire) {
        let row = null;
        for(let r of rows) {
            const nomCell = r.querySelector('th.nominativo');
            if(nomCell && nomCell.innerHTML.includes(turno.matricola)) {
                row = r; break;
            }
        }
        if(!row) { console.warn('Agente non trovato in griglia Verbatel: ' + turno.agente); continue; }

        for(const giorno of turno.giorni) {
            let targetColIndex = -1;
            for(let c in columnToDayMap) {
                if(columnToDayMap[c] === giorno) { targetColIndex = parseInt(c, 10); break; }
            }
            if(targetColIndex === -1) continue;
            
            const cell = row.querySelectorAll('td')[targetColIndex];
            if(!cell) continue;

            if (cell.className.includes('reperibile') || cell.innerHTML.includes('fa-calendar-day')) {
                continue;
            }

            const originalBg = cell.style.backgroundColor;
            cell.style.border = '2px solid red';
            
            // Per ingannare jQuery ContextMenu, servono coordinate precise
            const rect = cell.getBoundingClientRect();
            const cx = rect.left + (rect.width / 2);
            const cy = rect.top + (rect.height / 2);
            
            const mouseOpts = { 
                bubbles: true, cancelable: true, view: window, 
                clientX: cx, clientY: cy, screenX: cx, screenY: cy 
            };
            
            cell.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
            cell.dispatchEvent(new MouseEvent('mouseenter', mouseOpts));
            await sleep(100);
            
            cell.dispatchEvent(new MouseEvent('mousedown', { ...mouseOpts, button: 0, buttons: 1 }));
            cell.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, button: 0, buttons: 0 }));
            cell.dispatchEvent(new MouseEvent('click', { ...mouseOpts, button: 0, buttons: 0 }));
            await sleep(200);

            // Simula Tasto Destro con coordinate per aprire il ContextMenu
            cell.dispatchEvent(new MouseEvent('contextmenu', { ...mouseOpts, button: 2, buttons: 2 }));
            await sleep(600); // aspetta tempo extra per caricamento menu jQuery

            let btn = null;
            const xpath = "//a[normalize-space(text())='Reperibile'] | //span[normalize-space(text())='Reperibile']";
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for(let i=0; i<result.snapshotLength; i++) {
                let el = result.snapshotItem(i);
                if(el.offsetParent !== null) { btn = el; break; }
            }

            if(!btn) {
                const lis = document.querySelectorAll('li');
                for(let l of lis) { if(l.innerText && l.innerText.trim()==='Reperibile' && l.offsetParent !== null) { btn = l.querySelector('a')||l; break; } }
            }

            if(btn) {
                const btnRect = btn.getBoundingClientRect();
                simulateClick(btn, btnRect.left + 5, btnRect.top + 5);
                modificheFatte++;
                await sleep(600);
            } else {
                console.error("Tasto 'Reperibile' non trovato per " + turno.agente);
                cell.style.border = '';
            }
        }
    }
    alert('Sincronizzazione Compiuta! Turni inseriti: ' + modificheFatte);
})();`;
      setVerbatelScript(scriptCode)
    } catch (error) {
       console.error(error)
      toast.error("Errore durante la generazione dello script per Verbatel.")
    } finally {
      setIsLoadingVerbatel(false)
    }
  }

  const handleClear = async (type: "all" | "base" | "rep") => {
    const messages = {
      all: "CANCELLARE TUTTI I DATI (Turni e Reperibilità)",
      base: "cancellare solo i TURNI BASE (M7, P14, F, ecc.)",
      rep: "cancellare solo le REPERIBILITÀ (R)"
    }
    if (!confirm(`Vuoi davvero ${messages[type]} per il mese di ${currentMonthName} ${currentYear}?`)) return
    
    setIsClearing(true)
    try {
      await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear, type })
      })
      toast.success("Pulizia completata")
      router.refresh()
    } catch {
      toast.error("Errore durante la pulizia")
    } finally {
      setIsClearing(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "base" | "rep") => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadStatus("Lettura file...")
    
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsName = wb.SheetNames[0]
        const ws = wb.Sheets[wsName]
        const data = XLSX.utils.sheet_to_json<string[][]>(ws, { header: 1 })
        let headerRowIndex = -1

        for (let r = 0; r < Math.min(data.length, 10); r++) {
          const row = data[r]
          if (Array.isArray(row)) {
            const rowStr = row.join(" ").toLowerCase()
            if (rowStr.includes("matricola") || rowStr.includes("nominativo")) {
              headerRowIndex = r
              break
            }
          }
        }

        const shiftsData: ImportShiftData[] = []
        const ignoreKeywords = ["AGENTE", "ISTRUTTORE", "UFFICIALE", "SOVRINTENDENTE", "ASSISTENTE", "VICE", "CAPITANO", "TENENTE"]

        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 3
        const colOffset = 4 // I turni iniziano dalla Colonna E (indice 4)

        for (let r = startRow; r < data.length; r++) {
          const rowData = data[r]
          if (!rowData) continue
          
          const rawName = rowData[0]?.toString().trim().toUpperCase() || ""
          const matricola = rowData[1]?.toString().trim() || ""
          const qualifica = rowData[2]?.toString().trim() || ""
          const squadra = rowData[3]?.toString().trim() || ""

          if (!rawName || ignoreKeywords.some(kw => rawName === kw) || rawName.startsWith("TOTALE")) continue

          for (let d = 1; d <= 31; d++) {
            const shiftType = rowData[d + colOffset - 1]?.toString().trim()
            if (shiftType) {
              const dateObj = new Date(Date.UTC(currentYear, currentMonth - 1, d))
              if (dateObj.getMonth() === currentMonth - 1) { 
                shiftsData.push({
                  name: rawName,
                  matricola: matricola,
                  qualifica: qualifica,
                  squadra: squadra,
                  date: dateObj.toISOString(),
                  type: shiftType
                })
              }
            }
          }
        }
        
        setUploadStatus(`Trovati ${shiftsData.length} turni. Invio in corso...`)
        
        const response = await fetch('/api/admin/shifts/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shifts: shiftsData, importType: type })
        })

        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || "Errore API")
        }
        
        const result = await response.json()
        const detail = result.importType === "base" ? "Turni Base" : "Reperibilità"
        setUploadStatus(`✅ Importati ${result.count} ${detail} con successo!`)
        toast.success(`Importazione ${detail} completata: ${result.count} record.`)
        router.refresh()
        setTimeout(() => setUploadStatus(""), 5000)

      } catch (error) {
        setUploadStatus(`❌ ${error instanceof Error ? error.message : "Errore lettura Excel"}`)
      }
    }
    reader.readAsBinaryString(file)
  }

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
  const currentMonthName = monthNames[currentMonth - 1]
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear

  const dayInfoBase = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const date = new Date(currentYear, currentMonth - 1, d)
    return { day: d, name: dayNames[date.getDay()], isWeekend: isHoliday(date) }
  })

  const handleExportExcel = () => {
    const wsData = [
      ["PORTALE CASERMA - REPERIBILITÀ", "", "", ""],
      [`Mese: ${currentMonthName} ${currentYear}`, "", "", ""],
      [],
      ["Agente", ...Array.from({ length: daysInMonth }, (_, i) => i + 1), "Tot REP"]
    ]
    
    // Agents rows
    sortedAgents.forEach(agent => {
      const row: (string | number)[] = [agent.name]
      let repTotal = 0
      
      dayInfoBase.forEach(di => {
        const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
        const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === targetDate)
        
        let val = ""
        if (shift && shift.repType && shift.repType.includes("REP")) {
          val = shift.repType
          repTotal++
        }
        row.push(val)
      })
      
      row.push(repTotal)
      wsData.push(row)
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, `Reperibilità ${currentMonthName} ${currentYear}`)
    
    XLSX.writeFile(wb, `Reperibilita_Generale_${currentYear}_${currentMonth}.xlsx`)
  }

  const handleExportUfficialiExcel = () => {
    const wsData = [
      ["PORTALE CASERMA - REPERIBILITÀ UFFICIALI", "", "", ""],
      [`Mese: ${currentMonthName} ${currentYear}`, "", "", ""],
      [],
      ["Ufficiale", ...Array.from({ length: daysInMonth }, (_, i) => i + 1), "Tot REP"]
    ]
    
    // Only Ufficiali
    const ufficiali = sortedAgents.filter(a => a.isUfficiale)
    ufficiali.forEach(agent => {
      const row: (string | number)[] = [agent.name]
      let repTotal = 0
      
      dayInfoBase.forEach(di => {
        const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
        const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === targetDate)
        
        let val = ""
        if (shift && shift.repType && shift.repType.includes("REP")) {
          val = shift.repType
          repTotal++
        }
        row.push(val)
      })
      
      row.push(repTotal)
      wsData.push(row)
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    XLSX.utils.book_append_sheet(wb, ws, `Ufficiali ${currentMonthName} ${currentYear}`)
    
    XLSX.writeFile(wb, `Reperibilita_Ufficiali_${currentYear}_${currentMonth}.xlsx`)
  }

  const handleExportPDF = async () => {
    setIsExportingPDF(true)
    const toastId = toast.loading("Generazione PDF Certificato in corso...")
    try {
      const dayInfo = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const date = new Date(currentYear, currentMonth - 1, d)
        return { day: d, name: dayNames[date.getDay()], isWeekend: isHoliday(date), month: currentMonth, isNextMonth: false }
      })

      const hash = await generatePlanningPDF({
        monthName: currentMonthName,
        year: currentYear,
        agents: sortedAgents,
        shifts: shifts,
        dayInfo: dayInfo,
        tenantName: "Comando Polizia Locale Altamura"
      })

      // Registrazione Certificato nel DB per validazione QR
      await fetch("/api/admin/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash,
          type: "PLANNING",
          metadata: { month: currentMonth, year: currentYear, agentsCount: sortedAgents.length }
        })
      })

      toast.success(`PDF Certificato! Sigillo: ${hash.substring(0, 8)}...`, { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error("Errore durante la generazione del PDF", { id: toastId })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleExportRepPDF = async () => {
    setIsExportingPDF(true)
    const toastId = toast.loading("Generazione Prospetto REPERIBILITÀ...")
    try {
      const { generateReperibilitaPDF } = await import("@/utils/pdf-generator")
      
      const dayInfo = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const date = new Date(currentYear, currentMonth - 1, d)
        return { day: d, name: dayNames[date.getDay()], isWeekend: isHoliday(date), month: currentMonth, isNextMonth: false }
      })

      // Filtriamo per mostrare solo i REP in questo speciale export
      await generateReperibilitaPDF({
        monthName: currentMonthName,
        year: currentYear,
        agents: sortedAgents.filter(a => a.repTotal > 0),
        shifts: shifts,
        dayInfo: dayInfo,
        tenantName: "Comando Polizia Locale Altamura"
      })

      toast.success(`Prospetto REP Generato!`, { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error("Errore export Reperibilità", { id: toastId })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handlePublish = async () => {
    if (!confirm(`Sei sicuro di voler ${isPublished ? "NASCONDERE" : "PUBBLICARE"} i turni di ${currentMonthName}?`)) return
    setIsPublishing(true)
    setUploadStatus("⚙️ Aggiornamento visibilità...")
    try {
      const res = await fetch("/api/admin/publish-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear, isPublished: !isPublished })
      })
      if (!res.ok) throw new Error("Errore pubblicazione")
      setUploadStatus(isPublished ? "Turni nascosti." : "Turni Pubblicati!")
      router.refresh()
    } catch {
      setUploadStatus("❌ Errore pubblicazione")
    } finally {
      setIsPublishing(false)
      setTimeout(() => setUploadStatus(""), 4000)
    }
  }

  const sortedAgents = useMemo(() => {
    let list = allAgents.map(ag => {
      const repTotal = shifts.filter(s => {
        if (s.userId !== ag.id) return false;
        if (!s.repType?.toUpperCase().includes("REP")) return false;
        
        // Confronto robusto (YYYY-MM-DD) per evitare derive di fuso orario
        const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
        const [y, m] = shiftDate.split('-').map(Number);
        return y === currentYear && m === currentMonth;
      }).length
      return { ...ag, repTotal } as DashboardAgent
    })
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(ag => ag.name.toLowerCase().includes(q))
    }

    if (roleFilter === "UFF") {
      list = list.filter(ag => ag.isUfficiale)
    } else if (roleFilter === "AGT") {
      list = list.filter(ag => !ag.isUfficiale)
    }

    if (onlyRepFilter) {
      list = list.filter(ag => ag.repTotal > 0)
    }

    if (sortConfig) {
      list.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.dir === 'asc' ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [allAgents, shifts, sortConfig, searchQuery, roleFilter, onlyRepFilter, currentYear, currentMonth])

  const filteredAnagraficaAgents = useMemo(() => {
    let list = allAgents.map(ag => {
      const repTotal = shifts.filter(s => {
        if (s.userId !== ag.id) return false;
        if (!s.repType?.toUpperCase().includes("REP")) return false;
        const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
        const [y, m] = shiftDate.split('-').map(Number);
        return y === currentYear && m === currentMonth;
      }).length
      return { ...ag, repTotal } as DashboardAgent
    })
    
    if (anagSearchQuery) {
      const q = anagSearchQuery.toLowerCase()
      list = list.filter(ag => ag.name.toLowerCase().includes(q) || ag.matricola.toLowerCase().includes(q))
    }
    
    if (anagSquadraFilter !== "ALL") {
      list = list.filter(ag => (ag.squadra || "NESSUNA") === anagSquadraFilter)
    }

    if (anagQualificaFilter !== "ALL") {
      list = list.filter(ag => (ag.qualifica || "NESSUNA") === anagQualificaFilter)
    }

    // Sort by name by default
    list.sort((a, b) => a.name.localeCompare(b.name))

    return list
  }, [allAgents, shifts, anagSearchQuery, anagSquadraFilter, anagQualificaFilter, currentYear, currentMonth])

  const uniqueSquadre = useMemo(() => Array.from(new Set(allAgents.map(a => a.squadra || "NESSUNA"))).sort(), [allAgents])
  const uniqueQualifiche = useMemo(() => Array.from(new Set(allAgents.map(a => a.qualifica || "NESSUNA"))).sort(), [allAgents])

  const toggleSort = (key: 'name'|'repTotal') => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.dir === 'asc') return { key, dir: 'desc' }
        return null // 3rd click -> disable sort
      }
      return { key, dir: 'asc' }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cabina di Regia</h2>
          <p className="text-sm text-slate-500">Gestione turni e importazione per l&apos;intero anno</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {uploadStatus && <span className="text-sm font-semibold text-blue-600 mr-2">{uploadStatus}</span>}
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={(e) => handleFileUpload(e, importType)}
          />
          <div className="flex items-center gap-2 flex-grow xl:flex-grow-0">
            <input 
              type="text" 
              placeholder="Cerca per nominativo..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 min-w-[140px] text-sm text-slate-900 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-medium"
            />
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as "ALL"|"UFF"|"AGT")}
              className="px-3 py-1.5 text-sm text-slate-800 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 font-semibold cursor-pointer"
            >
              <option value="ALL">Tutti (Agenti e Uff.)</option>
              <option value="UFF">Solo Ufficiali</option>
              <option value="AGT">Solo Agenti</option>
            </select>
            {sortConfig && (
              <button 
                onClick={() => setSortConfig(null)}
                className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1.5 rounded-md hover:bg-red-200 transition-colors whitespace-nowrap"
                title="Rimuovi l&apos;ordinamento in corso per sbloccare la lista"
              >
                Rimuovi Ordine
              </button>
            )}
          </div>
          
          <div className="flex bg-slate-100 rounded-lg p-1">
             <button 
              onClick={() => { setImportType("base"); setTimeout(() => fileInputRef.current?.click(), 10) }}
              className="flex items-center gap-2 hover:bg-white text-slate-700 px-3 py-1.5 rounded-md text-sm font-semibold transition-all shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]"
              title="Importa i turni o le assenze (F, M, 104, ecc)"
            >
              <UploadCloud width={16} height={16} />
              Importa Turni
            </button>
            <button 
              onClick={() => { setImportType("rep"); setTimeout(() => fileInputRef.current?.click(), 10) }}
              className="flex items-center gap-2 hover:bg-white text-purple-700 px-3 py-1.5 rounded-md text-sm font-semibold transition-all shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]"
              title="Importa il file con scritto &apos;REP&apos; generato dal gestionale"
            >
              <UploadCloud width={16} height={16} />
              Importa Reperibilità
            </button>
            <button
              onClick={() => alert("FORMATO EXCEL RICHIESTO (come da screenshot):\n\n- Riga 1, 2 e 3: Intestazioni\n- Riga 4 in poi: Lista Personale\n\nColonne:\n- Colonna A: NOME AGENTE\n- Colonna B: MATRICOLA\n- Colonna C: QUALIFICA (GRADO)\n- Colonna D: SQUADRA (SEZIONE)\n- Colonna E: Giorno 1 del mese\n- ...fino alla Colonna AI (Giorno 31)\n\nIl sistema rileverà automaticamente se si tratta di turni o reperibilità e creerà l&apos;anagrafica mancante.")}
              className="flex items-center justify-center w-8 hover:bg-white text-slate-400 hover:text-blue-500 rounded-md transition-all shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]"
              title="Come deve essere formattato l&apos;Excel?"
            >
              <HelpCircle width={16} height={16} />
            </button>
          </div>
          
          <div className="flex bg-red-50 rounded-lg p-1 border border-red-100">
            <button 
              disabled={isClearing}
              onClick={() => handleClear("base")}
              className="flex items-center gap-2 hover:bg-white text-red-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-50"
              title="Elimina solo i Turni Base (M, P, F, ecc.)"
            >
              <Trash2 width={14} height={14} />
              Reset Turni
            </button>
            <button 
              disabled={isClearing}
              onClick={() => handleClear("rep")}
              className="flex items-center gap-2 hover:bg-white text-red-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-50 border-l border-red-100"
              title="Elimina solo le Reperibilità (R)"
            >
              <Trash2 width={14} height={14} />
              Reset REP
            </button>
          </div>
          
          <Link 
            href={`/${tenantSlug}/admin/auto-compila`}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-indigo-200"
          >
            <CalendarIcon width={18} height={18} />
            Pianificazione
          </Link>

          <Link 
            href={`/${tenantSlug}/admin/risorse`}
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-amber-200"
          >
            <Users width={18} height={18} />
            Gestione Squadre
          </Link>

          <Link 
            href={`/${tenantSlug}/admin/ods`}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-blue-200"
          >
            <ClipboardList width={18} height={18} />
            Gestione Operativa
          </Link>

          <Link 
            href={`/${tenantSlug}/admin/stampa-ods`}
            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-purple-200"
          >
            <Printer width={18} height={18} />
            Stampa OdS
          </Link>

          <button 
            onClick={() => setShowAnagrafica(true)}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-indigo-200"
          >
            <Users width={18} height={18} />
            Anagrafica
          </button>

          <button 
            onClick={() => setShowBulkAbsence(true)}
            className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-teal-200 shadow-sm"
            title="Inserimento massivo ferie, congedi e malattie per un periodo lungo"
          >
            <CalendarIcon width={18} height={18} />
            Assenze Multiple
          </button>

          <button 
            onClick={() => { setShowAuditLog(true); void fetchAuditLogs(); }}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <RefreshCw width={18} height={18} className={isLoadingAudit ? "animate-spin" : ""} />
            Log Attività
          </button>

          <button 
            onClick={() => { setShowSwapApprovals(true); void fetchPendingApprovals(); }}
            className={`relative flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-all shadow-sm ${pendingSwaps.length + pendingRequests.length > 0 ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
            title="Approvazioni in Coda"
          >
            <RefreshCw width={18} height={18} />
            <span className="hidden sm:inline">Coda Approvazioni</span>
            {(pendingSwaps.length + pendingRequests.length > 0) ? (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-bounce border-2 border-white shadow-md">
                {pendingSwaps.length + pendingRequests.length}
              </span>
            ) : null}
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Settings width={18} height={18} />
            Impostazioni
          </button>

          <button 
            onClick={() => setShowSettings("balances")}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Hash width={18} height={18} />
            Saldi Annuali
          </button>

          <button 
            disabled={isGenerating || isPublishing}
            onClick={handlePublish}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ${isPublished ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
            title={isPublished ? "Nascondi questo mese agli agenti" : "Rendi questo mese visibile agli agenti"}
          >
            {isPublished ? (
              <><EyeOff width={18} height={18} /> Nascondi Mese</>
            ) : (
              <><Eye width={18} height={18} /> Pubblica Mese</>
            )}
          </button>

          <button 
            disabled={!isPublished || isSendingPec}
            onClick={async () => {
              if (!confirm(`Sei sicuro di voler INVIARE LA PEC a tutti i dipendenti anagrafati? Costituirà valore di notifica ufficiale.`)) return
              
              setIsSendingPec(true)
              setUploadStatus("📨 Invio PEC in corso...")
              try {
                const res = await fetch("/api/admin/send-pec", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ month: currentMonth, year: currentYear })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || "Errore sconosciuto PEC")
                setUploadStatus(`✅ PEC inviata con successo a ${data.emailSentCount} dipendenti!`)
              } catch (error) {
                setUploadStatus(`❌ ${error instanceof Error ? error.message : "Errore Invio PEC"}`)
              } finally {
                setIsSendingPec(false)
                setTimeout(() => setUploadStatus(""), 6000)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
            title="Invia il Riepilogo Reperibilità a tutti via Email Certificata"
          >
            <Mail width={18} height={18} />
            Invia PEC Personale
          </button>
          
          <button 
            onClick={() => { setShowVerbatelSync(true); setVerbatelScript(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 hover:shadow-md active:scale-95"
            title="Esporta i turni su Verbatel in automatico"
          >
            <RefreshCw width={18} height={18} />
            Sincronizza Verbatel
          </button>

          <button 
            disabled={isSendingAlert}
            onClick={async () => {
              if (!confirm('🚨 SEI SICURO di voler lanciare un ALLERTA EMERGENZA via Telegram a tutti i reperibili di oggi?')) return
              setIsSendingAlert(true)
              try {
                const res = await fetch('/api/admin/alert-emergency', { method: 'POST' })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Errore invio allerta')
                toast.success(`🚨 Allerta inviata a ${data.alerted} reperibili via Telegram!`)
              } catch (error) {
                 toast.error(error instanceof Error ? error.message : 'Errore Telegram')
              } finally {
                setIsSendingAlert(false)
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-5 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-red-500/30 active:scale-95 disabled:opacity-50 hover:shadow-xl"
            title="Invia allerta immediata via Telegram ai reperibili di oggi"
          >
            {isSendingAlert ? (
              <><RefreshCw width={18} height={18} className="animate-spin" /> Invio in corso...</>
            ) : (
              <>🚨 Allerta Emergenza</>
            )}
          </button>
          
          <button 
            disabled={isGenerating}
            onClick={async () => {
              setIsGenerating(true)
              setUploadStatus("⚙️ Algoritmo in esecuzione...")
              try {
                const res = await fetch('/api/admin/generate', { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ year: currentYear, month: currentMonth })
                })
                if (!res.ok) {
                  const errData = await res.json()
                  throw new Error(errData.error || "Errore generazione")
                }
                const result = await res.json()
                setUploadStatus(`✅ Generati ${result.totalAssigned} turni REP!${result.emptyDays.length > 0 ? ` ⚠️ Giorni scoperti: ${result.emptyDays.join(', ')}` : ''}`)
                router.refresh()
              } catch (error) {
                setUploadStatus(`❌ ${error instanceof Error ? error.message : "Errore"}`)
              } finally {
                setIsGenerating(false)
                setTimeout(() => setUploadStatus(""), 8000)
              }
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isGenerating ? "⚙️ Generazione in corso..." : (
              <>
                <Play width={18} height={18} fill="currentColor" />
                Genera Reperibilità
              </>
            )}
          </button>

          <button 
            disabled={isResolving || isGenerating}
            onClick={async () => {
              if (!confirm('Vuoi attivare l\'Assistente AI per scansionare il mese e coprire i buchi di reperibilità?\n\nL\'algoritmo rispetterà:\n• Stacco minimo notturno (no M il giorno dopo)\n• Massimale individuale\n• Assenze e malattie\n• Equità weekend (Sab/Dom)')) return
              setIsResolving(true)
              setUploadStatus("🧙‍♂️ Assistente AI in Calcolo...")
              try {
                const res = await fetch('/api/admin/resolve-holes', { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ month: currentMonth, year: currentYear })
                })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Errore resolver')
                setUploadStatus(`✅ ${data.holesResolved} buchi coperti in sicurezza!`)
                toast.success(`Coperti ${data.holesResolved} turni mancanti!`)
                router.refresh()
              } catch (error) {
                const msg = error instanceof Error ? error.message : 'Errore sconosciuto';
                setUploadStatus(`❌ Errore: ${msg}`)
                toast.error(`Errore AI: ${msg}`)
              } finally {
                setIsResolving(false)
                setTimeout(() => setUploadStatus(""), 6000)
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-700 to-purple-800 hover:from-fuchsia-600 hover:to-purple-700 text-white px-5 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-50 hover:shadow-xl"
            title="L&apos;Assistente AI scansiona il mese e copre i buchi senza toccare le assegnazioni esistenti"
          >
            {isResolving ? (
              <><RefreshCw width={18} height={18} className="animate-spin" /> Calcolo...</>
            ) : (
              <><Shield width={18} height={18} /> Copertura Buchi REP.</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="w-full lg:w-auto">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <CalendarIcon width={20} height={20} className="text-blue-600" />
              Tabellone Reperibilità
            </h3>
            <div className="flex items-center justify-between lg:justify-start w-full gap-4 mt-1">
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider">{currentMonthName} {currentYear}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{allAgents.length} agenti · {shifts.filter(s => (s.repType || s.type)?.toUpperCase().includes("REP")).length} REP</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto overflow-hidden">
            <div className="flex bg-slate-200/50 rounded-xl p-1 border border-slate-300/50 shadow-sm items-center justify-between sm:justify-start shrink-0">
              <Link 
                href={`${pathname}?month=${prevMonth}&year=${prevYear}${currentView ? `&view=${currentView}` : ''}`} 
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                title="Mese precedente"
              >
                <ChevronLeft width={20} height={20} />
              </Link>
              
              <div className="flex items-center gap-1 px-1">
                <select 
                  value={currentMonth}
                  onChange={(e) => {
                    const m = e.target.value
                    router.push(`${pathname}?month=${m}&year=${currentYear}${currentView ? `&view=${currentView}` : ''}`)
                  }}
                  className="bg-transparent border-none text-[13px] font-black text-slate-800 focus:ring-0 cursor-pointer uppercase py-1 px-1"
                >
                  {monthNames.map((name, i) => (
                    <option key={name} value={i + 1}>{name.substring(0, 3)}</option>
                  ))}
                </select>
                <select 
                  value={currentYear}
                  onChange={(e) => {
                    const y = e.target.value
                    router.push(`${pathname}?month=${currentMonth}&year=${y}${currentView ? `&view=${currentView}` : ''}`)
                  }}
                  className="bg-transparent border-none text-[13px] font-black text-slate-500 focus:ring-0 cursor-pointer py-1 px-1"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <Link 
                href={`${pathname}?month=${nextMonth}&year=${nextYear}${currentView ? `&view=${currentView}` : ''}`} 
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                title="Mese successivo"
              >
                <ChevronRight width={20} height={20} />
              </Link>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
              <div className="flex bg-slate-100 rounded-lg p-1 shrink-0">
                <button onClick={handleExportExcel} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 hover:bg-white px-3 py-1.5 rounded-md transition-all border border-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset] whitespace-nowrap">
                  <FileDown width={14} height={14} />
                  Generale
                </button>
                <button onClick={handleExportUfficialiExcel} className="text-[11px] text-slate-600 hover:text-slate-800 font-bold flex items-center gap-1.5 hover:bg-white px-3 py-1.5 rounded-md transition-all border border-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset] whitespace-nowrap">
                  <FileDown width={14} height={14} />
                  Ufficiali
                </button>
              </div>
              
              <button 
                onClick={() => { void handleExportPDF(); }}
                disabled={isExportingPDF}
                className="ml-2 text-[11px] bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {isExportingPDF ? <RefreshCw width={14} height={14} className="animate-spin" /> : <Shield width={14} height={14} className="text-emerald-400" />}
                PDF PRO
              </button>

              <button 
                onClick={() => { void handleExportRepPDF(); }}
                disabled={isExportingPDF}
                title="Esporta solo Reperibilità"
                className="text-[11px] bg-white text-emerald-700 border border-emerald-200 font-black flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shadow-sm hover:bg-emerald-50 active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                <Shield width={14} height={14} className="text-emerald-600" />
                PDF REP
              </button>
              
              <button 
                onClick={() => setOnlyRepFilter(!onlyRepFilter)}
                className={`p-1.5 rounded-lg transition-all border ${onlyRepFilter ? "bg-emerald-600 text-white border-emerald-700 shadow-lg scale-110" : "bg-white text-slate-400 border-slate-200 hover:border-emerald-300"}`}
                title="Mostra solo chi ha REP"
              >
                <Filter width={16} height={16} />
              </button>
              
              {/* Mobile Toggle */}
              <button 
                onClick={() => setIsMobileView(!isMobileView)}
                className={`ml-2 p-1.5 rounded-lg transition-all border ${isMobileView ? "bg-indigo-600 text-white border-indigo-700" : "bg-white text-slate-400 border-slate-200"}`}
                title="Cambia vista (Tabella/Card)"
              >
                <Smartphone width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {(() => {
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

            if (isMobileView) {
              return (
                <div className="pb-10">
                   <PlanningMobileView 
                      agents={sortedAgents}
                      shifts={shifts}
                      dayInfo={dayInfo}
                      currentYear={currentYear}
                      currentMonth={currentMonth}
                      isAdmin={true}
                      onEditCell={openCellEditor}
                   />
                </div>
              )
            }

            return (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th 
                      className="p-3 text-left font-black text-slate-900 w-52 min-w-[200px] sticky left-0 z-30 bg-slate-50 border-b-4 border-r-2 border-slate-200 cursor-pointer hover:bg-slate-100 transition-all font-sans italic uppercase tracking-tighter" 
                      rowSpan={2}
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center justify-between px-1">
                        Agente
                        <span className="text-[10px] text-indigo-400">{sortConfig?.key === 'name' ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                    {dayInfo.map((di) => (
                      <th 
                        key={di.isNextMonth ? 'next-1' : di.day} 
                        className={`px-1 pt-3 pb-1 text-center font-black border-b border-slate-100 min-w-[42px] font-sans text-[11px] ${di.isNextMonth ? "bg-slate-100 text-slate-300 opacity-50" : (di.isWeekend ? "bg-rose-50/50 text-rose-600 border-rose-100" : "bg-white text-slate-500")}`}
                        title={di.isNextMonth ? `1 ${monthNames[nextMonth - 1]} (Contesto)` : ""}
                      >
                        {di.isNextMonth ? '1*' : di.day}
                      </th>
                    ))}
                    <th className="px-2 pt-3 pb-1 text-center font-black bg-indigo-50 text-indigo-700 border-b-4 border-l-4 border-indigo-100 min-w-[40px] font-sans text-[9px] uppercase tracking-tighter" rowSpan={2} title="Reperibilità nei giorni Festivi e Weekend">
                      FEST
                    </th>
                    <th className="px-2 pt-3 pb-1 text-center font-black bg-slate-50 text-slate-600 border-b-4 border-slate-200 min-w-[40px] font-sans text-[9px] uppercase tracking-tighter" rowSpan={2} title="Reperibilità nei giorni Feriali">
                      FER
                    </th>
                    <th 
                      className="px-3 pt-3 pb-1 text-center font-black bg-indigo-600 text-white border-b-4 border-l-4 border-indigo-900 min-w-[50px] cursor-pointer hover:bg-indigo-700 transition-colors font-sans text-[10px] uppercase tracking-widest" 
                      rowSpan={2}
                      onClick={() => toggleSort('repTotal')}
                    >
                      <div className="flex flex-col items-center justify-center">
                        REP
                        <span className="text-[8px] opacity-60 mt-1">{sortConfig?.key === 'repTotal' ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    {dayInfo.map((di) => (
                      <th 
                        key={di.isNextMonth ? 'next-dow-1' : `dow-${di.day}`} 
                        className={`px-1 pb-2 pt-0 text-center font-black text-[9px] border-b-4 border-slate-200 uppercase tracking-tighter ${di.isNextMonth ? "bg-slate-50 text-slate-200" : (di.isWeekend ? "bg-rose-50/50 text-rose-400 border-rose-100" : "bg-white text-slate-400")}`}
                      >
                        {di.name.substring(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 2} className="p-12 text-center text-slate-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <CalendarIcon width={40} height={40} className="text-slate-300" />
                          <span>Importa il file Excel dei turni per popolare il tabellone</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {sortedAgents.map((agent, idx) => {
                        let repFest = 0
                        let repFer = 0
                        const repDays: number[] = []
                        const effectiveMassimale = agent.isUfficiale 
                          ? (settings?.massimaleUfficiale ?? 6) 
                          : (settings?.massimaleAgente ?? 5)
                        
                        // Pre-calculate stats for this agent
                        dayInfo.forEach(di => {
                          const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                          const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === targetDate)
                          const isRep = (shift?.repType || shift?.type)?.toUpperCase().includes("REP")
                          if (isRep) {
                            repDays.push(di.day)
                            if (di.isWeekend) repFest++
                            else repFer++
                          }
                        })

                        return (
                          <tr key={agent.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/30 transition-colors`}>
                            <td className={`px-4 py-2 sticky left-0 z-20 border-r-4 border-slate-200/50 whitespace-nowrap ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${agent.isUfficiale ? "text-indigo-700" : "text-slate-800 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]"}`}>
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => { void handleToggleUff(agent.id); }}
                                  disabled={isTogglingUff === agent.id}
                                  className={`transition-all ${isTogglingUff === agent.id ? "animate-spin" : ""}`}
                                >
                                  {agent.isUfficiale ? (
                                    <span className="text-[9px] bg-indigo-600 text-white rounded px-1.5 py-0.5 font-black shadow-sm ring-1 ring-indigo-900/10">UFF</span>
                                  ) : (
                                    <span className="text-[9px] bg-slate-200 text-slate-500 rounded px-1.5 py-0.5 font-black border border-slate-300">AGT</span>
                                  )}
                                </button>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-[12px] font-black font-sans tracking-tight truncate">{agent.name}</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-400 font-mono font-bold">MATR. {agent.matricola}</span>
                                    <button 
                                      onClick={() => { void handleRecalcAgent(agent.id); }}
                                      className="p-1 hover:bg-indigo-100 rounded-full text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Ricalcola"
                                    >
                                      <RefreshCw width={10} height={10} className={recalcAgent === agent.id ? "animate-spin" : ""} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            {dayInfo.map(di => {
                              const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                              const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === targetDate)
                              
                              const sType = (shift?.type || "").toUpperCase()
                              const rType = (shift?.repType || "") // Keep case for coloring

                              let cellBg = di.isWeekend ? "bg-red-50/40" : ""
                              let badge = ""
                              let badgeClass = ""

                              // Priority: If there's a REP assignment, show it prominently
                              if (rType === "REP") { // Imported Fixed REP (Viola)
                                cellBg = "bg-purple-100"
                                badge = "REP"
                                badgeClass = "bg-purple-600 text-white font-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] border border-purple-700"
                              } else if (rType === "rep") { // Manual Fixed REP (Arancione)
                                cellBg = "bg-orange-100"
                                badge = "REP"
                                badgeClass = "bg-orange-500 text-white font-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] border border-orange-600"
                              } else if (rType.toLowerCase().includes("rep")) { // Auto-generated REP 22-07 (Verde)
                                cellBg = "bg-emerald-100"
                                badge = "REP"
                                badgeClass = "bg-emerald-500 text-white font-black shadow-sm"
                              } else if (sType === "BR") {
                                cellBg = "bg-slate-100"
                                badge = "BR"
                                badgeClass = "bg-slate-800 text-white font-black shadow-lg"
                              } else if (isMalattia(sType)) {
                                cellBg = "bg-amber-50"
                                badge = sType.length > 3 ? sType.substring(0, 3) : sType
                                badgeClass = "bg-amber-400 text-amber-900 font-bold"
                              } else if (isMattina(sType)) {
                                badge = sType
                                badgeClass = "bg-blue-400 text-white font-bold"
                              } else if (isPomeriggio(sType)) {
                                badge = sType
                                badgeClass = "bg-indigo-300 text-indigo-900 font-bold"
                              } else if (isAssenza(sType)) {
                                cellBg = "bg-amber-50"
                                badge = sType.length > 3 ? sType.substring(0, 3) : sType
                                badgeClass = "bg-amber-200 text-amber-800 font-medium"
                              } else if (sType) {
                                badge = sType.length > 4 ? sType.substring(0, 4) : sType
                                badgeClass = "bg-slate-200 text-slate-700 font-medium"
                              }

                              return (
                                  <td
                                    key={di.isNextMonth ? `next-cell-${di.day}` : `curr-cell-${di.day}`}
                                  className={`px-0 py-1 text-center border-r border-slate-100 transition-all group/cell ${cellBg} ${di.isNextMonth ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer hover:bg-slate-100 hover:shadow-[0_0_0_2px_rgba(79,70,229,0.3)_inset]"}`}
                                  onClick={() => {
                                    if (di.isNextMonth) {
                                      toast.error("Giorno di sola lettura (Mese successivo)");
                                      return;
                                    }
                                    openCellEditor(agent.id, agent.name, di.day, rType || sType || "");
                                  }}
                                >
                                  <div className="relative w-full h-full flex items-center justify-center py-1">
                                    {badge ? (
                                      <div className={`mx-auto w-[36px] h-[24px] flex items-center justify-center rounded-lg text-[9px] font-black leading-none shadow-sm transition-transform group-hover/cell:scale-110 ${badgeClass}`}>
                                        {badge}
                                      </div>
                                    ) : null}
                                    {rType && sType && (
                                      <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-bl-sm opacity-60 shadow-sm" title={`Base: ${sType}`}></div>
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-1 py-1 text-center font-bold border-l-2 border-slate-200 text-[10px] text-purple-700 bg-purple-50/30">
                              {repFest}
                            </td>
                            <td className="px-1 py-1 text-center font-bold border-slate-200 text-[10px] text-blue-700 bg-blue-50/30">
                              {repFer}
                            </td>
                            <td 
                              className={`px-2 py-1 text-center font-black border-l-2 border-slate-200 text-sm cursor-help transition-colors ${
                                repDays.length > effectiveMassimale 
                                  ? "text-red-700 bg-red-100 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)_inset]" 
                                  : repDays.length < 5 
                                    ? "text-amber-700 bg-amber-100 hover:bg-amber-200" 
                                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                              title={
                                repDays.length > effectiveMassimale 
                                  ? `ATTENZIONE: Superato il massimale di ${effectiveMassimale}!\nFestivi: ${repFest}, Feriali: ${repFer}` 
                                  : repDays.length > 0 
                                    ? `Giorni in reperibilità: ${repDays.join(', ')}\nFestivi: ${repFest}, Feriali: ${repFer}` 
                                    : "Nessuna reperibilità"
                              }
                            >
                              <div className="flex flex-col items-center">
                                <span className="flex items-center gap-1">
                                  {repDays.length > agent.massimale && "⚠️ "}{repDays.length}
                                </span>
                                {/* Visual balance indicator */}
                                {repDays.length > 0 && (
                                  <div className="w-full h-1 bg-slate-200 rounded-full mt-1 flex overflow-hidden max-w-[30px]">
                                    <div className="h-full bg-purple-500" style={{ width: `${(repFest / repDays.length) * 100}%` }}></div>
                                    <div className="h-full bg-blue-500" style={{ width: `${(repFer / repDays.length) * 100}%` }}></div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {/* Summary Section Header */}
                      <tr className="border-t-4 border-slate-300 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                        <td className="p-3 border-r-4 border-b-2 border-slate-300 text-right text-[10px] font-black text-slate-500 bg-slate-50 uppercase italic tracking-widest font-sans">Riepilogo Giorni &rarr;</td>
                        {dayInfo.map(di => (
                          <td key={`bot-header-${di.isNextMonth ? 'next' : 'curr'}-${di.day}`} className={`px-1 pt-3 pb-2 text-center font-black text-[10px] border-b-2 border-slate-300 min-w-[38px] font-sans ${di.isWeekend ? "bg-rose-100/30 text-rose-500" : "bg-slate-50 text-slate-400"}`}>
                            {di.day}<br/>
                            <span className="font-bold text-[8px] opacity-70 uppercase">{di.name.substring(0, 3)}</span>
                          </td>
                        ))}
                        <td className="bg-slate-50 border-b-2 border-l-4 border-slate-300"></td>
                      </tr>

                      {/* Daily Totals Row */}
                      <tr className="bg-white group/total">
                        <td className="px-4 py-4 font-black text-slate-900 sticky left-0 z-20 bg-white border-r-4 border-slate-200 text-[11px] uppercase tracking-tighter italic shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                             Totale Giorno
                          </div>
                        </td>
                        {dayInfo.map(di => {
                          const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                          const dailyShifts = shifts.filter(s => (s.repType || s.type)?.toUpperCase().includes("REP") && new Date(s.date).toISOString() === targetDate)
                          const count = dailyShifts.length
                          
                          const isLow = count > 0 && count < 6
                          const isGood = count >= 6
                          const isBad = count > 10

                          return (
                            <td 
                              key={di.isNextMonth ? `next-tot-${di.day}` : `curr-tot-${di.day}`} 
                              className={`px-1 py-3 text-center font-black text-sm cursor-help transition-all ${di.isNextMonth ? "opacity-20" : ""} ${isGood ? "text-emerald-600 bg-emerald-50/30" : isLow ? "text-amber-600 bg-amber-50/30" : isBad ? "text-rose-600 bg-rose-50/30" : "text-slate-200"}`}
                            >
                              {count || "·"}
                            </td>
                          )
                        })}
                        <td className="px-2 py-3 text-center font-black text-indigo-700 border-l-4 border-indigo-200 bg-indigo-50/50 text-base italic">
                          {shifts.filter(s => s.repType?.includes("REP")).length}
                        </td>
                      </tr>

                      {/* Officers Row */}
                      <tr className="bg-slate-50/50 border-t border-slate-200">
                        <td className="px-4 py-4 font-black text-indigo-700 sticky left-0 z-20 bg-slate-50 border-r-4 border-slate-200 text-[10px] uppercase tracking-tighter shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-6 bg-indigo-400 rounded-full" />
                             di cui Ufficiali
                          </div>
                        </td>
                        {dayInfo.map(di => {
                          const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
                          const dailyRepShifts = shifts.filter(s => s.repType?.includes("REP") && new Date(s.date).toISOString() === targetDate)
                          
                          // Estraiamo tutti gli agenti presenti per questo giorno
                          const agentsPresent = dailyRepShifts.map(s => sortedAgents.find(a => a.id === s.userId)).filter(Boolean)
                          
                          const countUff = agentsPresent.filter(a => a?.isUfficiale).length
                          const isZero = countUff === 0 && dailyRepShifts.length > 0

                          let substituteName = "Nessuna asseganzione"
                          if (isZero && agentsPresent.length > 0) {
                            agentsPresent.sort((a, b) => (a!.gradoLivello || 99) - (b!.gradoLivello || 99))
                            substituteName = agentsPresent[0]!.name
                          }

                          return (
                            <td 
                              key={di.isNextMonth ? `next-uff-${di.day}` : `curr-uff-${di.day}`} 
                              title={isZero ? `⚠ ALLERTA UFFICIALE ⚠\nSostituto al Comando: ${substituteName}` : undefined}
                              className={`px-1 py-3 text-center font-black transition-all ${di.isNextMonth ? "opacity-20" : ""} ${
                                isZero 
                                  ? "bg-red-500 text-yellow-300 text-sm shadow-[0_0_12px_rgba(239,68,68,0.8)] border border-red-500 hover:scale-125 cursor-help z-10 relative saturate-150" 
                                  : countUff > 0 ? "text-indigo-600 bg-indigo-50/40 text-xs" : "text-slate-100 text-xs"
                              }`} 
                            >
                              {isZero ? "⚠️" : countUff || "·"}
                            </td>
                          )
                        })}
                        <td className="px-2 py-3 text-center font-black text-indigo-800 border-l-4 border-indigo-300 bg-indigo-100 text-sm italic">
                          {shifts.filter(s => {
                            if(!s.repType?.includes("REP")) return false;
                            const agent = sortedAgents.find(a => a.id === s.userId)
                            return agent?.isUfficiale
                          }).length}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            )
          })()}
        </div>
      </div>

      {/* === CELL EDIT MODAL === */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setEditingCell(null)}>
          <div
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-white"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Premium */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Calendar width={24} height={24} />
                 </div>
                 <div>
                   <h3 className="font-black text-xl text-slate-800 tracking-tight leading-tight">Modifica Turno</h3>
                   <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-0.5">{editingCell.agentName} <span className="text-indigo-400 mx-1">•</span> Giorno {editingCell.day}</p>
                 </div>
              </div>
              <button onClick={() => setEditingCell(null)} className="w-10 h-10 flex items-center justify-center bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-200 active:scale-95">
                <X width={20} height={20} />
              </button>
            </div>

            {editingCell.warningMsg && (
              <div className="mx-6 mt-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm shrink-0">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" width={18} height={18} />
                <p className="text-xs text-amber-800 font-bold leading-relaxed">{editingCell.warningMsg}</p>
              </div>
            )}

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8">
              
              {/* Inserimento Manuale Veloce Spostato In Cima */}
              <div className="space-y-2">
                <div className="flex justify-between items-end mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Inserimento Rapido</label>
                  <span className="text-[10px] text-slate-400 font-medium">Attuale: <strong className="text-indigo-600 font-black">{editingCell.currentType || 'VUOTA'}</strong></span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value.toUpperCase())}
                    placeholder="Es: P14, M7, REP_01"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-5 pr-24 py-4 text-sm font-black text-slate-800 placeholder-slate-300 focus:border-indigo-500 focus:bg-white transition-all outline-none shadow-inner"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') void saveCellEdit(editValue); }}
                  />
                  <button
                    onClick={() => { void saveCellEdit(editValue); }}
                    disabled={isSavingCell || !editValue}
                    className="absolute right-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
                  >
                    Salva
                  </button>
                </div>
              </div>

              {/* Bottoni Causali (A blocchi colorati fluidi) */}
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] font-black text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <span>⚡</span> OPERATIVI VELOCI
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["REP", "BR"].map(code => (
                      <button 
                        key={code} 
                        disabled={isSavingCell} 
                        onClick={() => { void saveCellEdit(code); }} 
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm active:scale-95 border ${
                          code === 'BR' 
                            ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-900' 
                            : 'text-purple-700 bg-purple-100 hover:bg-purple-200 border-purple-200/50'
                        }`}
                      >
                        {code === 'BR' ? '🛡️ BR' : code}
                      </button>
                    ))}
                  </div>
                </div>

                {AGENDA_CATEGORIES.map(cat => (
                  <div key={cat.group}>
                    <div className="text-[10px] font-black text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
                      <span>{cat.emoji}</span> {cat.group}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cat.items.map(item => (
                        <button
                          key={item.shortCode}
                          disabled={isSavingCell}
                          onClick={() => { void saveCellEdit(item.shortCode); }}
                          className={`p-2.5 rounded-xl select-none text-left flex flex-col gap-0.5 disabled:opacity-50 transition-all active:scale-95 shadow-sm border ${
                            cat.color === 'amber' ? 'text-amber-800 bg-amber-100/80 border-amber-200 hover:bg-amber-200 hover:border-amber-300' :
                            cat.color === 'rose' ? 'text-rose-800 bg-rose-100/80 border-rose-200 hover:bg-rose-200 hover:border-rose-300' :
                            cat.color === 'blue' ? 'text-blue-800 bg-blue-100/80 border-blue-200 hover:bg-blue-200 hover:border-blue-300' :
                            cat.color === 'red' ? 'text-red-800 bg-red-100/80 border-red-200 hover:bg-red-200 hover:border-red-300' :
                            cat.color === 'teal' ? 'text-teal-800 bg-teal-100/80 border-teal-200 hover:bg-teal-200 hover:border-teal-300' :
                            cat.color === 'indigo' ? 'text-indigo-800 bg-indigo-100/80 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300' :
                            'text-slate-800 bg-slate-100/80 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                          }`}
                          title={item.label}
                        >
                          <span className="text-[11px] font-black tracking-tight">{item.shortCode}</span>
                          <span className="text-[9px] font-bold opacity-75 leading-tight line-clamp-2">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>

             {/* Footer con Azioni Operatore */}
             <div className="p-5 bg-slate-50 border-t border-slate-100 shrink-0 space-y-3">
              <button
                disabled={recalcAgent === editingCell.agentId}
                onClick={async () => {
                  await handleRecalcAgent(editingCell.agentId);
                  setEditingCell(null);
                }}
                className="w-full flex items-center justify-center gap-3 text-indigo-600 bg-white hover:bg-slate-900 hover:text-white py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border border-slate-200 active:scale-95 group/sync"
              >
                {recalcAgent === editingCell.agentId ? (
                  <RefreshCw width={16} height={16} className="animate-spin" />
                ) : (
                  <Wand2 width={16} height={16} className="group-hover/sync:rotate-12 transition-transform" />
                )}
                Ricalcola Reperibilità Mese
              </button>
              
              <button
                onClick={() => { void saveCellEdit(""); }}
                disabled={isSavingCell}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm border border-slate-100 hover:border-rose-200 active:scale-95"
              >
                <Trash2 width={16} height={16} /> Svuota Turno
              </button>
             </div>
          </div>
        </div>
      )}

      {/* === ANAGRAFICA MODAL === */}
      {showAnagrafica && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-6" onClick={() => setShowAnagrafica(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
            {/* Modal Header Premium */}
            <div className="bg-slate-900 px-10 py-8 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
              <div className="relative z-10">
                <h2 className="font-black text-3xl flex items-center gap-4 uppercase tracking-tighter">
                  <Users width={32} height={32} className="text-blue-400" /> 
                  Gestione Personale
                </h2>
                <div className="flex items-center gap-3 mt-2">
                   <span className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Sentinel Database Operativo</span>
                   <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                </div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <button 
                  onClick={() => {}}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95 flex items-center gap-2 hover:-translate-y-1"
                >
                  <Plus width={18} height={18} /> Aggiungi Agente
                </button>
                <button 
                  onClick={() => setShowAnagrafica(false)} 
                  className="w-14 h-14 flex items-center justify-center bg-white/10 text-white/50 hover:text-white hover:bg-white/20 rounded-[1.5rem] transition-all active:scale-95 border border-white/5"
                >
                  <X width={28} height={28} />
                </button>
              </div>
            </div>

            {/* Filters Bar Glassmorphic */}
            <div className="bg-white border-b border-slate-100 px-10 py-5 flex flex-wrap gap-6 items-center shrink-0 shadow-sm relative z-20">
              <div className="relative group flex-1 max-w-sm">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" width={18} height={18} />
                <input 
                  type="text" 
                  placeholder="Cerca per nome o matricola..." 
                  value={anagSearchQuery}
                  onChange={e => setAnagSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white font-black text-slate-700 transition-all shadow-inner"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex flex-col gap-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Squadra</label>
                   <select
                     value={anagSquadraFilter}
                     onChange={e => setAnagSquadraFilter(e.target.value)}
                     className="px-5 py-3 text-[11px] bg-slate-100 border border-slate-200 rounded-[1.2rem] focus:outline-none focus:border-blue-500 font-black text-slate-700 cursor-pointer transition-all uppercase"
                   >
                     <option value="ALL">TUTTE</option>
                     {uniqueSquadre.map(sq => (
                       <option key={sq} value={sq}>{sq}</option>
                     ))}
                   </select>
                </div>

                <div className="flex flex-col gap-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualifica</label>
                   <select
                     value={anagQualificaFilter}
                     onChange={e => setAnagQualificaFilter(e.target.value)}
                     className="px-5 py-3 text-[11px] bg-slate-100 border border-slate-200 rounded-[1.2rem] focus:outline-none focus:border-blue-500 font-black text-slate-700 cursor-pointer transition-all uppercase"
                   >
                     <option value="ALL">TUTTE</option>
                     {uniqueQualifiche.map(q => (
                       <option key={q} value={q}>{q}</option>
                     ))}
                   </select>
                </div>
              </div>

              <div className="ml-auto hidden xl:block">
                <div className="flex items-center gap-3 bg-blue-50 px-5 py-3 rounded-[1.5rem] border border-blue-100">
                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                   <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{filteredAnagraficaAgents.length} Operatori Attivi</span>
                </div>
              </div>
            </div>
            
            {/* Cards Grid */}
            <div className="p-8 overflow-y-auto bg-slate-50/50 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {filteredAnagraficaAgents.map(agent => {
                  const todayShift = shifts.find(s => s.userId === agent.id && new Date(s.date).toDateString() === new Date().toDateString());
                  const isExpiring = (date: Date | string | null | undefined) => {
                    if (!date) return false;
                    const d = new Date(date);
                    const now = new Date();
                    return d.getTime() < now.getTime() + (30 * 24 * 60 * 60 * 1000); 
                  };

                  return (
                    <div key={agent.id} className={`group relative bg-white rounded-[3rem] shadow-sm border border-slate-100 transition-all duration-500 overflow-hidden flex flex-col ${editingAgent?.id === agent.id ? 'ring-4 ring-blue-500 shadow-2xl scale-[1.02]' : 'hover:shadow-2xl hover:-translate-y-3 hover:border-blue-200'}`}>
                      {/* Card Top Decoration */}
                      <div className={`h-32 transition-all duration-500 ${agent.isUfficiale ? 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900' : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'} relative p-6`}>
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute top-6 right-8 flex gap-3">
                           {isExpiring(agent.scadenzaPatente) && <div className="w-4 h-4 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50 border-2 border-white" title="Patente in Scadenza"></div>}
                           {isExpiring(agent.scadenzaPortoArmi) && <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-lg shadow-orange-500/50 border-2 border-white" title="Porto d'Armi in Scadenza"></div>}
                        </div>
                      </div>

                      {/* Avatar & Header Info */}
                      <div className="absolute top-14 left-10 flex items-end gap-6">
                        <div className="w-28 h-28 bg-white rounded-[2.5rem] p-1.5 shadow-2xl border border-white/50 transition-transform duration-500 group-hover:scale-110">
                          <div className={`w-full h-full rounded-[2.2rem] flex items-center justify-center text-white font-black text-4xl shadow-inner ${agent.isUfficiale ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                            {agent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                        </div>
                        <div className="mb-6">
                           <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] block mb-1 drop-shadow-sm">ID {agent.matricola}</span>
                           <h4 className="text-white font-black text-xl tracking-tighter leading-none uppercase truncate max-w-[180px] drop-shadow-md">{agent.name}</h4>
                        </div>
                      </div>

                      <div className="px-10 pt-16 pb-10 flex-1 flex flex-col bg-white">
                          <div className="flex-1 flex flex-col animate-in fade-in duration-700">
                             {/* Display Info Chips */}
                             <div className="flex flex-wrap gap-2.5 mb-10">
                               <span className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                                 {agent.squadra || 'AREA GENERICA'}
                               </span>
                               <span className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-100 transition-colors">
                                 {agent.qualifica || 'OPERANTE'}
                               </span>
                             </div>

                             {/* Quick Details List */}
                             <div className="space-y-6 mb-12">
                               <div className="flex items-center gap-6 group/item">
                                 <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all duration-300">
                                   <MapPin width={20} height={20} />
                                 </div>
                                 <div className="flex-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Odierno</p>
                                   <span className="text-sm font-black text-slate-900 uppercase">{todayShift ? todayShift.type : 'RIPOSO / SMONTANTE'}</span>
                                 </div>
                               </div>
                               <div className="flex items-center gap-6 group/item">
                                 <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 group-hover/item:bg-teal-500 group-hover/item:text-white transition-all duration-300">
                                   <CalendarIcon width={20} height={20} />
                                 </div>
                                 <div className="flex-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Inquadramento</p>
                                   <span className="text-sm font-black text-slate-900 uppercase">Organico Effettivo</span>
                                 </div>
                               </div>
                               <div className="flex items-center gap-6 group/item">
                                 <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 group-hover/item:bg-slate-900 group-hover/item:text-white transition-all duration-300">
                                   <Phone width={20} height={20} />
                                 </div>
                                 <div className="flex-1">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contatto Mobile</p>
                                   <span className="text-sm font-black text-slate-900 tracking-tight">{agent.phone || '+39 --- --- ----'}</span>
                                 </div>
                               </div>
                             </div>

                             {/* Progress Bars / Stats */}
                             <div className="mt-auto pt-8 border-t border-slate-50">
                                <div className="flex items-center justify-between mb-4">
                                   <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Saturation Score (REP)</p>
                                      <div className="flex items-center gap-3">
                                         <span className={`text-3xl font-black tracking-tighter ${agent.repTotal > agent.massimale ? 'text-rose-600' : 'text-slate-900'}`}>{agent.repTotal}</span>
                                         <span className="text-xs font-black text-slate-300 uppercase tracking-widest">/ {agent.massimale}</span>
                                      </div>
                                   </div>
                                   <div className="w-40 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-50">
                                      <div className={`h-full rounded-full transition-all duration-1000 ${agent.repTotal > agent.massimale ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, (agent.repTotal / agent.massimale) * 100)}%` }}></div>
                                   </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                  <button onClick={() => setSelectedAgentForDetails(agent)} className="px-6 py-4.5 bg-white text-slate-900 border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95">
                                    <Eye width={18} height={18} /> Fascicolo
                                  </button>
                                  <button onClick={() => {
                                      setEditingAgent(agent); 
                                      setTempName(agent.name); 
                                      setTempMatricola(agent.matricola); 
                                      setTempSquadra(agent.squadra || "");
                                      setTempQualifica(agent.qualifica || "Agente di P.L."); 
                                      setTempMassimale(agent.massimale); 
                                      setTempEmail(agent.email || ""); 
                                      setTempPhone(agent.phone || "");
                                      setTempDataAssunzione(agent.dataAssunzione ? new Date(agent.dataAssunzione).toISOString().split('T')[0] : "");
                                      setTempScadenzaPatente(agent.scadenzaPatente ? new Date(agent.scadenzaPatente).toISOString().split('T')[0] : "");
                                      setTempScadenzaPortoArmi(agent.scadenzaPortoArmi ? new Date(agent.scadenzaPortoArmi).toISOString().split('T')[0] : "");
                                      setTempNoteInterne(agent.noteInterne || ""); 
                                      setNewPass("");
                                    }} className="px-6 py-4.5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                                    <Settings2 width={18} height={18} /> Gestisci
                                  </button>
                                </div>
                             </div>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GESTISCI OPERATORE - SLIDE OVER RIGHT */}
      {!!editingAgent && (
        <div className="fixed inset-0 z-[150] flex justify-end bg-slate-900/40 backdrop-blur-sm transition-all duration-500">
          <div className="absolute inset-0" onClick={() => setEditingAgent(null)} />
          <div className="relative w-full max-w-lg bg-white h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            {/* Header */}
            <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between shrink-0 mb-0">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl"><FileEdit width={24} height={24} /></div>
                  <div className="flex flex-col">
                    <h3 className="text-xl font-black">Modifica Strutturale</h3>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Op. {editingAgent.name}</p>
                  </div>
               </div>
               <button onClick={() => setEditingAgent(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X width={20} height={20} /></button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
               {/* Sezione 1: Anagrafica */}
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">1. Anagrafica e Identità</h4>
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nome Completo</label>
                       <input type="text" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Matricola / Identificativo</label>
                           <input type="text" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Massimale Mensile REP</label>
                           <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Sezione 2: Inquadramento */}
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">2. Inquadramento Operativo</h4>
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Qualifica Esatta</label>
                        <input type="text" value={tempQualifica} onChange={e => setTempQualifica(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="es. Istruttore / Agente..." />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Squadra / Reparto</label>
                           <input type="text" value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data Assunzione</label>
                           <input type="date" value={tempDataAssunzione} onChange={e => setTempDataAssunzione(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-black outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Sezione 3: Scadenze */}
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-widest mb-4 border-b border-rose-100 pb-2 flex items-center gap-2"><Shield width={14} height={14}/> 3. Parametri Sensibili</h4>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                     <div>
                        <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Scadenza Patente</label>
                        <input type="date" value={tempScadenzaPatente} onChange={e => setTempScadenzaPatente(e.target.value)} className="w-full bg-white border border-rose-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all shadow-sm text-rose-900" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Scad. Porto D&apos;Armi</label>
                        <input type="date" value={tempScadenzaPortoArmi} onChange={e => setTempScadenzaPortoArmi(e.target.value)} className="w-full bg-white border border-rose-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all shadow-sm text-rose-900" />
                     </div>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1">Note e Limitazioni</label>
                     <textarea value={tempNoteInterne} onChange={e => setTempNoteInterne(e.target.value)} rows={3} className="w-full bg-white border border-amber-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 resize-none transition-all shadow-sm text-amber-900 placeholder:text-amber-200/50" placeholder="Annotazioni su turnazioni, limitazioni operative dirette o altro..." />
                  </div>
                </div>
             </div>

            {/* Footer Azioni */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center gap-3 shrink-0 rounded-bl-3xl">
               <button onClick={async () => {
                  if (!confirm(`Vuoi davvero eliminare l&apos;operatore ${editingAgent.name}? L&apos;azione è irreversibile e distruggerà tutto lo storico.`)) return
                  const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: editingAgent.id }) })
                  if (res.ok) { toast.success('Operatore eliminato'); setEditingAgent(null); router.refresh(); }
                }} className="p-4 text-rose-600 bg-white hover:bg-rose-600 hover:text-white rounded-[1.2rem] transition-all shadow-sm active:scale-95 border border-slate-200 hover:border-rose-600 group" title="Elimina Definivo">
                  <Trash2 width={20} height={20} className="group-hover:animate-pulse" />
               </button>
               <button onClick={() => setEditingAgent(null)} className="flex-1 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 bg-slate-200/50 rounded-[1.2rem] transition-colors border border-slate-200">
                  Annulla
               </button>
               <button onClick={async () => {
                  const res = await fetch('/api/admin/users', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      userId: editingAgent.id, name: tempName, matricola: tempMatricola, squadra: tempSquadra, qualifica: tempQualifica,
                      massimale: tempMassimale, email: tempEmail, phone: tempPhone,
                      dataAssunzione: tempDataAssunzione || null,
                      scadenzaPatente: tempScadenzaPatente || null, 
                      scadenzaPortoArmi: tempScadenzaPortoArmi || null, 
                      noteInterne: tempNoteInterne || null 
                    })
                  })
                  if (res.ok) { toast.success('Profilo aggiornato!'); setEditingAgent(null); router.refresh(); }
                  else { toast.error('Errore durante il salvataggio'); }
               }} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-[1.2rem] text-[12px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save width={18} height={18} /> Salva Dati
               </button>
            </div>
          </div>
        </div>
      )}


      {/* Settings Panel Modal */}
      {showSettings && <SettingsPanel initialTab={typeof showSettings === 'string' ? showSettings as any : undefined} onClose={() => { setShowSettings(false); router.refresh() }} />}
      
      {/* MODALE AUDIT LOG */}
      {showAuditLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAuditLog(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white animate-in zoom-in-95 duration-300">
            {/* Header Glassmorphic */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-100 rounded-[1.5rem] shadow-sm">
                   <ClipboardList width={28} height={28} className="text-slate-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Registro Attività</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Sentinel Autonomous Audit System — Ultime 100 Azioni</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditLog(false)}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
              >
                <X width={24} height={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
              {isLoadingAudit ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="relative">
                    <RefreshCw width={48} height={48} className="text-slate-200 animate-spin" />
                    <RefreshCw width={24} height={24} className="text-indigo-500 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDirection: 'reverse' }} />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-6">Sincronizzazione registri...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                  <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nessun log disponibile nel database</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-slate-200"></div>
                  
                  <div className="space-y-8 relative">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="relative pl-14 group">
                        {/* Timeline dot */}
                        <div className={`absolute left-4.5 top-0 w-3.5 h-3.5 rounded-full border-4 border-white shadow-sm -translate-x-1/2 z-10 transition-transform group-hover:scale-150 ${
                          log.action.includes("DELETE") ? "bg-rose-500 ring-4 ring-rose-100" :
                          log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-500 ring-4 ring-emerald-100" :
                          log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-blue-500 ring-4 ring-blue-100" :
                          "bg-slate-400 ring-4 ring-slate-100"
                        }`}></div>
                        
                        <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                                log.action.includes("DELETE") ? "bg-rose-50 text-rose-700 border-rose-100" :
                                log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-blue-50 text-blue-700 border-blue-100" :
                                "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {log.action}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eseguito da</span>
                                <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{log.adminName || 'Admin Sistema'}</span>
                              </div>
                            </div>
                            <time className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
                              <CalendarIcon width={12} height={12} />
                              {new Date(log.createdAt).toLocaleString("it-IT", { 
                                day: '2-digit', month: '2-digit', year: 'numeric', 
                                hour: '2-digit', minute: '2-digit' 
                              })}
                            </time>
                          </div>
                          
                          <p className="text-sm text-slate-700 font-bold leading-relaxed mb-4">{log.details}</p>
                          
                          {log.targetName && (
                            <div className="pt-4 border-t border-slate-50 flex items-center gap-4">
                               <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                  <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Soggetto interessato</p>
                                  <p className="text-[11px] font-black text-slate-700 uppercase">{log.targetName}</p>
                               </div>
                               <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 hidden sm:block">
                                  <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">System ID Hash</p>
                                  <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">{log.targetId?.slice(0,12)}...</p>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE VERBATEL SYNC */}
      {showVerbatelSync && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowVerbatelSync(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white animate-in zoom-in-95 duration-300">
            
            {/* Header Tech Style */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-orange-50/30 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-orange-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-orange-200">
                   <RefreshCw width={28} height={28} className={isLoadingVerbatel ? "animate-spin" : ""} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sincronizzazione Esterna</h2>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest bg-orange-100 px-2 py-0.5 rounded">Verbatel API Bridge</span>
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">•</span>
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest uppercase">Mese {currentMonth}/{currentYear}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowVerbatelSync(false)}
                className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
              >
                <X width={24} height={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30 custom-scrollbar">
              
              {/* Process Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {[
                   { step: "01", title: "Aperto Verbatel", desc: "Seleziona 'Prospetto Reperibilità'" },
                   { step: "02", title: "Imposta Filtri", desc: `Dal 01/${currentMonth} al 01/${currentMonth+1 === 13 ? 1 : currentMonth+1}` },
                   { step: "03", title: "Genera & Incolla", desc: "Usa la Console (F12) per iniettare" }
                 ].map((s, idx) => (
                   <div key={s.step} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                      <span className="absolute -top-2 -right-2 text-4xl font-black text-slate-50 group-hover:text-orange-50 transition-colors pointer-events-none">{s.step}</span>
                      <p className="text-[10px] font-black text-orange-600 mb-1 uppercase tracking-widest">Passaggio {s.step}</p>
                      <h4 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-tight">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 font-bold">{s.desc}</p>
                      {idx < 2 && <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 text-slate-200"><ChevronRight width={16} height={16} /></div>}
                   </div>
                 ))}
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-50">
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input type="checkbox" checked={verbatelTestMode} onChange={(e) => setVerbatelTestMode(e.target.checked)} className="peer sr-only" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                      </div>
                      <span className="font-black text-[12px] text-slate-700 uppercase tracking-tight">Esegui Test di Sicurezza (1 Agente)</span>
                    </label>
                    <p className="text-[9px] text-slate-400 font-bold uppercase pl-14">Consigliato prima del caricamento massivo</p>
                  </div>

                  <button 
                    onClick={() => { void generateVerbatelScript(); }}
                    disabled={isLoadingVerbatel}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoadingVerbatel ? <RefreshCw className="animate-spin" width={20} height={20} /> : <Play width={20} height={20} />}
                    <span className="uppercase tracking-widest text-[11px]">Avvia Generazione Script</span>
                  </button>
                </div>

                {verbatelScript ? (
                  <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                    <div className="flex items-center justify-between px-2">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dna dello Script Generato</h5>
                       <span className="text-[9px] text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">PRONTO PER IL COPIA-INCOLLA</span>
                    </div>
                    <div className="relative group">
                      <textarea 
                        readOnly 
                        value={verbatelScript} 
                        className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-[10px] p-6 rounded-[1.5rem] border-2 border-slate-800 focus:outline-none focus:border-orange-500 transition-colors shadow-inner selection:bg-orange-500/30"
                        placeholder="In attesa di generazione dati..."
                      />
                      <button 
                        onClick={() => { void navigator.clipboard.writeText(verbatelScript); toast.success("Script copiato! Incollalo nella Console di Verbatel."); }}
                        className="absolute right-4 bottom-4 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2"
                      >
                         <ClipboardList width={16} height={16} /> Copia Script
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[1.5rem] bg-slate-50/50">
                    <UploadCloud className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">In attesa della richiesta di sincronizzazione</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {/* Modal Richieste Scambio */}
      {showSwapApprovals && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSwapApprovals(false)}></div>
          <div className="relative w-full max-w-3xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white flex flex-col max-h-[90vh]">
            
            {/* Header Moderno Amber */}
            <div className="bg-white border-b border-slate-100 p-8 text-slate-900 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-amber-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-amber-200">
                   <RefreshCw width={28} height={28} className={isLoadingSwaps ? "animate-spin" : ""} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Centro Approvazioni</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Gestione Scambi e Permessi Dipendenti</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSwapApprovals(false)}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
              >
                <X width={24} height={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50/50 custom-scrollbar flex-1 space-y-10">
              {isLoadingSwaps ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw width={40} height={40} className="animate-spin text-slate-300 mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Verifica code in corso...</p>
                </div>
              ) : pendingSwaps.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                     <CheckCircle2 className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nessuna operazione in coda</p>
                </div>
              ) : (
                <>
                  {/* Sezione 1: Assenze */}
                  {pendingRequests.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                         <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                         <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Richieste di Assenza ({pendingRequests.length})</h4>
                      </div>
                      {pendingRequests.map((req) => (
                        <div key={req.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 group">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-6">
                                 {/* Data Circle */}
                                 <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.2rem] flex flex-col items-center justify-center shadow-xl shadow-slate-200 shrink-0">
                                    <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{new Date(req.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                                    <span className="text-2xl font-black leading-none">{new Date(req.date).getDate()}</span>
                                 </div>
                                 
                                 <div>
                                    <h5 className="font-black text-slate-900 text-lg uppercase leading-tight tracking-tight mb-1">{req.user.name}</h5>
                                    <div className="flex flex-wrap items-center gap-3">
                                       <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-100 uppercase">{req.code}</span>
                                       {req.startTime && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><RefreshCw width={10}/> {req.startTime} • {req.endTime}</span>}
                                    </div>
                                    {req.notes && <p className="mt-3 text-xs text-slate-500 italic font-medium bg-slate-50 p-2 rounded-xl group-hover:bg-amber-50/50 transition-colors">&ldquo;{req.notes}&rdquo;</p>}
                                 </div>
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                 <button onClick={() => { void handleApproveAction("LEAVE_REQUEST", req.id, "REJECT"); }} className="px-6 py-3.5 border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95">Rifiuta</button>
                                 <button onClick={() => { void handleApproveAction("LEAVE_REQUEST", req.id, "APPROVE"); }} className="px-8 py-3.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Approva</button>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sezione 2: Scambi */}
                  {pendingSwaps.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                         <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                         <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Proposte di Scambio Turno ({pendingSwaps.length})</h4>
                      </div>
                      {pendingSwaps.map((swap) => (
                        <div key={swap.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative group">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><RefreshCw size={80}/></div>
                           
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                              <div className="flex flex-col sm:flex-row items-center gap-6">
                                 {/* User Swap Flow */}
                                 <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-[1.8rem]">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 font-black text-xs shadow-sm border border-slate-200">{swap.requester.name.slice(0,2)}</div>
                                    <div className="p-2 bg-slate-900 text-white rounded-full animate-pulse"><RefreshCw width={14} height={14} /></div>
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-sm">{swap.targetUser.name.slice(0,2)}</div>
                                 </div>
                                 
                                 <div className="text-center sm:text-left">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Passaggio Turno del {new Date(swap.shift.date).toLocaleDateString('it-IT')}</p>
                                    <h5 className="font-black text-slate-900 text-sm uppercase"><span className="text-slate-500">{swap.requester.name}</span> <span className="text-indigo-600">→</span> {swap.targetUser.name}</h5>
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 rounded-lg uppercase tracking-tighter">Turno: {swap.shift.type}</span>
                                 </div>
                              </div>
                              
                              <div className="flex items-center gap-3 shrink-0">
                                 <button onClick={() => { void handleApproveAction("SWAP_REQUEST", swap.id, "REJECT"); }} className="px-6 py-3.5 border-2 border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95">Annulla</button>
                                 <button onClick={() => { void handleApproveAction("SWAP_REQUEST", swap.id, "APPROVE"); }} className="px-8 py-3.5 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">Conferma Scambio</button>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="p-6 bg-slate-900 text-white shrink-0">
               <div className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 rounded-xl"><AlertCircle className="text-amber-400" width={18} height={18}/></div>
                  <p className="text-[10px] text-white/60 font-medium leading-relaxed">
                    ATTENZIONE: L&apos;approvazione è definitiva e sposterà i turni nel Database centrale, notificando immediatamente gli interessati via Telegram e Push.
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Assenze Multiple */}
      {showBulkAbsence && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowBulkAbsence(false)}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-white">
            
            {/* Header Moderno Teal */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-teal-50/30 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-teal-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-teal-200">
                   <CalendarIcon width={28} height={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-teal-900">Gestione Assenze</h3>
                  <p className="text-[10px] text-teal-600 font-black uppercase tracking-[0.2em] mt-1">Sentinel Bulk Entry System — Inserimento Massivo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkAbsence(false)}
                className="w-12 h-12 flex items-center justify-center bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-slate-100 active:scale-95"
              >
                <X width={24} height={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-slate-50/50 flex-1 custom-scrollbar">
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Pannello Configurazione (Sinistra) */}
                <div className="w-full lg:w-80 space-y-8 shrink-0">
                   <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">01. Parametri Agente</h4>
                      <div className="space-y-4">
                        <div className="relative group">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" width={18} height={18} />
                          <select
                            value={bulkData.agentId}
                            onChange={e => setBulkData({ ...bulkData, agentId: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[1.2rem] text-sm font-black text-slate-700 outline-none focus:border-teal-500 shadow-sm transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Seleziona Operatore...</option>
                            {allAgents
                               .filter(a => roleFilter === "ALL" || (roleFilter === "UFF" && a.isUfficiale) || (roleFilter === "AGT" && !a.isUfficiale))
                               .sort((a,b) => a.name.localeCompare(b.name))
                               .map(agent => (
                              <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                   </div>

                   <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">02. Periodo Temporale</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-1">DATA INIZIO</p>
                           <input type="date" value={bulkData.startDate} onChange={e => setBulkData({ ...bulkData, startDate: e.target.value })} className="w-full bg-transparent text-xs font-black text-slate-700 outline-none" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                           <p className="text-[8px] font-black text-slate-400 uppercase mb-1">DATA FINE</p>
                           <input type="date" value={bulkData.endDate} onChange={e => setBulkData({ ...bulkData, endDate: e.target.value })} className="w-full bg-transparent text-xs font-black text-slate-700 outline-none" />
                        </div>
                      </div>
                   </div>

                   <div className="p-6 bg-teal-900 rounded-[2rem] text-white shadow-xl shadow-teal-100 animate-in zoom-in-95">
                      <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-3">Riepilogo Comando</p>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center text-xs font-bold">
                            <span>Operatore:</span>
                            <span className="text-teal-300">{allAgents.find(a => a.id === bulkData.agentId)?.name || '---'}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-bold">
                            <span>Causale:</span>
                            <span className="bg-teal-500 px-2 py-0.5 rounded text-[10px] font-black">{bulkData.code || 'DA SCEGLIERE'}</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => { void handleBulkSave(); }}
                        disabled={isSavingBulk || !bulkData.agentId || !bulkData.startDate || !bulkData.endDate || !bulkData.code}
                        className="w-full mt-6 bg-white text-teal-900 py-4 rounded-[1.2rem] text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-teal-50 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
                      >
                         {isSavingBulk ? <RefreshCw className="animate-spin" width={16} height={16} /> : <CheckCircle2 width={18} height={18} />}
                         Esegui Inserimento
                      </button>
                   </div>
                </div>

                {/* Pannello Causali (Destra) */}
                <div className="flex-1 space-y-8">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">03. Selezione Causale Informatizzata</h4>
                   <div className="space-y-8">
                      {AGENDA_CATEGORIES.map(cat => (
                        <div key={`bulk-premium-${cat.group}`}>
                          <div className="text-[10px] font-black text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
                            <span>{cat.emoji}</span> {cat.group}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {cat.items.map(item => (
                              <button
                                key={`bulk-item-${item.shortCode}`}
                                onClick={() => setBulkData({ ...bulkData, code: item.shortCode })}
                                className={`p-3 rounded-2xl select-none text-left flex flex-col gap-1 transition-all active:scale-95 shadow-sm border ${
                                  bulkData.code === item.shortCode 
                                    ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-100 -translate-y-1' 
                                    : 'bg-white border-slate-100 text-slate-800 hover:border-teal-200 hover:bg-teal-50/30'
                                }`}
                              >
                                <span className={`text-[11px] font-black tracking-tight ${bulkData.code === item.shortCode ? 'text-white' : 'text-slate-900'}`}>{item.shortCode}</span>
                                <span className={`text-[9px] font-bold leading-tight line-clamp-2 ${bulkData.code === item.shortCode ? 'text-teal-100' : 'text-slate-400'}`}>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETTAGLI OPERATORE (FASCICOLO A TAB) */}
      {selectedAgentForDetails && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300" onClick={() => setSelectedAgentForDetails(null)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
             {/* Header Dynamically Colored Premium */}
             <div className={`${selectedAgentForDetails.isUfficiale ? 'bg-indigo-950' : 'bg-slate-900'} px-12 py-10 text-white shrink-0 relative overflow-hidden transition-colors duration-500`}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse"></div>
                <div className="flex justify-between items-center relative z-10">
                   <div className="flex items-center gap-10">
                      <div className="w-32 h-32 rounded-[3.5rem] bg-white p-2 shadow-2xl transition-transform hover:scale-105 duration-500">
                         <div className={`w-full h-full rounded-[3rem] bg-gradient-to-br ${selectedAgentForDetails.isUfficiale ? 'from-indigo-600 to-blue-700 shadow-indigo-900/40' : 'from-slate-700 to-slate-900 shadow-slate-950/40'} flex items-center justify-center text-4xl font-black shadow-inner`}>
                            {selectedAgentForDetails.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                         </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-4 mb-4">
                           <span className="px-5 py-2 bg-blue-500/10 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 border border-blue-400/20 shadow-lg">ID {selectedAgentForDetails.matricola}</span>
                           <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg ${selectedAgentForDetails.isUfficiale ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' : 'bg-slate-500/20 text-slate-300 border-slate-400/30'}`}>
                             {selectedAgentForDetails.qualifica || 'Agente di P.L.'}
                           </span>
                        </div>
                        <h2 className="text-6xl font-black tracking-tighter leading-none mb-3 uppercase">{selectedAgentForDetails.name}</h2>
                        <div className="flex items-center gap-8">
                           <div className="flex items-center gap-3 text-slate-400 font-extrabold uppercase text-[11px] tracking-[0.2em]">
                             <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                             {selectedAgentForDetails.squadra || 'DISTACCAMENTO GENERALE'}
                           </div>
                           <div className="w-[1.5px] h-4 bg-white/10"></div>
                           <div className="flex items-center gap-3 text-slate-400 font-extrabold uppercase text-[11px] tracking-[0.2em]">
                             <Briefcase width={16} height={16} className="text-blue-400" />
                             Assunzione: {selectedAgentForDetails.dataAssunzione ? new Date(selectedAgentForDetails.dataAssunzione).toLocaleDateString('it-IT') : 'N/D'}
                           </div>
                        </div>
                      </div>
                   </div>
                   <button 
                     onClick={() => setSelectedAgentForDetails(null)} 
                     className="w-16 h-16 flex items-center justify-center bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white/40 rounded-[2rem] transition-all border border-white/5 active:scale-95 shadow-xl"
                   >
                      <X width={32} height={32} />
                   </button>
                </div>

                {/* TAB NAVIGATION PREMIUM */}
                <div className="flex gap-3 mt-12 relative z-10 px-2 overflow-x-auto no-scrollbar">
                   {[
                     { id: 'ANAGRAFICA', label: 'Profilo Atleta', icon: Users },
                     { id: 'SALDI', label: 'Saldi Operativi', icon: Hash },
                     { id: 'STORICO', label: 'Riepilogo Turnazione', icon: Calendar },
                     { id: 'NOTE', label: 'Dossier Interno', icon: FileText }
                   ].map(tab => (
                     <button
                       key={tab.id}
                       onClick={() => {
                         setActiveDetailTab(tab.id as "ANAGRAFICA" | "SALDI" | "STORICO" | "NOTE");
                         if (tab.id === 'SALDI') {
                           setIsLoadingBalances(true);
                           fetch(`/api/admin/users/${selectedAgentForDetails.id}/balances?year=${currentYear}`)
                             .then(res => res.json())
                             .then((data: AgentBalances) => { setAgentBalances(data); setIsLoadingBalances(false); })
                             .catch(() => { toast.error("Errore caricamento saldi"); setIsLoadingBalances(false); });
                         }
                       }}
                       className={`flex items-center gap-3 px-10 py-4.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 border ${
                         activeDetailTab === tab.id 
                           ? 'bg-white text-slate-900 shadow-2xl border-white scale-105' 
                           : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                       }`}
                     >
                       <tab.icon width={18} height={18} />
                       {tab.label}
                     </button>
                   ))}
                </div>
             </div>

             {/* Dynamic Content Area */}
             <div className="flex-1 overflow-y-auto p-12 bg-slate-50 custom-scrollbar">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   
                   {activeDetailTab === 'ANAGRAFICA' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white space-y-8">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-4 font-outfit">
                              <Users width={20} height={20} className="text-blue-500" /> Profilo Professionale
                           </h3>
                           <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Qualifica</p>
                                    <p className="text-sm font-bold text-slate-800">{selectedAgentForDetails.qualifica || 'Agente'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Matricola</p>
                                    <p className="text-sm font-bold text-slate-800">{selectedAgentForDetails.matricola}</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Reparto / Squadra</p>
                                    <p className="text-sm font-bold text-slate-800 text-blue-600 font-black">{selectedAgentForDetails.squadra || 'Generale'}</p>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Data Assunzione</p>
                                    <p className="text-sm font-bold text-slate-800">{selectedAgentForDetails.dataAssunzione ? new Date(selectedAgentForDetails.dataAssunzione).toLocaleDateString() : 'N/D'}</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white space-y-8">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                              <Award width={20} height={20} className="text-emerald-500" /> Abilitazioni e Scadenze
                           </h3>
                           <div className="grid grid-cols-1 gap-6">
                              <div className={`p-6 rounded-3xl border-2 transition-all ${selectedAgentForDetails.scadenzaPatente && new Date(selectedAgentForDetails.scadenzaPatente) < new Date(Date.now() + 30*24*60*60*1000) ? 'bg-rose-50 border-rose-200 shadow-rose-100 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                                 <div className="flex justify-between items-start mb-2">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Patente di Guida</p>
                                    {selectedAgentForDetails.scadenzaPatente && new Date(selectedAgentForDetails.scadenzaPatente) < new Date() && <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter shadow-sm animate-bounce">Scaduta</span>}
                                 </div>
                                 <p className="text-lg font-black text-slate-900">{selectedAgentForDetails.scadenzaPatente ? new Date(selectedAgentForDetails.scadenzaPatente).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : 'NON REGISTRATA'}</p>
                              </div>
                              <div className="p-6 rounded-3xl bg-slate-50 border-2 border-slate-100">
                                 <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Porto d&apos;Armi</p>
                                 <p className="text-lg font-black text-slate-900">{selectedAgentForDetails.scadenzaPortoArmi ? new Date(selectedAgentForDetails.scadenzaPortoArmi).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }) : 'NON REGISTRATA'}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   {activeDetailTab === 'SALDI' && (
                     <div className="space-y-8">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white">
                           <div className="flex justify-between items-center mb-10">
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                                 <Hash width={20} height={20} className="text-indigo-500" /> Prospetto Saldi Eseguito {currentYear}
                              </h3>
                              <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                Dati Aggiornati in Tempo Reale
                              </div>
                           </div>

                           {isLoadingBalances ? (
                              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                                 <RefreshCw width={48} height={48} className="text-indigo-300 animate-spin" />
                                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Calcolo saldi e richieste in corso...</p>
                              </div>
                           ) : agentBalances ? (
                              <div className="overflow-hidden border-2 border-slate-100 rounded-[2rem]">
                                 <table className="w-full text-left border-collapse">
                                    <thead>
                                       <tr className="bg-slate-50 border-b-2 border-slate-100">
                                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ring-1 ring-slate-100">Causale</th>
                                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ring-1 ring-slate-100">Iniziali</th>
                                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ring-1 ring-slate-100">Richiesti</th>
                                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ring-1 ring-slate-100">Utilizzati</th>
                                          <th className="px-8 py-5 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] bg-indigo-50/50 ring-1 ring-indigo-100">Residui</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y-2 divide-slate-50">
                                       {agentBalances.balance?.details.map((detail) => {
                                          const usedFromAbsences = agentBalances.usage.absences.filter((a) => a.code === detail.code).length;
                                          const usedFromAgenda = agentBalances.usage.agendaEntries.filter((a) => a.code === detail.code).reduce((sum, entry) => sum + (entry.hours ? entry.hours / 6 : 1), 0);
                                          const used = usedFromAbsences + usedFromAgenda;
                                          const requested = agentBalances.requests.filter((r) => r.code === detail.code).length;
                                          const residuo = detail.initialValue - used - requested;

                                          return (
                                             <tr key={detail.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                   <div className="flex items-center gap-4">
                                                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400"></div>
                                                      <div>
                                                         <p className="text-xs font-black text-slate-900 uppercase">{detail.label || detail.code}</p>
                                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Codice: {detail.code}</p>
                                                      </div>
                                                   </div>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-black text-slate-600">{detail.initialValue} {detail.unit === 'DAYS' ? 'GG' : 'H'}</td>
                                                <td className="px-8 py-5 text-sm font-black text-amber-600 bg-amber-50/10">{requested > 0 ? `-${requested}` : '0'}</td>
                                                <td className="px-8 py-5 text-sm font-black text-rose-600 bg-rose-50/10">-{used}</td>
                                                <td className={`px-8 py-5 text-lg font-black bg-indigo-50/30 ring-1 ring-indigo-50 transition-all group-hover:bg-indigo-50 ${residuo < 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
                                                   {residuo}
                                                </td>
                                             </tr>
                                          );
                                       })}
                                       {(!agentBalances.balance || agentBalances.balance.details.length === 0) && (
                                          <tr>
                                             <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">
                                                Nessun saldo iniziale caricato per questo operatore nel {currentYear}.
                                             </td>
                                          </tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           ) : null}
                        </div>
                        
                        <div className="bg-amber-50 h-2 border-2 border-amber-100 border-dashed rounded-full px-10 py-6 flex items-center gap-4">
                           <AlertCircle width={20} height={20} className="text-amber-600" />
                           <p className="text-xs font-bold text-amber-800">I saldi vengono calcolati sottraendo sia i giorni già effettuati che le richieste in attesa di approvazione.</p>
                        </div>
                     </div>
                   )}

                   {activeDetailTab === 'STORICO' && (
                     <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white">
                        <div className="flex justify-between items-center mb-10">
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-4">
                              <Calendar width={20} height={20} className="text-indigo-500" /> Cronologia Turni {currentMonthName}
                           </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                           {shifts.filter((s) => s.userId === selectedAgentForDetails.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s) => (
                              <div key={s.id} className="flex items-center gap-8 p-6 rounded-3xl hover:bg-slate-50 transition-all border-2 border-transparent hover:border-slate-100 group">
                                 <div className="w-20 shrink-0 text-center">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{new Date(s.date).toLocaleDateString('it-IT', { weekday: 'short' })}</p>
                                    <p className="text-2xl font-black text-slate-900 leading-none">{new Date(s.date).getDate()}</p>
                                 </div>
                                 <div className="w-[2px] h-10 bg-slate-100"></div>
                                 <div className="flex-1">
                                    <div className="flex items-center gap-4">
                                       <span className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border shadow-sm ${
                                          s.type==='F' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                          s.type.includes('REP') ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                                       }`}>
                                          {s.type}
                                       </span>
                                       <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{s.repType || 'Servizio Ordinario'}</span>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">ID: {s.id.slice(0,8)}</p>
                                 </div>
                              </div>
                           ))}
                           {shifts.filter((s) => s.userId === selectedAgentForDetails.id).length === 0 && (
                              <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                 <p className="text-slate-400 font-bold italic text-sm">Nessuna attività registrata per questo mese.</p>
                              </div>
                           )}
                        </div>
                     </div>
                   )}

                   {activeDetailTab === 'NOTE' && (
                     <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-white min-h-[400px] flex flex-col">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-4">
                           <FileText width={20} height={20} className="text-slate-400" /> Annotazioni Amministrative Riservate
                        </h3>
                        <div className="flex-1 p-10 bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                           {selectedAgentForDetails.noteInterne ? (
                             <p className="text-base font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedAgentForDetails.noteInterne}</p>
                           ) : (
                             <div className="h-full flex flex-col items-center justify-center text-center">
                                <FileText width={48} height={48} className="text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400 italic">Nessuna nota presente per questo operatore.</p>
                                <p className="text-[10px] uppercase font-black text-slate-300 mt-2 tracking-widest">Puoi aggiungerle cliccando su &quot;Gestisci&quot; nella scheda principale</p>
                             </div>
                           )}
                        </div>
                     </div>
                   )}

                </div>
             </div>
             
             {/* Footer Enhanced */}
             <div className="bg-white px-12 py-8 border-t-2 border-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className={`w-3 h-3 rounded-full ${selectedAgentForDetails.isUfficiale ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema Gestionale Caserma · Profilo {selectedAgentForDetails.isUfficiale ? 'Ufficiale' : 'Agente'}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedAgentForDetails(null);
                    setAgentBalances(null);
                    setActiveDetailTab("ANAGRAFICA");
                  }} 
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl active:scale-95"
                >
                  Chiudi Documento
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
