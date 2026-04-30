"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { isHoliday, isCalendarHoliday } from "@/utils/holidays"
import { AGENDA_CATEGORIES } from "@/utils/agenda-codes"
import { generatePlanningPDF, generateReperibilitaPDF } from "@/utils/pdf-generator"

export interface DashboardAgent {
  id: string;
  name: string;
  matricola: string;
  isUfficiale: boolean;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  qualifica: string | null;
  gradoLivello: number;
  squadra: string | null;
  massimale: number;
  dataAssunzione?: string | Date | null;
  scadenzaPatente?: string | Date | null;
  scadenzaPortoArmi?: string | Date | null;
  noteInterne?: string | null;
  repTotal: number;
}

export interface DashboardShift {
  id: string;
  userId: string;
  date: Date | string;
  type: string;
  repType: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  adminName: string | null;
  createdAt: string | Date;
  details: string;
  targetName?: string | null;
  targetId?: string | null;
}

export interface PendingRequest {
  id: string;
  date: string | Date;
  endDate?: string | Date | null;
  user: { name: string };
  code: string;
  startTime?: string | null;
  endTime?: string | null;
  hours?: number | null;
  notes?: string | null;
}

export interface PendingSwap {
  id: string;
  shift: { date: string | Date; type: string };
  requester: { name: string };
  targetUser: { name: string };
}

export type EditingCell = { agentId: string; agentName: string; day: number; currentType: string; warningMsg?: string } | null

