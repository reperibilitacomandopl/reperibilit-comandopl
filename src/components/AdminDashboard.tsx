"use client"

import toast from "react-hot-toast"
import { useState, useRef, useMemo } from "react"
import { Calendar as CalendarIcon, UploadCloud, Users, ChevronLeft, ChevronRight, Settings, FileDown, LogOut, CheckCircle2, RefreshCw, X, FileEdit, Trash2, Shield, AlertCircle, HelpCircle, EyeOff, Eye, Mail, Play, Plus, ClipboardList, Printer } from "lucide-react"
import SettingsPanel from "./SettingsPanel"
import ServiceManagerPanel from "./ServiceManagerPanel"
import ServiceOrderDashboard from "./ServiceOrderDashboard"
import * as XLSX from "xlsx"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { isHoliday } from "../utils/holidays"
import { isMalattia, isMattina, isPomeriggio, isAssenza } from "../utils/shift-logic"

type EditingCell = { agentId: string; agentName: string; day: number; currentType: string; warningMsg?: string } | null

export default function AdminDashboard({ allAgents, shifts, currentYear, currentMonth, isPublished, currentView, settings, rotationGroups, categories }: { 
  allAgents: { id: string, name: string, matricola: string, isUfficiale: boolean, email: string | null, phone: string | null, qualifica: string | null, gradoLivello: number, squadra: string | null, massimale: number, defaultServiceCategoryId?: string | null, defaultServiceTypeId?: string | null, rotationGroupId?: string | null }[], 
  shifts: { userId: string, date: Date | string, type: string, repType: string | null }[], 
  currentYear: number, 
  currentMonth: number, 
  isPublished: boolean, 
  currentView?: string, 
  settings?: { massimaleAgente: number, massimaleUfficiale: number },
  rotationGroups?: any[],
  categories?: any[]
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [isTogglingUff, setIsTogglingUff] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [isSavingCell, setIsSavingCell] = useState(false)
  const [recalcAgent, setRecalcAgent] = useState<string | null>(null)
  const [showAnagrafica, setShowAnagrafica] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingAgent, setEditingAgent] = useState<string | null>(null)
  const [tempEmail, setTempEmail] = useState("")
  const [tempPhone, setTempPhone] = useState("")
  const [tempName, setTempName] = useState("")
  const [tempMatricola, setTempMatricola] = useState("")
  const [tempSquadra, setTempSquadra] = useState("")
  const [tempRotationGroup, setTempRotationGroup] = useState("")
  const [tempDefaultCategoryId, setTempDefaultCategoryId] = useState("")
  const [tempDefaultTypeId, setTempDefaultTypeId] = useState("")
  const [tempMassimale, setTempMassimale] = useState(8)
  const [newPass, setNewPass] = useState("")
  const [showAddUser, setShowAddUser] = useState(false)
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSendingPec, setIsSendingPec] = useState(false)
  const [sortConfig, setSortConfig] = useState<{key: 'name'|'repTotal', dir: 'asc'|'desc'} | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL"|"UFF"|"AGT">("ALL")
  
  // Anagrafica advanced filters
  const [anagSearchQuery, setAnagSearchQuery] = useState("")
  const [anagSquadraFilter, setAnagSquadraFilter] = useState("ALL")
  const [anagQualificaFilter, setAnagQualificaFilter] = useState("ALL")

  // Audit Log
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)

  // Verbatel Sync
  const [showVerbatelSync, setShowVerbatelSync] = useState(false)
  const [verbatelTestMode, setVerbatelTestMode] = useState(true)
  const [verbatelScript, setVerbatelScript] = useState("")
  const [isLoadingVerbatel, setIsLoadingVerbatel] = useState(false)

  // Emergency Alert
  const [isSendingAlert, setIsSendingAlert] = useState(false)

  // Shift Swap Approvals
  const [showSwapApprovals, setShowSwapApprovals] = useState(false)
  const [pendingSwaps, setPendingSwaps] = useState<any[]>([])
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false)
  const [importType, setImportType] = useState<"base" | "rep">("base")

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
    } catch (err) {
      console.error(err)
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
    if (tType && isBlocked(tType)) {
      warningMsg = `Attenzione: l'agente ha un'assenza registrata oggi (${tType}). La reperibilità NON dovrebbe essere assegnata.`
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
    } catch (err) {
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
        const data = await res.json()
        setAuditLogs(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingAudit(false)
    }
  }
  const fetchPendingSwaps = async () => {
    setIsLoadingSwaps(true)
    try {
      const res = await fetch("/api/admin/pending-swaps")
      if (res.ok) {
        const data = await res.json()
        setPendingSwaps(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingSwaps(false)
    }
  }

  const handleApproveSwap = async (swapId: string) => {
    if (!confirm("Confermi l'approvazione finale di questo scambio? Il turno verrà aggiornato automaticamente in griglia.")) return
    try {
      const res = await fetch("/api/admin/approve-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swapId })
      })
      if (res.ok) {
        toast.success("Scambio approvato e griglia aggiornata!")
        fetchPendingSwaps()
        router.refresh()
      } else {
        toast.error("Errore durante l'approvazione")
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
    } catch (err) {
      toast.error("Errore durante la generazione dello script per Verbatel.")
    } finally {
      setIsLoadingVerbatel(false)
    }
  }

  const handleGenerateShifts = async () => {
    if (!confirm("Attenzione: confermi di voler generare MENSILMENTE le reperibilità? Questa operazione ricalcolerà tutti i riposi e i turni mancanti.")) return
    setIsGenerating(true)
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear })
      })
      if (!res.ok) throw new Error("Generate API failed")
      router.refresh()
    } catch {
      toast.error("Errore durante la generazione")
    } finally {
      setIsGenerating(false)
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
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })
        let headerRowIndex = -1
        let isVerbatelFormat = false
        let isReperibilitaFormat = false

        for (let r = 0; r < Math.min(data.length, 10); r++) {
          const row = data[r]
          if (Array.isArray(row)) {
            const rowStr = row.join(" ").toLowerCase()
            if (rowStr.includes("matricola")) {
              headerRowIndex = r
              isVerbatelFormat = true
              break
            } else if (rowStr.includes("nominativo")) {
              headerRowIndex = r
              isReperibilitaFormat = true
              break
            }
          }
        }

        const shiftsData: any[] = []
        const ignoreKeywords = ["AGENTE", "ISTRUTTORE", "UFFICIALE", "SOVRINTENDENTE", "ASSISTENTE", "VICE", "CAPITANO", "TENENTE"]

        const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 3
        const colOffset = isVerbatelFormat ? 4 : (isReperibilitaFormat ? 1 : 2)

        for (let r = startRow; r < data.length; r++) {
          const rowData = data[r]
          if (!rowData) continue
          
          let rawName = ""
          let matricola = ""

          if (isVerbatelFormat) {
            rawName = rowData[0]?.toString().trim().toUpperCase() || ""
            matricola = rowData[1]?.toString().trim() || ""
          } else {
            rawName = rowData[0]?.toString().trim().toUpperCase() || ""
            // Se è il formato Reperibilità classico, il nome è a Colonna 0, turni da 1
          }

          if (!rawName || ignoreKeywords.some(kw => rawName === kw) || rawName.startsWith("TOTALE")) continue

          for (let d = 1; d <= 31; d++) {
            const shiftType = rowData[d + colOffset - 1]?.toString().trim()
            if (shiftType) {
              const dateObj = new Date(Date.UTC(currentYear, currentMonth - 1, d))
              if (dateObj.getMonth() === currentMonth - 1) { 
                shiftsData.push({
                  name: rawName,
                  matricola: matricola,
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

      } catch (err) {
        setUploadStatus(`❌ ${err instanceof Error ? err.message : "Errore lettura Excel"}`)
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
    allAgents.forEach(agent => {
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
    const ufficiali = allAgents.filter(a => a.isUfficiale)
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
      const repTotal = shifts.filter(s => s.userId === ag.id && s.repType?.toUpperCase().includes("REP")).length
      return { ...ag, repTotal }
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

    if (sortConfig) {
      list.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.dir === 'asc' ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.dir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [allAgents, shifts, sortConfig, searchQuery, roleFilter])

  const filteredAnagraficaAgents = useMemo(() => {
    let list = allAgents.map(ag => {
      const repTotal = shifts.filter(s => s.userId === ag.id && s.repType?.toUpperCase().includes("REP")).length
      return { ...ag, repTotal }
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
  }, [allAgents, shifts, anagSearchQuery, anagSquadraFilter, anagQualificaFilter])

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
          <p className="text-sm text-slate-500">Gestione turni e importazione per l'intero anno</p>
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
                title="Rimuovi l'ordinamento in corso per sbloccare la lista"
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
              <UploadCloud size={16} />
              Importa Turni
            </button>
            <button 
              onClick={() => { setImportType("rep"); setTimeout(() => fileInputRef.current?.click(), 10) }}
              className="flex items-center gap-2 hover:bg-white text-purple-700 px-3 py-1.5 rounded-md text-sm font-semibold transition-all shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]"
              title="Importa il file con scritto 'REP' generato dal gestionale"
            >
              <UploadCloud size={16} />
              Importa Reperibilità
            </button>
            <button
              onClick={() => alert("FORMATO EXCEL RICHIESTO:\n\n- Riga 1, 2 e 3: Intestazioni (vengono ignorate)\n- Riga 4 in poi: Inizia la lista degli Agenti\n\nColonne:\n- Colonna A: Vuota o ininfluente\n- Colonna B: NOME AGENTE (es. MARIO ROSSI)\n- Colonna C: Giorno 1 del mese (es. scrivi F, M, REP, ecc)\n- Colonna D: Giorno 2\n- ...fino alla Colonna AG (Giorno 31)\n\nNota: Il sistema riconosce automaticamente se si tratta di turni o reperibilità. Le celle vuote vengono ignorate e non cancellano i dati già presenti.")}
              className="flex items-center justify-center w-8 hover:bg-white text-slate-400 hover:text-blue-500 rounded-md transition-all shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]"
              title="Come deve essere formattato l'Excel?"
            >
              <HelpCircle size={16} />
            </button>
          </div>
          
          <div className="flex bg-red-50 rounded-lg p-1 border border-red-100">
            <button 
              disabled={isClearing}
              onClick={() => handleClear("base")}
              className="flex items-center gap-2 hover:bg-white text-red-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-50"
              title="Elimina solo i Turni Base (M, P, F, ecc.)"
            >
              <Trash2 size={14} />
              Reset Turni
            </button>
            <button 
              disabled={isClearing}
              onClick={() => handleClear("rep")}
              className="flex items-center gap-2 hover:bg-white text-red-600 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all disabled:opacity-50 border-l border-red-100"
              title="Elimina solo le Reperibilità (R)"
            >
              <Trash2 size={14} />
              Reset REP
            </button>
          </div>
          
          <Link 
            href="/admin/auto-compila"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-indigo-200"
          >
            <CalendarIcon size={18} />
            Pianificazione Mensile
          </Link>

          <Link 
            href="/admin/risorse"
            className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-amber-200"
          >
            <Users size={18} />
            Gestione Squadre
          </Link>

          <Link 
            href="/admin/ods"
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-blue-200"
          >
            <ClipboardList size={18} />
            Gestione Operativa
          </Link>

          <Link 
            href="/admin/stampa-ods"
            className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border border-purple-200"
          >
            <Printer size={18} />
            Stampa OdS
          </Link>

          <button 
            onClick={() => setShowAnagrafica(true)}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Users size={18} />
            Anagrafica
          </button>

          <button 
            onClick={() => { setShowAuditLog(true); fetchAuditLogs() }}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <RefreshCw size={18} className={isLoadingAudit ? "animate-spin" : ""} />
            Log Attività
          </button>

          <button 
            onClick={() => { setShowSwapApprovals(true); fetchPendingSwaps() }}
            className="group relative flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-100 transition-all border border-amber-200"
          >
            <RefreshCw size={18} className={isLoadingSwaps ? "animate-spin" : ""} />
            Scambi
            {pendingSwaps.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                {pendingSwaps.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md"
          >
            <Settings size={18} />
            Impostazioni
          </button>

          <button 
            disabled={isGenerating || isPublishing}
            onClick={handlePublish}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 ${isPublished ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
            title={isPublished ? "Nascondi questo mese agli agenti" : "Rendi questo mese visibile agli agenti"}
          >
            {isPublished ? (
              <><EyeOff size={18} /> Nascondi Mese</>
            ) : (
              <><Eye size={18} /> Pubblica Mese</>
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
              } catch (err) {
                setUploadStatus(`❌ ${err instanceof Error ? err.message : "Errore Invio PEC"}`)
              } finally {
                setIsSendingPec(false)
                setTimeout(() => setUploadStatus(""), 6000)
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
            title="Invia il Riepilogo Reperibilità a tutti via Email Certificata"
          >
            <Mail size={18} />
            Invia PEC Personale
          </button>
          
          <button 
            onClick={() => { setShowVerbatelSync(true); setVerbatelScript(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500 hover:shadow-md active:scale-95"
            title="Esporta i turni su Verbatel in automatico"
          >
            <RefreshCw size={18} />
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
              } catch (err: any) {
                toast.error(err.message || 'Errore Telegram')
              } finally {
                setIsSendingAlert(false)
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-5 py-2 rounded-xl text-sm font-black transition-all shadow-lg shadow-red-500/30 active:scale-95 disabled:opacity-50 hover:shadow-xl"
            title="Invia allerta immediata via Telegram ai reperibili di oggi"
          >
            {isSendingAlert ? (
              <><RefreshCw size={18} className="animate-spin" /> Invio in corso...</>
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
              } catch (err) {
                setUploadStatus(`❌ ${err instanceof Error ? err.message : "Errore"}`)
              } finally {
                setIsGenerating(false)
                setTimeout(() => setUploadStatus(""), 8000)
              }
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {isGenerating ? "⚙️ Generazione in corso..." : (
              <>
                <Play size={18} fill="currentColor" />
                Genera Reperibilità
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <CalendarIcon size={20} className="text-blue-600" />
              Tabellone Reperibilità — {currentMonthName} {currentYear}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{allAgents.length} agenti · {shifts.filter(s => s.repType?.includes("REP")).length} REP assegnate</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-200/50 rounded-xl p-1.5 border border-slate-300/50 shadow-sm items-center">
              <Link 
                href={`${pathname}?month=${prevMonth}&year=${prevYear}${currentView ? `&view=${currentView}` : ''}`} 
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                title="Mese precedente"
              >
                <ChevronLeft size={20} />
              </Link>
              
              <div className="flex items-center gap-1 px-2">
                <select 
                  value={currentMonth}
                  onChange={(e) => {
                    const m = e.target.value
                    router.push(`${pathname}?month=${m}&year=${currentYear}${currentView ? `&view=${currentView}` : ''}`)
                  }}
                  className="bg-transparent border-none text-sm font-black text-slate-800 focus:ring-0 cursor-pointer uppercase py-1"
                >
                  {monthNames.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select 
                  value={currentYear}
                  onChange={(e) => {
                    const y = e.target.value
                    router.push(`${pathname}?month=${currentMonth}&year=${y}${currentView ? `&view=${currentView}` : ''}`)
                  }}
                  className="bg-transparent border-none text-sm font-black text-slate-500 focus:ring-0 cursor-pointer py-1"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <Link 
                href={`${pathname}?month=${nextMonth}&year=${nextYear}${currentView ? `&view=${currentView}` : ''}`} 
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
                title="Mese successivo"
              >
                <ChevronRight size={20} />
              </Link>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-slate-700 tracking-wide uppercase">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>REP</span>
              <span className="flex items-center gap-1.5" title="Reperibilità fissa importata da gestionale/Excel"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] border border-purple-700"></span>REP Fissa</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span>Turno</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></span>Assenza</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm"></span>Riposo</span>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={handleExportExcel} className="text-sm text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:bg-white px-3 py-1.5 rounded-md transition-all border border-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]">
                <FileDown size={14} />
                Generale
              </button>
              <button onClick={handleExportUfficialiExcel} className="text-sm text-slate-600 hover:text-slate-800 font-bold flex items-center gap-1 hover:bg-white px-3 py-1.5 rounded-md transition-all border border-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.05)_inset]">
                <FileDown size={14} />
                Ufficiali
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

            return (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th 
                      className="p-2 text-left font-bold text-slate-700 w-44 min-w-[176px] sticky left-0 z-20 bg-slate-100 border-b-2 border-r-2 border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors" 
                      rowSpan={2}
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center justify-between">
                        Agente
                        <span className="text-[10px] text-slate-400">{sortConfig?.key === 'name' ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                    {dayInfo.map((di, dIdx) => (
                      <th 
                        key={di.isNextMonth ? 'next-1' : di.day} 
                        className={`px-0.5 pt-2 pb-0 text-center font-bold border-b border-slate-200 min-w-[38px] ${di.isNextMonth ? "bg-slate-200 text-slate-400 opacity-60" : (di.isWeekend ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600")}`}
                        title={di.isNextMonth ? `1 ${monthNames[nextMonth - 1]} (Contesto)` : ""}
                      >
                        {di.isNextMonth ? '1*' : di.day}
                      </th>
                    ))}
                    <th className="px-1 pt-2 pb-0 text-center font-bold bg-purple-50 text-purple-700 border-b border-l-2 border-slate-300 min-w-[34px]" rowSpan={2} title="Reperibilità nei giorni Festivi e Weekend">
                      <div className="flex flex-col items-center justify-center leading-none">
                        FEST
                      </div>
                    </th>
                    <th className="px-1 pt-2 pb-0 text-center font-bold bg-blue-50 text-blue-700 border-b border-slate-200 min-w-[34px]" rowSpan={2} title="Reperibilità nei giorni Feriali">
                      <div className="flex flex-col items-center justify-center leading-none">
                        FER
                      </div>
                    </th>
                    <th 
                      className="px-2 pt-2 pb-0 text-center font-bold bg-emerald-50 text-emerald-700 border-b border-l-2 border-slate-300 min-w-[44px] cursor-pointer hover:bg-emerald-100 transition-colors" 
                      rowSpan={2}
                      onClick={() => toggleSort('repTotal')}
                    >
                      <div className="flex flex-col items-center justify-center leading-none">
                        REP
                        <span className="text-[8px] opacity-70 mt-1">{sortConfig?.key === 'repTotal' ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </div>
                    </th>
                  </tr>
                  <tr>
                    {dayInfo.map((di, dIdx) => (
                      <th 
                        key={di.isNextMonth ? 'next-dow-1' : `dow-${di.day}`} 
                        className={`px-0.5 pb-1.5 pt-0 text-center font-medium text-[9px] border-b-2 border-slate-300 ${di.isNextMonth ? "bg-slate-100 text-slate-300 opacity-60" : (di.isWeekend ? "bg-red-50 text-red-400" : "bg-slate-50 text-slate-400")}`}
                      >
                        {di.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.length === 0 ? (
                    <tr>
                      <td colSpan={daysInMonth + 2} className="p-12 text-center text-slate-400 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          <CalendarIcon size={40} className="text-slate-300" />
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
                          if (shift?.repType?.toLowerCase().includes("rep")) {
                            repDays.push(di.day)
                            if (di.isWeekend) repFest++
                            else repFer++
                          }
                        })

                        return (
                          <tr key={agent.id} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/30 transition-colors`}>
                            <td className={`px-2 py-1 font-semibold sticky left-0 z-10 border-r-2 border-slate-200 whitespace-nowrap text-[11px] ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"} ${agent.isUfficiale ? "text-blue-700" : "text-slate-800"}`}>
                              <div className="flex items-center gap-1 group/name">
                                <button 
                                  onClick={() => handleToggleUff(agent.id)}
                                  disabled={isTogglingUff === agent.id}
                                  className={`transition-all ${isTogglingUff === agent.id ? "animate-spin" : ""}`}
                                  title={agent.isUfficiale ? "Rimuovi stato Ufficiale" : "Imposta come Ufficiale"}
                                >
                                  {agent.isUfficiale ? (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-bold hover:bg-red-100 hover:text-red-700 hover:border-red-200 transition-colors cursor-pointer" title="Rimuovi stato Ufficiale">UFF</span>
                                  ) : (
                                    <span className="text-[10px] bg-slate-100 text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 font-bold hover:bg-blue-100 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer" title="Imposta come Ufficiale">AGT</span>
                                  )}
                                </button>
                                <div className="flex items-center gap-1 group/recalc">
                                  <span className="truncate max-w-[120px]">{agent.name}</span>
                                  <button 
                                    onClick={() => handleRecalcAgent(agent.id)}
                                    className="p-1 hover:bg-blue-100 rounded-full text-blue-600 opacity-0 group-hover/recalc:opacity-100 transition-opacity"
                                    title="Ricalcola Reperibilità per questo agente"
                                  >
                                    <RefreshCw size={10} className={recalcAgent === agent.id ? "animate-spin" : ""} />
                                  </button>
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
                                  key={di.isNextMonth ? 'next-cell-1' : di.day}
                                  className={`px-0 py-0.5 text-center border-r border-slate-100 transition-all group/cell ${cellBg} ${di.isNextMonth ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-inset"}`}
                                  onClick={() => {
                                    if (di.isNextMonth) {
                                      toast.error("Giorno di sola lettura (Mese successivo)");
                                      return;
                                    }
                                    openCellEditor(agent.id, agent.name, di.day, rType || sType || "");
                                  }}
                                >
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    {badge ? (
                                      <div className={`mx-auto w-[34px] h-[22px] flex items-center justify-center rounded text-[9px] leading-none ${badgeClass}`}>
                                        {badge}
                                      </div>
                                    ) : null}
                                    {/* Small indicator if there's an underlying base shift hidden by REP */}
                                    {rType && sType && (
                                      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-bl-sm opacity-50" title={`Base: ${sType}`}></div>
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
                      {/* Ripetizione Header Date */}
                      <tr>
                        <td className="p-2 border-r-2 border-b-2 border-slate-300 text-right text-[10px] font-bold text-slate-400 bg-slate-50 uppercase shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)]">Riepilogo Giorni &rarr;</td>
                        {dayInfo.map(di => (
                          <td key={`bot-header-${di.day}`} className={`px-0.5 pt-2 pb-1 text-center font-bold text-[10px] border-b-2 border-slate-300 min-w-[38px] shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)] ${di.isWeekend ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>
                            {di.day}<br/>
                            <span className="font-medium text-[8px]">{di.name}</span>
                          </td>
                        ))}
                        <td className="bg-slate-50 border-b-2 border-l-2 border-slate-300 shadow-[inset_0_4px_6px_-6px_rgba(0,0,0,0.1)]"></td>
                      </tr>
                      {/* Daily totals row */}
                      <tr className="bg-slate-100 border-t-2 border-slate-400">
                        <td className="px-2 py-2 font-black text-slate-800 sticky left-0 z-10 bg-slate-100 border-r-2 border-slate-300 text-[11px]">
                          TOTALE GIORNO
                        </td>
                        {dayInfo.map(di => {
                          const targetDate = new Date(Date.UTC(currentYear, di.isNextMonth ? currentMonth : currentMonth - 1, di.day)).toISOString()
                          const dailyShifts = shifts.filter(s => s.repType?.includes("REP") && new Date(s.date).toISOString() === targetDate)
                          const count = dailyShifts.length
                          const isLow = count > 0 && count < 7
                          const isGood = count >= 7 && count <= 8
                          const isBad = count > 8

                          const agentsOnCall = dailyShifts.map(s => {
                            const a = allAgents.find(ag => ag.id === s.userId)
                            return a ? `${a.name}${a.isUfficiale ? ' (UFF)' : ''}` : 'Ignoto'
                          }).join('\n')

                          return (
                            <td 
                              key={di.isNextMonth ? `next-tot-1` : `tot-${di.day}`} 
                              className={`px-0 py-1.5 text-center font-black text-sm cursor-help hover:opacity-80 transition-opacity ${di.isNextMonth ? "opacity-30" : ""} ${isGood ? "bg-emerald-100 text-emerald-700" : isLow ? "bg-amber-100 text-amber-700" : isBad ? "bg-red-100 text-red-700" : ""}`}
                              title={agentsOnCall ? `In turno il ${di.day}:\n${agentsOnCall}` : "Nessuno in turno"}
                            >
                              {count || ""}
                            </td>
                          )
                        })}
                        <td className="px-2 py-1.5 text-center font-black text-emerald-800 border-l-2 border-slate-300 bg-emerald-100 text-sm">
                          {shifts.filter(s => s.repType?.includes("REP")).length}
                        </td>
                      </tr>
                      {/* Officers daily totals row */}
                      <tr className="bg-slate-50 border-t border-slate-300">
                        <td className="px-2 py-2 font-black text-blue-800 sticky left-0 z-10 bg-slate-50 border-r-2 border-slate-300 text-[10px]">
                          di cui UFFICIALI
                        </td>
                        {dayInfo.map(di => {
                          const targetDate = new Date(Date.UTC(currentYear, currentMonth - 1, di.day)).toISOString()
                          const dailyRepShifts = shifts.filter(s => s.repType?.includes("REP") && new Date(s.date).toISOString() === targetDate)
                          const countUff = dailyRepShifts.filter(s => {
                            const agent = allAgents.find(a => a.id === s.userId)
                            return agent?.isUfficiale
                          }).length
                          
                          const isZero = countUff === 0

                          // Find highest-ranking substitute when no officer
                          let substituteInfo = ""
                          if (isZero && dailyRepShifts.length > 0) {
                            const agentsOnCall = dailyRepShifts.map(s => allAgents.find(a => a.id === s.userId)).filter(Boolean)
                            if (agentsOnCall.length > 0) {
                              const highest = agentsOnCall.reduce((best, curr) => 
                                (curr!.gradoLivello < best!.gradoLivello) ? curr : best
                              )
                              if (highest) {
                                substituteInfo = `${highest.name} (${highest.qualifica || 'N/D'})`
                              }
                            }
                          }

                          return (
                            <td 
                              key={di.isNextMonth ? `next-uff-1` : `uff-${di.day}`} 
                              className={`px-0 py-1.5 text-center font-black text-xs cursor-help ${di.isNextMonth ? "opacity-30" : ""} ${
                                isZero 
                                  ? (substituteInfo 
                                    ? "bg-yellow-400 text-yellow-900 shadow-[0_0_10px_rgba(250,204,21,0.5)_inset]" 
                                    : "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)_inset]") 
                                  : "bg-blue-100 text-blue-700"
                              }`} 
                              title={isZero 
                                ? (substituteInfo 
                                  ? `NESSUN UFFICIALE!\nSostituto più alto in grado:\n⭐ ${substituteInfo}` 
                                  : "NESSUN UFFICIALE E NESSUN REPERIBILE!") 
                                : `${countUff} ufficiale/i in turno`}
                            >
                              {isZero ? (substituteInfo ? "⚠" : "0") : countUff}
                            </td>
                          )
                        })}
                        <td className="px-2 py-1.5 text-center font-black text-blue-800 border-l-2 border-slate-300 bg-blue-100 text-sm">
                          {shifts.filter(s => {
                            if(!s.repType?.includes("REP")) return false;
                            const agent = allAgents.find(a => a.id === s.userId)
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingCell(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Modifica Cella</h3>
                <p className="text-blue-100 text-xs mt-0.5">{editingCell.agentName} — Giorno {editingCell.day}</p>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {editingCell.warningMsg && (
              <div className="mx-5 mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 shadow-sm">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{editingCell.warningMsg}</p>
              </div>
            )}

            <div className="p-5">
              <p className="text-xs text-slate-500 mb-3">Valore attuale: <strong>{editingCell.currentType || "(vuoto)"}</strong></p>

              <div className="text-xs font-semibold text-slate-600 mb-2">Inserimento rapido:</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {["REP", "F", "M", "104", "RR", "RP", "FERIE", "MALATTIA", "CS"].map(code => (
                  <button
                    key={code}
                    disabled={isSavingCell}
                    onClick={() => saveCellEdit(code)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {code}
                  </button>
                ))}
              </div>

              <div className="text-xs font-semibold text-slate-600 mb-2">Oppure scrivi manualmente:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value.toUpperCase())}
                  placeholder="Es: P14, M7, REP 22-07"
                  className="flex-1 border-2 border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveCellEdit(editValue) }}
                />
                <button
                  onClick={() => saveCellEdit(editValue)}
                  disabled={isSavingCell}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  Salva
                </button>
              </div>

              <button
                onClick={() => saveCellEdit("")}
                disabled={isSavingCell}
                className="mt-3 w-full flex items-center justify-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                <Trash2 size={14} />
                Cancella valore (svuota cella)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === ANAGRAFICA MODAL === */}
      {showAnagrafica && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 lg:p-6" onClick={() => setShowAnagrafica(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-800 px-6 py-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-xl flex items-center gap-2"><Users size={22} className="text-blue-400" /> Anagrafica Personale</h2>
                <p className="text-slate-400 text-xs mt-1">Gestisci i recapiti e le credenziali degli agenti. Le email sono necessarie per la ricezione delle PEC.</p>
              </div>
              <button onClick={() => setShowAnagrafica(false)} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap gap-4 items-center shrink-0">
              <input 
                type="text" 
                placeholder="Cerca matr. o nome..." 
                value={anagSearchQuery}
                onChange={e => setAnagSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-medium w-48"
              />
              <select
                value={anagSquadraFilter}
                onChange={e => setAnagSquadraFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-semibold cursor-pointer max-w-[180px]"
              >
                <option value="ALL">Tutte le Squadre</option>
                {uniqueSquadre.map(sq => (
                  <option key={sq} value={sq}>{sq}</option>
                ))}
              </select>
              <select
                value={anagQualificaFilter}
                onChange={e => setAnagQualificaFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-semibold cursor-pointer max-w-[180px]"
              >
                <option value="ALL">Tutte le Qualifiche</option>
                {uniqueQualifiche.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
              <div className="ml-auto text-xs font-bold text-slate-500">
                {filteredAnagraficaAgents.length} {filteredAnagraficaAgents.length === 1 ? 'risultato' : 'risultati'}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold">Matr.</th>
                      <th className="px-6 py-4 font-bold">Agente</th>
                      <th className="px-6 py-4 font-bold">Squadra</th>
                      <th className="px-6 py-4 font-bold">Qualifica</th>
                      <th className="px-6 py-4 font-bold">REP / Max</th>
                      <th className="px-6 py-4 font-bold">Email (PEC)</th>
                      <th className="px-6 py-4 text-right font-bold">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Add User Row */}
                    <tr className="bg-blue-50/50">
                      <td colSpan={7} className="px-6 py-4 bg-slate-50/50">
                         <button 
                            onClick={() => setShowAddUser(!showAddUser)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm transition-all ${showAddUser ? 'text-slate-600 bg-slate-200' : 'text-blue-700 bg-blue-100 hover:bg-blue-200 shadow-sm'}`}
                         >
                            <Plus size={18} /> {showAddUser ? "Chiudi Inserimento" : "Aggiungi Nuovo Dipendente"}
                         </button>
                      </td>
                    </tr>
                    {showAddUser && (
                      <tr className="bg-blue-50/80 animate-in fade-in slide-in-from-top-1 border-b-2 border-blue-200">
                        <td className="px-6 py-6">
                          <label className="block text-[9px] font-black text-blue-700 uppercase mb-1 tracking-tighter">Matricola</label>
                          <input type="text" placeholder="Es. 123" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="border-2 border-blue-300 rounded-lg px-2 py-1.5 w-24 text-sm font-black text-black focus:border-blue-500 outline-none" />
                        </td>
                        <td className="px-6 py-6">
                          <label className="block text-[9px] font-black text-blue-700 uppercase mb-1 tracking-tighter">Nome Completo</label>
                          <input type="text" placeholder="COGNOME NOME" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="border-2 border-blue-300 rounded-lg px-2 py-1.5 w-56 text-sm font-black text-black focus:border-blue-500 outline-none" />
                        </td>
                        <td className="px-6 py-6">
                          <label className="block text-[9px] font-black text-blue-700 uppercase mb-1 tracking-tighter">Squadra</label>
                          <input type="text" placeholder="Es. SQUADRA A" value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} className="border-2 border-blue-300 rounded-lg px-2 py-1.5 w-32 text-sm font-black text-black focus:border-blue-500 outline-none" />
                        </td>
                        <td className="px-6 py-6 text-xs text-slate-500 italic font-bold">Predefinito</td>
                        <td className="px-6 py-6">
                          <label className="block text-[9px] font-black text-blue-700 uppercase mb-1 tracking-tighter">Max REP</label>
                          <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="border-2 border-blue-300 rounded-lg px-2 py-1.5 w-16 text-sm font-black text-black focus:border-blue-500 outline-none" />
                        </td>
                        <td className="px-6 py-6">
                            <label className="block text-[9px] font-black text-blue-700 uppercase mb-1 tracking-tighter">Password Iniziale</label>
                            <input type="password" placeholder="Min. 6 car." value={newPass} onChange={e => setNewPass(e.target.value)} className="border-2 border-blue-300 rounded-lg px-2 py-1.5 w-40 text-sm font-black text-black focus:border-blue-500 outline-none" />
                        </td>
                        <td className="px-6 py-6 text-right align-bottom">
                           <button 
                            disabled={isSavingUser || !tempMatricola || !tempName || !newPass}
                            onClick={async () => {
                              setIsSavingUser(true)
                              const res = await fetch('/api/admin/users', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ matricola: tempMatricola, name: tempName, squadra: tempSquadra, massimale: tempMassimale, password: newPass })
                              })
                              if (res.ok) {
                                setShowAddUser(false)
                                setTempMatricola(""); setTempName(""); setTempSquadra(""); setNewPass("")
                                router.refresh()
                              } else {
                                const d = await res.json()
                                toast.error(d.error || "Errore creazione")
                              }
                              setIsSavingUser(false)
                            }}
                            className="bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-black transition-all shadow-md disabled:opacity-50"
                           >SALVA ORA</button>
                        </td>
                      </tr>
                    )}
                    {filteredAnagraficaAgents.map(agent => (
                      <tr key={agent.id} className={`${editingAgent === agent.id ? 'bg-amber-50/80 border-y-2 border-amber-200 shadow-inner' : 'hover:bg-blue-50/30'} transition-all`}>
                        <td className="px-6 py-4">
                          {editingAgent === agent.id ? (
                            <>
                              <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Matricola</label>
                              <input type="text" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-24 text-sm font-black text-black outline-none focus:border-amber-500" />
                            </>
                          ) : (
                            <span className="text-xs font-mono text-black font-black">{agent.matricola}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-black text-black">
                          {editingAgent === agent.id ? (
                            <>
                              <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Agente</label>
                              <input type="text" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-48 text-sm font-black text-black outline-none focus:border-amber-500" />
                            </>
                          ) : (
                            <span className="text-sm">{agent.name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingAgent === agent.id ? (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              <div>
                                <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Turnazione Base</label>
                                <select value={tempRotationGroup} onChange={e => setTempRotationGroup(e.target.value)} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-full text-xs font-black text-black outline-none focus:border-amber-500 bg-white">
                                  <option value="">(Libero) Testo: {agent.squadra || ""}</option>
                                  {rotationGroups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Servizio di Default</label>
                                <select value={tempDefaultCategoryId} onChange={e => { setTempDefaultCategoryId(e.target.value); setTempDefaultTypeId(""); }} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-full text-[10px] font-black text-black mb-1 outline-none bg-white">
                                  <option value="">Nessun Servizio</option>
                                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                {tempDefaultCategoryId && (
                                  <select value={tempDefaultTypeId} onChange={e => setTempDefaultTypeId(e.target.value)} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-full text-[10px] font-black text-blue-700 outline-none bg-white">
                                    <option value="">Generico</option>
                                    {categories?.find(c => c.id === tempDefaultCategoryId)?.types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-[10px] bg-slate-100 text-black font-black px-2.5 py-1.5 rounded-lg tracking-tight uppercase border border-slate-300 shadow-sm">
                                {agent.rotationGroupId ? (rotationGroups?.find(g => g.id === agent.rotationGroupId)?.name || "Ignoto") : (agent.squadra || "Senza Squadra / Libero")}
                              </span>
                              {(agent.defaultServiceCategoryId) && (
                                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                   {categories?.find(c => c.id === agent.defaultServiceCategoryId)?.name}
                                   {agent.defaultServiceTypeId && ` ▶ ${categories?.find(c => c.id === agent.defaultServiceCategoryId)?.types.find((t: any) => t.id === agent.defaultServiceTypeId)?.name}`}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800 text-xs">
                          {agent.qualifica || 'Agente'} 
                          {agent.isUfficiale && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-widest shadow-sm">Ufficiale</span>}
                        </td>
                        <td className="px-6 py-4">
                          {editingAgent === agent.id ? (
                            <>
                              <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Massimale</label>
                              <input type="number" value={tempMassimale} onChange={e => setTempMassimale(parseInt(e.target.value))} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-16 text-sm font-black text-black outline-none focus:border-amber-500" />
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`font-black px-2.5 py-1 rounded-lg text-xs border ${agent.repTotal > agent.massimale ? 'bg-red-100 text-red-700 border-red-200' : agent.repTotal === agent.massimale ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-50 text-black border-slate-200'}`}>
                                {agent.repTotal} / {agent.massimale}
                              </span>
                              {agent.repTotal > agent.massimale && (
                                <span className="text-[10px] font-black text-red-600 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-lg">+{agent.repTotal - agent.massimale}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingAgent === agent.id ? (
                            <div className="flex flex-col gap-2">
                              <div>
                                <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Indirizzo Email (PEC)</label>
                                <input type="email" value={tempEmail} onChange={e => setTempEmail(e.target.value)} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-full max-w-[200px] text-sm font-black text-black outline-none focus:border-amber-500" placeholder="Email..." />
                              </div>
                              <div>
                                <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Telefono / Mobile</label>
                                <input type="tel" value={tempPhone} onChange={e => setTempPhone(e.target.value)} className="border-2 border-amber-300 rounded-lg px-2 py-1.5 w-full max-w-[180px] text-sm font-black text-black outline-none focus:border-amber-500" placeholder="Tel..." />
                              </div>
                              <div className="flex items-center gap-2 mt-2 pt-3 border-t-2 border-amber-200">
                                <div className="flex flex-col">
                                  <label className="block text-[9px] font-black text-amber-700 uppercase mb-1 tracking-tighter">Reset Password</label>
                                  <input type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Nuova Password" className="border-2 border-amber-400 rounded-lg px-2 py-1.5 text-xs font-black w-32 bg-white" />
                                </div>
                                <button onClick={async () => {
                                  if(!newPass) return toast.error("Inserisci una password")
                                  const res = await fetch('/api/admin/users', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId: agent.id, action: 'resetPassword', newPassword: newPass })})
                                  if(res.ok) { toast.success("Password aggiornata!"); setNewPass("") }
                                }} className="self-end text-[10px] font-black text-amber-800 bg-amber-100 px-4 py-2 rounded-lg border-2 border-amber-300 hover:bg-amber-200 transition-all uppercase">Reset</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className={agent.email ? "text-black text-xs font-black" : "text-slate-400 italic text-[10px]"}>{agent.email || "No Email"}</span>
                              <span className="text-slate-800 text-[10px] font-black">{agent.phone || "No Telefono"}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right align-middle">
                          {editingAgent === agent.id ? (
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => setEditingAgent(null)} className="text-xs font-black text-slate-700 hover:text-black px-4 py-2 bg-slate-200 rounded-xl border border-slate-300 transition-all">ANNULLA</button>
                              <button onClick={async () => {
                                const res = await fetch('/api/admin/users', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ userId: agent.id, name: tempName, matricola: tempMatricola, squadra: tempSquadra, rotationGroupId: tempRotationGroup || null, defaultServiceCategoryId: tempDefaultCategoryId || null, defaultServiceTypeId: tempDefaultTypeId || null, massimale: tempMassimale, email: tempEmail, phone: tempPhone })
                                })
                                if (res.ok) {
                                  setEditingAgent(null)
                                  router.refresh()
                                } else {
                                  toast.error("Errore durante il salvataggio")
                                }
                              }} className="text-xs font-black text-white hover:bg-black px-6 py-3 bg-emerald-700 rounded-xl shadow-lg transition-all border-2 border-emerald-800">SALVA MODIFICHE</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                onClick={() => {
                                  setEditingAgent(agent.id)
                                  setTempName(agent.name)
                                  setTempMatricola(agent.matricola)
                                  setTempSquadra(agent.squadra || "")
                                  setTempRotationGroup(agent.rotationGroupId || "")
                                  setTempDefaultCategoryId(agent.defaultServiceCategoryId || "")
                                  setTempDefaultTypeId(agent.defaultServiceTypeId || "")
                                  setTempMassimale(agent.massimale)
                                  setTempEmail(agent.email || "")
                                  setTempPhone(agent.phone || "")
                                  setNewPass("")
                                }} 
                                className="text-xs font-black text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-[12px] transition-all shadow-md hover:shadow-lg active:scale-95"
                              >
                                MODIFICA
                              </button>
                              <button 
                                onClick={async () => {
                                  if (!confirm(`Vuoi davvero eliminare l'agente ${agent.name}? Operazione irreversibile.`)) return
                                  const res = await fetch('/api/admin/users', {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: agent.id })
                                  })
                                  if (res.ok) router.refresh()
                                }} 
                                title="Elimina Dipendente"
                                className="p-2.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-[12px] transition-all border border-red-100 shadow-sm"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Area anagrafica nascosta qui... rimossa per spazio modal */}

      {/* Settings Panel Modal */}
      {showSettings && <SettingsPanel onClose={() => { setShowSettings(false); router.refresh() }} />}
      {/* MODALE AUDIT LOG */}
      {showAuditLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAuditLog(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-200 rounded-2xl">
                  <RefreshCw size={24} className="text-slate-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Registro Attività (Audit Log)</h2>
                  <p className="text-sm text-slate-500 font-medium">Ultime 100 azioni amministrative registrate</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditLog(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {isLoadingAudit ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw size={40} className="text-slate-300 animate-spin mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Caricamento registro...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-20 text-slate-400 italic">
                  Nessuna attività registrata nel sistema.
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            log.action.includes("DELETE") ? "bg-red-100 text-red-700" :
                            log.action.includes("CREATE") || log.action.includes("ADD") ? "bg-emerald-100 text-emerald-700" :
                            log.action.includes("UPDATE") || log.action.includes("EDIT") ? "bg-blue-100 text-blue-700" :
                            "bg-slate-200 text-slate-700"
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-xs font-bold text-slate-900">da {log.adminName || 'Admin'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {new Date(log.createdAt).toLocaleString("it-IT", { 
                            day: '2-digit', month: '2-digit', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium mb-1">{log.details}</p>
                      {log.targetName && (
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                          Target: <span className="text-slate-700">{log.targetName}</span> (ID: {log.targetId?.slice(0,8)}...)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE VERBATEL SYNC */}
      {showVerbatelSync && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowVerbatelSync(false)} />
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-orange-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-200 rounded-2xl">
                  <RefreshCw size={24} className="text-orange-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-orange-900">Sincronizzazione Automatica Verbatel</h2>
                  <p className="text-sm text-orange-700/80 font-medium">Iniettare i turni di {currentMonth}/{currentYear} direttamente sul portale Verbatel</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVerbatelSync(false)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              
              <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-r-xl">
                <h3 className="font-bold text-orange-900 mb-2">Istruzioni d'uso:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-orange-800 font-medium">
                  <li>In un'altra scheda, apri il <strong>Portale Verbatel</strong> - Prospetto Reperibilità.</li>
                  <li>In alto a sinistra, imposta i filtri "Da... A..." in modo da includere l'intero mese <span className="font-bold uppercase text-orange-900 bg-orange-200 px-1 rounded">(Es. Da 01/{currentMonth}/{currentYear} a 01/{currentMonth + 1 === 13 ? 1 : currentMonth + 1}/{currentMonth + 1 === 13 ? currentYear + 1 : currentYear})</span>.</li>
                  <li>Ricarica la griglia con il pulsante verde Verbatel con le due freccette. Clicca col destro in un punto vuoto → ispeziona → Console.</li>
                  <li>Genera lo script (qui sotto), <strong>copialo</strong>, poi vai sulla console di Verbatel, incollalo e premi <strong>Invio</strong>. Non muovere il mouse finché non ha finito.</li>
                </ol>
              </div>

              <div className="bg-slate-100 p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={verbatelTestMode} onChange={(e) => setVerbatelTestMode(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-600" />
                    <span className="font-bold text-slate-800">Modalità Test di Sicurezza (Inserisce i turni solo per 1 Agente)</span>
                  </label>
                  <button 
                    onClick={generateVerbatelScript}
                    disabled={isLoadingVerbatel}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95 transition-all w-fit disabled:opacity-50"
                  >
                    {isLoadingVerbatel ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                    <span className="uppercase tracking-widest text-xs">Genera Script</span>
                  </button>
                </div>

                {verbatelScript && (
                  <div className="relative mt-2">
                    <textarea 
                      readOnly 
                      value={verbatelScript} 
                      className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-xl border-2 border-slate-800 focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="Il codice javascript apparirà qui..."
                    />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(verbatelScript); toast.success("Codice copiato negli appunti! Ora incollalo in Verbatel."); }}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      COPIA NEGLI APPUNTI
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {/* Modal Richieste Scambio */}
      {showSwapApprovals && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSwapApprovals(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Approvazione Scambi</h3>
                  <p className="text-amber-100 text-xs font-bold uppercase tracking-widest opacity-80">Richieste in attesa di autorizzazione</p>
                </div>
              </div>
              <button onClick={() => setShowSwapApprovals(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {isLoadingSwaps ? (
                <div className="flex justify-center py-10">
                  <RefreshCw size={40} className="animate-spin text-slate-200" />
                </div>
              ) : pendingSwaps.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">Nessuna richiesta di scambio in attesa.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSwaps.map((swap: any) => (
                    <div key={swap.id} className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 hover:border-amber-200 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                           <p className="text-[10px] font-black uppercase text-slate-400">Data Turno</p>
                           <p className="font-black text-slate-800">{new Date(swap.shift.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</p>
                        </div>
                        <div className="h-10 w-[2px] bg-slate-100"></div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Proposta di Scambio</p>
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-slate-900">{swap.requester.name}</span>
                             <ChevronRight size={14} className="text-slate-400" />
                             <span className="font-extrabold text-blue-600">{swap.targetUser.name}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Tipo: <span className="text-emerald-600">{swap.shift.repType}</span></p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveSwap(swap.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-100 transition-all hover:scale-105 active:scale-95"
                        >
                          APPROVA
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-slate-50 p-6 border-t border-slate-100">
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                 ⚠️ L'approvazione sposta definitivamente la titolarità del turno nel calendario ufficiale. L'operazione non è reversibile automaticamente.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