export function useAdminData(
  allAgents: DashboardAgent[],
  initialShifts: DashboardShift[],
  currentYear: number,
  currentMonth: number,
  tenantSlug: string | null,
  settings?: any,
  logoUrl?: string | null
) {
  const router = useRouter()
  const [shifts, setShifts] = useState<DashboardShift[]>(initialShifts)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [isTogglingUff, setIsTogglingUff] = useState<string | null>(null)
  const [isSavingCell, setIsSavingCell] = useState(false)
  const [recalcAgent, setRecalcAgent] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSendingPec, setIsSendingPec] = useState(false)
  const [isSendingAlert, setIsSendingAlert] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isCopyingMonth, setIsCopyingMonth] = useState(false)
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [isLoadingSwaps, setIsLoadingSwaps] = useState(false)
  const [verbatelScript, setVerbatelScript] = useState("")
  const [isLoadingVerbatel, setIsLoadingVerbatel] = useState(false)
  const [verbatelTestMode, setVerbatelTestMode] = useState(true)
  const [verbatelAgents, setVerbatelAgents] = useState<{agente: string, matricola: string, giorni: number[], shiftIds: string[]}[]>([])
  const [verbatelRawData, setVerbatelRawData] = useState<any>(null)
  const [verbatelSyncToken, setVerbatelSyncToken] = useState<string>("")

  // Reset Verbatel state when month/year change to avoid cross-month data confusion
  useEffect(() => {
    setVerbatelAgents([]);
    setVerbatelRawData(null);
    setVerbatelScript("");
  }, [currentMonth, currentYear]);

  // Sync shifts state when initialShifts prop changes (e.g. after navigation)
  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  // Memoized Helpers
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
  const currentMonthName = monthNames[currentMonth - 1]

  const dayInfo = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
    const info = Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1
      const date = new Date(currentYear, currentMonth - 1, d)
      const nextDate = new Date(currentYear, currentMonth - 1, d + 1)
      return { 
        day: d, 
        name: dayNames[date.getDay()], 
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isHoliday: isCalendarHoliday(date),
        isVigilia: isCalendarHoliday(nextDate),
        isNextMonth: false 
      }
    })
    // Add 1 day of next month for context
    const nextMonth1 = new Date(currentYear, currentMonth, 1)
    const nextMonth2 = new Date(currentYear, currentMonth, 2)
    info.push({ 
      day: 1, 
      name: dayNames[nextMonth1.getDay()], 
      isWeekend: nextMonth1.getDay() === 0 || nextMonth1.getDay() === 6,
      isHoliday: isCalendarHoliday(nextMonth1),
      isVigilia: isCalendarHoliday(nextMonth2),
      isNextMonth: true 
    })
    return info
  }, [currentYear, currentMonth])

  const [sortConfig, setSortConfig] = useState<{ field: string, direction: 'asc' | 'desc' }>({ 
    field: 'role', 
    direction: 'asc' 
  })

  const sortedAgents = useMemo(() => {
    return [...allAgents]
      .filter(agent => {
        // Nascondi agenti eliminati/archiviati (isActive: false)
        if (agent.isActive === false) return false

        const matchesSearch = (agent.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (agent.matricola || "").toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === "ALL" || (roleFilter === "UFF" && agent.isUfficiale) || (roleFilter === "AGT" && !agent.isUfficiale)
        return matchesSearch && matchesRole
      })
      .sort((a, b) => {
        const { field, direction } = sortConfig
        const modifier = direction === 'asc' ? 1 : -1

        if (field === 'role') {
          if (a.isUfficiale && !b.isUfficiale) return -1 * modifier
          if (!a.isUfficiale && b.isUfficiale) return 1 * modifier
          return (a.name || "").localeCompare(b.name || "")
        }

        if (field === 'name') {
           return (a.name || "").localeCompare(b.name || "") * modifier
        }

        if (field === 'matricola') {
           return (a.matricola || "").localeCompare(b.matricola || "") * modifier
        }

        if (field === 'rep') {
          // Conta reperibilità per agente 'a'
          const repA = shifts.filter(s => {
            if (s.userId !== a.id || !(s.repType || "").toLowerCase().includes("rep")) return false;
            const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
            const [y, m] = shiftDate.split('-').map(Number);
            return y === currentYear && m === currentMonth;
          }).length
          
          // Conta reperibilità per agente 'b'
          const repB = shifts.filter(s => {
            if (s.userId !== b.id || !(s.repType || "").toLowerCase().includes("rep")) return false;
            const shiftDate = typeof s.date === 'string' ? s.date.split('T')[0] : new Date(s.date).toISOString().split('T')[0];
            const [y, m] = shiftDate.split('-').map(Number);
            return y === currentYear && m === currentMonth;
          }).length

          return (repA - repB) * modifier
        }

        return 0
      })
  }, [allAgents, searchQuery, roleFilter, sortConfig, shifts, currentMonth])

  // Hydration-safe logic for today's reperibili
  const [todayReperibili, setTodayReperibili] = useState<{id: string, name: string}[]>([])
  useEffect(() => {
    const now = new Date()
    // Use Europe/Rome as per comandos production
    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Rome' }).format(now)
    const seen = new Set<string>()
    const found = shifts
      .filter((s: any) => {
        if (!s.repType) return false
        const dateStr = typeof s.date === 'string' ? s.date.slice(0, 10) : new Date(s.date).toISOString().slice(0, 10)
        return dateStr === todayStr
      })
      .filter((s: any) => {
        if (seen.has(s.userId)) return false
        seen.add(s.userId)
        return true
      })
      .map((s: any) => ({ 
        id: s.userId, 
        name: s.user?.name || allAgents.find((a: any) => a.id === s.userId)?.name || 'N/D' 
      }))
    setTodayReperibili(found)
  }, [shifts, allAgents])

  // Handlers
  const handleToggleUff = async (userId: string) => {
    setIsTogglingUff(userId)
    try {
      const res = await fetch("/api/admin/toggle-uff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Ruolo cambiato: ${data.isUfficiale ? 'Ufficiale' : 'Agente'}`)
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || "Errore modifica ruolo")
      }
    } catch (error) {
      toast.error("Errore di connessione")
    } finally {
      setIsTogglingUff(null)
    }
  }

  const handleSaveCellEdit = async (agentId: string, day: number, value: string, hours?: number) => {
    setIsSavingCell(true)
    let finalValue = value.trim()
    if (finalValue.toUpperCase() === "REP") { finalValue = "rep" } 
    else { finalValue = finalValue.toUpperCase() }

    const valueUpper = finalValue.toUpperCase()
    const isRep = valueUpper.includes("REP")
    const targetDateIso = new Date(Date.UTC(currentYear, currentMonth - 1, day)).toISOString()
    
    try {
      const res = await fetch('/api/admin/edit-shift', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: agentId,
          date: targetDateIso,
          type: isRep ? "rep_m" : finalValue
        })
      })
      if (!res.ok) throw new Error()
      
      // Se sono state specificate delle ore, crea anche una voce nell'agenda dell'operatore
      if (hours && hours > 0) {
        // Cerca il codice agenda corrispondente allo shortCode
        let agendaCode = finalValue
        for (const cat of AGENDA_CATEGORIES) {
          const item = cat.items.find((i: { shortCode: string; code: string }) => i.shortCode === finalValue)
          if (item) { agendaCode = item.code; break }
        }

        try {
          await fetch('/api/agenda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: agentId,
              date: targetDateIso,
              code: agendaCode,
              label: finalValue,
              hours: hours,
              note: `Inserito da Admin (${hours}h)`
            })
          })
        } catch {
          console.warn("[CELL EDIT] Errore creazione voce agenda ore, turno comunque salvato")
        }
      }
      
      // Aggiornamento ottimistico locale per evitare il "blink" visivo
      setShifts(prevShifts => {
        const next = [...prevShifts]
        const idx = next.findIndex(s => s.userId === agentId && (typeof s.date === 'string' ? s.date === targetDateIso : new Date(s.date).toISOString() === targetDateIso))
        
        if (idx !== -1) {
          if (isRep) next[idx] = { ...next[idx], repType: finalValue }
          else next[idx] = { ...next[idx], type: finalValue, repType: null }
        } else {
          // Se il turno non esisteva, lo creiamo in locale provvisoriamente
          next.push({
            id: `temp-${Date.now()}`,
            userId: agentId,
            date: targetDateIso,
            type: isRep ? "rep_m" : finalValue,
            repType: isRep ? finalValue : null
          })
        }
        return next
      })

      setEditingCell(null)
      const hoursMsg = hours ? ` (${hours}h)` : ''
      toast.success(`Turno aggiornato${hoursMsg}`)
      
      // Chiamata soft a Next.js per allineare il server senza ricaricare il browser
      router.refresh()
    } catch {
      toast.error("Errore nel salvataggio")
    } finally {
      setIsSavingCell(false)
    }
  }

  const handleBulkShiftEdit = async (updates: { userId: string, date: string, type: string, hours?: number }[]) => {
    setIsSavingCell(true)
    let successCount = 0
    let failCount = 0

    try {
      // Eseguiamo le chiamate in sequenza usando la stessa API
      // collaudata del salvataggio singolo, che gestisce correttamente
      // upsert, normalizzazione, REP vs turno base, e tenantId.
      for (const u of updates) {
        try {
          // Costruiamo la data ISO completa come fa handleSaveCellEdit
          const dateIso = u.date.includes('T') ? u.date : u.date + "T00:00:00.000Z"

          const res = await fetch('/api/admin/edit-shift', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: u.userId,
              date: dateIso,
              type: u.type
            })
          })
          if (res.ok) successCount++
          else failCount++
        } catch {
          failCount++
        }
      }

      if (failCount > 0) {
        toast.error(`${failCount} turni non salvati`)
      }
      if (successCount > 0) {
        // Aggiornamento ottimistico locale
        setShifts(prev => {
          const next = [...prev]
          const isRep = (t: string) => t.toLowerCase().includes("rep")
          updates.forEach(u => {
            const dateIso = u.date.includes('T') ? u.date : u.date + "T00:00:00.000Z"
            const idx = next.findIndex(s => {
              const sIso = (typeof s.date === 'string' ? s.date : new Date(s.date).toISOString())
              return s.userId === u.userId && sIso.split('T')[0] === u.date.split('T')[0]
            })
            if (idx !== -1) {
              if (isRep(u.type)) next[idx] = { ...next[idx], repType: u.type }
              else next[idx] = { ...next[idx], type: u.type.toUpperCase(), repType: null }
            } else {
              next.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                userId: u.userId,
                date: dateIso,
                type: isRep(u.type) ? "" : u.type.toUpperCase(),
                repType: isRep(u.type) ? u.type : null
              })
            }
          })
          return next
        })

        toast.success(`${successCount} turni aggiornati`)
        router.refresh()
      }
    } catch {
      toast.error("Errore nel salvataggio multiplo")
    } finally {
      setIsSavingCell(false)
    }
  }

  const handleRecalcAgent = async (agentId: string) => {
    setRecalcAgent(agentId)
    try {
      const res = await fetch("/api/admin/generate-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, month: currentMonth, year: currentYear })
      })
      if (res.ok) {
        window.location.reload()
      } else throw new Error()
    } catch {
      toast.error("Errore ricalcolo")
    } finally {
      setRecalcAgent(null)
    }
  }
  const handleFetchVerbatelData = async () => {
    setIsLoadingVerbatel(true)
    setVerbatelScript("")
    try {
      const res = await fetch(`/api/admin/verbatel-export?mese=${currentMonth}&anno=${currentYear}`)
      const resultObj = await res.json()
      if (!res.ok) throw new Error()
      
      const { data, syncToken } = resultObj;
      if (!Array.isArray(data)) throw new Error("Errore API Verbatel export")

      setVerbatelRawData(data);
      setVerbatelSyncToken(syncToken);
      setVerbatelAgents(data);
      toast.success(`${data.length} agenti caricati`)
    } catch (error) {
      console.error("Verbatel Export Error:", error)
      toast.error("Errore caricamento dati Verbatel")
    } finally {
      setIsLoadingVerbatel(false)
    }
  }

  const handleGenerateVerbatelScript = (selectedMatricole: string[]) => {
    if (!verbatelRawData || !verbatelSyncToken) return;

    try {
      const filteredData = verbatelRawData.filter((a: any) => selectedMatricole.includes(a.matricola));
      const turni = verbatelTestMode && filteredData.length > 0 ? [filteredData[0]] : filteredData;
      const portalUrl = window.location.origin;

      const scriptCode = `(async function() {
    const turniDaInserire = ${JSON.stringify(turni)};
    const syncToken = "${verbatelSyncToken}";
    const portalUrl = "${portalUrl}";
    const table = document.getElementById('tableProspetto');
    
    if(!table) return alert('Tabella Verbatel non trovata! Assicurati di essere nella pagina corretta (Prospetto Reperibilità).');
    
    console.log("%c🚀 AVVIO SINCRONIZZAZIONE VERBATEL 2.0", "color: #ff6600; font-size: 16px; font-weight: bold;");
    console.log("%cModalità: " + (${verbatelTestMode} ? "TEST (1 Agente)" : "MASSIVA (" + turniDaInserire.length + " Agenti)"), "color: #666; font-style: italic;");

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

    let modificheTotali = 0;
    const reportFinal = [];
    const rows = table.querySelectorAll('tbody tr');

    for(const [index, turno] of turniDaInserire.entries()) {
        console.log("%c\\n[" + (index+1) + "/" + turniDaInserire.length + "] Elaborazione: " + turno.agente, "color: #2196f3; font-weight: bold;");
        
        let row = null;
        for(let r of rows) {
            const nomCell = r.querySelector('th.nominativo');
            if(nomCell && nomCell.innerHTML.includes(turno.matricola)) {
                row = r; break;
            }
        }

        if(!row) { 
            console.warn("   ❌ Agente non trovato in griglia Verbatel: " + turno.matricola); 
            reportFinal.push({ agente: turno.agente, stato: "ERRORE: Non trovato in griglia" });
            continue; 
        }

        let agentModifications = 0;
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

            cell.style.border = '2px solid #ff6600';
            const rect = cell.getBoundingClientRect();
            const cx = rect.left + (rect.width / 2);
            const cy = rect.top + (rect.height / 2);
            const mouseOpts = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, screenX: cx, screenY: cy };
            
            cell.dispatchEvent(new MouseEvent('mouseover', mouseOpts));
            await sleep(150);
            
            cell.dispatchEvent(new MouseEvent('mousedown', { ...mouseOpts, button: 0, buttons: 1 }));
            cell.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, button: 0, buttons: 0 }));
            cell.dispatchEvent(new MouseEvent('click', { ...mouseOpts, button: 0, buttons: 0 }));
            await sleep(150);

            cell.dispatchEvent(new MouseEvent('contextmenu', { ...mouseOpts, button: 2, buttons: 2 }));
            await sleep(650); 

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
                agentModifications++;
                modificheTotali++;
                await sleep(500);
            } else {
                console.error("   ⚠️ Tasto 'Reperibile' non trovato per giorno " + giorno);
                cell.style.border = '';
            }
        }

        if (agentModifications > 0) {
            console.log("   ✅ " + agentModifications + " turni inseriti. Sincronizzazione portale...");
            try {
                const syncRes = await fetch(portalUrl + "/api/admin/verbatel-sync", {
                   method: "POST",
                   headers: { 
                     "Content-Type": "application/json",
                     "x-api-key": syncToken 
                   },
                   body: JSON.stringify({ shiftIds: turno.shiftIds, status: true })
                });
                if (syncRes.ok) console.log("   🔗 Portale aggiornato con successo.");
                else console.warn("   🚨 Errore aggiornamento portale.");
            } catch (e) { console.warn("   🚨 Errore di rete con il portale."); }
            reportFinal.push({ agente: turno.agente, stato: "OK: " + agentModifications + " giorni inseriti" });
        } else {
            console.log("   ⚪ Nessuna modifica necessaria per questo agente.");
            reportFinal.push({ agente: turno.agente, stato: "SKIP: Già aggiornato o nessun turno" });
        }

        await sleep(2000);
    }

    console.log("%c\\n🏁 SINCRONIZZAZIONE TERMINATA!", "color: #4caf50; font-size: 16px; font-weight: bold;");
    console.table(reportFinal);
    alert('Sincronizzazione Compiuta! Turni totali inseriti: ' + modificheTotali + '. Controlla la tabella in console per il riepilogo.');
})();`;
      setVerbatelScript(scriptCode)
      toast.success("Script Verbatel generato")
    } catch (error) {
      console.error("Verbatel Generate Error:", error)
      toast.error("Errore generazione script")
    }
  }

  const handleAIResolve = async () => {
    setIsResolving(true)
    try {
      const res = await fetch('/api/admin/resolve-holes', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonth, year: currentYear })
      })
      if (res.ok) {
        toast.success("Holes resolved")
        router.refresh()
      } else throw new Error()
    } catch { toast.error("AI Resolver failed") }
    finally { setIsResolving(false) }
  }

  const handlePecSend = async () => {
    setIsSendingPec(true)
    try {
      const res = await fetch("/api/admin/send-pec", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear })
      })
      if (res.ok) toast.success("PEC inviate")
      else throw new Error()
    } catch { toast.error("Errore invio PEC") }
    finally { setIsSendingPec(false) }
  }

  const handlePublish = async (isCurrentlyPublished: boolean) => {
    setIsPublishing(true)
    try {
      const res = await fetch("/api/admin/publish-month", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear, isPublished: !isCurrentlyPublished })
      })
      if (res.ok) {
        toast.success(!isCurrentlyPublished ? "Pubblicato" : "Nascosto")
        window.location.reload()
      }
    } catch { toast.error("Errore visibilità") }
    finally { setIsPublishing(false) }
  }

  const handleLock = async (isCurrentlyLocked: boolean) => {
    setIsPublishing(true)
    try {
      const res = await fetch("/api/admin/publish-month", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear, isLocked: !isCurrentlyLocked })
      })
      if (res.ok) {
        toast.success(!isCurrentlyLocked ? "Mese Congelato" : "Mese Sbloccato")
        window.location.reload()
      }
    } catch { toast.error("Errore modifica stato lock") }
    finally { setIsPublishing(false) }
  }

  const handleClear = async (type: "all" | "base" | "rep") => {
    if (!confirm(`Vuoi svuotare ${type}?`)) return
    setIsClearing(true)
    try {
      await fetch("/api/admin/clear", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, year: currentYear, type })
      })
      toast.success("Pulizia completata")
      window.location.reload()
    } catch { toast.error("Errore pulizia") }
    finally { setIsClearing(false) }
  }

  const handleBulkSave = async (data: any) => {
    setIsClearing(true)
    try {
      const res = await fetch("/api/admin/bulk-absence", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, month: currentMonth, year: currentYear })
      })
      if (res.ok) {
        toast.success("Assenze registrate")
        window.location.reload()
      } else throw new Error()
    } catch { toast.error("Errore salvataggio multiplo") }
    finally { setIsClearing(false) }
  }

  const handleApproveAction = async (id: string, action: 'APPROVE' | 'REJECT', isSwap: boolean) => {
    const endpoint = isSwap ? `/api/shifts/swap/${id}` : `/api/requests/${id}`
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'APPROVE' ? 'ACCEPTED' : 'REJECTED' })
      })
      if (res.ok) {
        toast.success(action === 'APPROVE' ? "Approvato!" : "Rifiutato")
        window.location.reload()
      } else throw new Error()
    } catch { toast.error("Errore durante l'azione") }
  }

  const handleSendFullSos = async (note: string, audioBlob: Blob | null) => {
    // Implementazione aggiuntiva se necessaria per admin
  }

  const handleExportPayroll = async () => {
    window.open(`/api/admin/reports/monthly-export?year=${currentYear}&month=${currentMonth}`, '_blank');
  }

  const handlePrevMonth = () => {
    let m = currentMonth - 1
    let y = currentYear
    if (m === 0) { m = 12; y-- }
    router.push(`/${tenantSlug || 'admin'}/admin/pianificazione?month=${m}&year=${y}`)
  }

  const handleNextMonth = () => {
    let m = currentMonth + 1
    let y = currentYear
    if (m === 13) { m = 1; y++ }
    router.push(`/${tenantSlug || 'admin'}/admin/pianificazione?month=${m}&year=${y}`)
  }

  const handleImportShifts = async (file: File, type: "base" | "rep") => {
    if (!file) return
    setIsGenerating(true)
    setUploadStatus("Analisi struttura Excel...")
    try {
      const { read, utils } = await import("xlsx")
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const ab = evt.target?.result
          if (!(ab instanceof ArrayBuffer)) throw new Error("File caricato in formato non valido")
          
          const wb = read(ab, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = utils.sheet_to_json<any[]>(ws, { header: 1 })
          
          if (!data || data.length === 0) throw new Error("Il file Excel appare vuoto")

          let headerRowIndex = -1
          for (let r = 0; r < Math.min(data.length, 15); r++) {
            const row = data[r]
            if (Array.isArray(row)) {
              const rowStr = row.map(c => String(c || "")).join(" ").toLowerCase()
              // Cerca parole chiave per l'intestazione
              if (rowStr.includes("matricola") || rowStr.includes("nominativo") || rowStr.includes("agente") || rowStr.includes("nome")) {
                headerRowIndex = r
                break
              }
            }
          }

          if (headerRowIndex === -1) {
            throw new Error("Impossibile trovare la riga delle intestazioni. Assicurati che il file contenga una colonna 'Agente' o 'Matricola'.")
          }

          const shiftsData: any[] = []
          const ignoreKeywords = ["AGENTE", "ISTRUTTORE", "UFFICIALE", "SOVRINTENDENTE", "ASSISTENTE", "VICE", "CAPITANO", "TENENTE", "TOTAL", "COMUNE", "POLIZIA"]
          
          const headerData = data[headerRowIndex] as any[]
          let agentColIndex = -1
          headerData.forEach((val, idx) => {
            const s = String(val || "").toUpperCase()
            if (s.includes("AGENTE") || s.includes("NOMINATIVO") || s.includes("NOME")) {
              if (agentColIndex === -1) agentColIndex = idx
            }
          })
          if (agentColIndex === -1) agentColIndex = 0

          const dayColMap: { col: number, date: Date }[] = []
          let lastDaySeen = 0
          let currentMIndex = currentMonth - 1
          headerData.forEach((val, idx) => {
            const s = String(val || "").trim()
            const dayMatch = s.match(/(?:^|\D)(0?[1-9]|[12][0-9]|3[01])(?:\/|\D|$)/)
            if (dayMatch) {
              const d = parseInt(dayMatch[1], 10)
              // Se troviamo un "1" dopo giorni alti (28-31), passiamo al mese successivo
              if (d === 1 && lastDaySeen >= 28) {
                currentMIndex++
              }
              dayColMap.push({ col: idx, date: new Date(Date.UTC(currentYear, currentMIndex, d)) })
              lastDaySeen = d
            }
          })

          if (dayColMap.length === 0) {
            for (let d = 1; d <= 31; d++) {
              dayColMap.push({ col: d + 3, date: new Date(Date.UTC(currentYear, currentMonth - 1, d)) })
            }
          }

          for (let r = headerRowIndex + 1; r < data.length; r++) {
            const rowData = data[r] as any[]
            if (!rowData || !rowData[agentColIndex]) continue
            
            const rawName = rowData[agentColIndex]?.toString().trim().toUpperCase() || ""
            if (!rawName || rawName.length < 3) continue
            if (ignoreKeywords.some(kw => rawName === kw || (rawName.includes("PROGRAMMAZIONE") && rawName.length > 20))) continue

            dayColMap.forEach(mapping => {
              const shiftType = rowData[mapping.col]?.toString().trim()
              if (shiftType) {
                shiftsData.push({
                  name: rawName,
                  matricola: rowData[agentColIndex + 1]?.toString().trim() || "",
                  qualifica: rowData[agentColIndex + 2]?.toString().trim() || "",
                  squadra: rowData[agentColIndex + 3]?.toString().trim() || "",
                  date: mapping.date.toISOString(),
                  type: shiftType
                })
              }
            })
          }

          if (shiftsData.length === 0) {
            throw new Error("Nessun turno trovato. Verifica la struttura delle colonne.")
          }

          setUploadStatus(`Analizzati ${shiftsData.length} turni...`)
          
          if (!confirm(`Trovati ${shiftsData.length} record per ${currentMonthName} ${currentYear}. Vuoi procedere?`)) {
             setIsGenerating(false)
             setUploadStatus("")
             return
          }

          const res = await fetch('/api/admin/shifts/import', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shifts: shiftsData, importType: type })
          })

          if (res.ok) {
            const result = await res.json()
            toast.success(result.message || `Importazione completata con successo!`)
            window.location.reload()
          } else {
            const err = await res.json()
            throw new Error(err.error || "Errore del server durante l'importazione")
          }
        } catch (e: any) {
          console.error("IMPORT ERROR:", e)
          toast.error(e.message || "Errore durante l'importazione del file")
        } finally {
          setIsGenerating(false)
          setUploadStatus("")
        }
      }
      reader.readAsArrayBuffer(file)
    } catch {
       toast.error("Errore caricamento libreria Excel")
       setIsGenerating(false)
    }
  }

  const fetchAgentBalances = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/balances?year=${currentYear}`)
      if (res.ok) return await res.json()
      throw new Error()
    } catch {
      toast.error("Errore recupero saldi")
      return null
    }
  }

  const fetchPendingApprovals = async () => {
    setIsLoadingSwaps(true)
    const res = await fetch("/api/admin/approvals")
    if (res.ok) {
      const d = await res.json()
      setPendingSwaps(d.pendingSwaps || [])
      setPendingRequests(d.pendingRequests || [])
    }
    setIsLoadingSwaps(false)
  }

  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true)
    const res = await fetch("/api/admin/audit")
    if (res.ok) setAuditLogs(await res.json())
    setIsLoadingAudit(false)
  }

  const handleGenerateMonth = async () => {
    if (!confirm(`Vuoi generare automaticamente la reperibilità per ${currentMonthName} ${currentYear}? I turni esistenti verranno sovrascritti.`)) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: currentMonth, year: currentYear })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Generati ${data.totalAssigned} turni di reperibilità!`)
        router.refresh()
      } else {
        toast.error(data.error || "Errore durante la generazione")
      }
    } catch {
      toast.error("Errore di connessione al generatore")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyMonth = async () => {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const prevMonthName = monthNames[prevMonth - 1]
    if (!confirm(`Vuoi copiare i turni da ${prevMonthName} ${prevYear} nel mese corrente?\n\nI turni già esistenti NON verranno sovrascritti.`)) return
    setIsCopyingMonth(true)
    try {
      const res = await fetch('/api/admin/shifts/copy-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: currentYear, month: currentMonth })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Copiati ${data.created} turni da ${prevMonthName}. Saltati: ${data.skipped}`)
        window.location.reload()
      } else {
        toast.error(data.error || "Errore durante la copia")
      }
    } catch {
      toast.error("Errore di connessione")
    } finally {
      setIsCopyingMonth(false)
    }
  }

  const handleSendAlert = async (message?: string) => {
     setIsSendingAlert(true)
     try {
       const res = await fetch('/api/admin/alert-emergency', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: message || '🚨 URGENZA! Recarsi in comando entro 30 min.' })
       })
       const data = await res.json()
       if (res.ok) {
         toast.success(`Allerta inviata a ${data.alerted || 0} reperibili`)
       } else {
         toast.error(data.error || "Errore invio allerta")
       }
     } catch { toast.error("Errore di connessione") }
     finally { setIsSendingAlert(false) }
  }

  const handleExportPDF = async () => {
    setIsExportingPDF(true)
    try {
      const dayInfoForPDF = dayInfo.filter(d => !d.isNextMonth)

      await generatePlanningPDF({
        monthName: currentMonthName,
        month: currentMonth,
        year: currentYear,
        agents: sortedAgents as any,
        shifts: shifts as any,
        dayInfo: dayInfoForPDF,
        tenantName: settings?.tenantName || "POLIZIA LOCALE",
        logoUrl
      })
      
      toast.success("PDF Pianificazione Generato")
    } catch (e) {
      console.error("[PDF_EXPORT_ERROR]", e)
      toast.error("Errore generazione PDF")
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleExportRepPDF = async () => {
    setIsExportingPDF(true)
    try {
      const dayInfoForPDF = dayInfo.filter(d => !d.isNextMonth);
      
      await generateReperibilitaPDF({
        monthName: currentMonthName,
        month: currentMonth,
        year: currentYear,
        agents: sortedAgents as any,
        shifts: shifts as any,
        dayInfo: dayInfoForPDF,
        tenantName: settings?.tenantName || "POLIZIA LOCALE",
        logoUrl
      })
      
      toast.success("PDF Reperibilità Generato")
    } catch (e) {
      console.error("[PDF_REP_EXPORT_ERROR]", e)
      toast.error("Errore generazione PDF")
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const data = sortedAgents.map(agent => {
        const row: any = { "Nominativo": agent.name, "Matricola": agent.matricola };
        for (let d = 1; d <= daysInMonth; d++) {
          const shiftDate = new Date(Date.UTC(currentYear, currentMonth - 1, d)).toISOString()
          const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === shiftDate)
          row[d.toString()] = shift?.type || shift?.repType || "";
        }
        return row;
      });
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Turnazione");
      writeFile(wb, `Turnazione_${currentMonthName}_${currentYear}.xlsx`);
      toast.success("Excel generato");
    } catch (e) {
      toast.error("Errore generazione Excel");
    }
  }

  const handleExportUfficialiExcel = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const data = sortedAgents.filter(a => a.isUfficiale).map(agent => {
        const row: any = { "Nominativo": agent.name, "Matricola": agent.matricola };
        for (let d = 1; d <= daysInMonth; d++) {
          const shiftDate = new Date(Date.UTC(currentYear, currentMonth - 1, d)).toISOString()
          const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === shiftDate)
          row[d.toString()] = shift?.type || shift?.repType || "";
        }
        return row;
      });
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Ufficiali");
      writeFile(wb, `Excel_Ufficiali_${currentMonthName}.xlsx`);
      toast.success("Excel Ufficiali generato");
    } catch (e) {
      toast.error("Errore generazione Excel");
    }
  }

  const handleExportRepExcel = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const wsData: (string | number)[][] = [
        [`PROSPETTO REPERIBILITÀ - ${currentMonthName.toUpperCase()} ${currentYear}`],
        [],
        ["Nominativo", "Matricola", ...Array.from({length: daysInMonth}, (_, i) => (i+1).toString()), "TOT"]
      ];
      
      sortedAgents.forEach(agent => {
        let repCount = 0;
        const row: (string | number)[] = [agent.name, agent.matricola];
        for (let d = 1; d <= daysInMonth; d++) {
          const shiftDate = new Date(Date.UTC(currentYear, currentMonth - 1, d)).toISOString();
          const shift = shifts.find(s => s.userId === agent.id && new Date(s.date).toISOString() === shiftDate);
          const hasRep = (shift?.repType || "").toLowerCase().includes("rep");
          if (hasRep) {
            repCount++;
            row.push("X");
          } else {
            row.push("");
          }
        }
        row.push(repCount);
        if (repCount > 0) wsData.push(row);
      });

      const ws = utils.aoa_to_sheet(wsData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, `Reperibilità ${currentMonthName}`);
      writeFile(wb, `Reperibilita_${currentMonthName}_${currentYear}.xlsx`);
      toast.success("Excel Reperibilità generato");
    } catch (e) {
      toast.error("Errore generazione Excel Reperibilità");
    }
  }

  return {
    currentYear,
    currentMonth,
    dayInfo,
    sortedAgents,
    shifts,
    isLoading: isGenerating || isResolving || isClearing,
    isGenerating,
    isResolving,
    isClearing,
    isPublishing,
    isSendingPec,
    isSendingAlert,
    isSavingCell,
    isExportingPDF,
    uploadStatus,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    sortConfig,
    setSortConfig,
    auditLogs,
    isLoadingAudit,
    pendingSwaps,
    pendingRequests,
    isLoadingSwaps,
    verbatelScript,
    isLoadingVerbatel,
    verbatelTestMode,
    setVerbatelTestMode,
    verbatelAgents,
    
    // Handlers
    handleGenerateMonth,
    handleToggleUff,
    handleRecalcAgent,
    handleSaveCellEdit,
    handleBulkShiftEdit,
    handleExportPDF,
    handleExportRepPDF,
    handleExportExcel,
    handleExportRepExcel,
    handleExportUfficialiExcel,
    handleBulkSave,
    handleApproveAction,
    fetchPendingApprovals,
    fetchAgentBalances,
    fetchAuditLogs,
    handleFetchVerbatelData,
    handleGenerateVerbatelScript,
    handleAIResolve,
    handlePecSend,
    handlePublish,
    handleLock,
    handleClear,
    handleExportPayroll,
    handlePrevMonth,
    handleNextMonth,
    handleImportShifts,
    handleSendAlert,
    handleCopyMonth,
    isCopyingMonth,
    setEditingCell,
    todayReperibili,
    
    // UI Helpers
    monthNames,
    currentMonthName,
    allAgents,
    settings
  }
}
