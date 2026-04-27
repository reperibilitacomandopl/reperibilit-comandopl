"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Loader2, Printer, X, GraduationCap, ShieldCheck } from "lucide-react"
import toast from "react-hot-toast"
import { generateODSPDF } from "@/utils/pdf-generator"

interface DashboardUser {
  id: string;
  name: string;
  qualifica?: string;
  isUfficiale?: boolean;
  servizio?: string;
}

interface DashboardShift {
  id: string;
  userId: string;
  date: string;
  type: string;
  timeRange?: string;
  serviceDetails?: string;
  patrolGroupId?: string | null;
  serviceType?: { id: string; name: string } | null;
  vehicle?: { id: string; name: string } | null;
}


export default function ServiceOrderDashboard({ onClose, tenantName }: { onClose?: () => void, tenantName?: string | null }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [isCertified, setIsCertified] = useState(false)
  
  const [users, setUsers] = useState<DashboardUser[]>([])
  const [shifts, setShifts] = useState<DashboardShift[]>([])
  // categories is currently unused but kept for future logic if needed, 
  // but for Zero Noise we comment it out if lint complaints or use it.
  // const [categories, setCategories] = useState<DashboardCategory[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    
    try {
      const res = await fetch(`/api/admin/shifts/daily?date=${y}-${m}-${d}`)
      const data = await res.json()
      if (data.users) setUsers(data.users)
      if (data.shifts) setShifts(data.shifts)
      setIsCertified(!!data.isCertified)
    } catch { toast.error("Errore caricamento dati OdS") }
    setLoading(false)
  }, [currentDate])

  useEffect(() => { 
    const t = setTimeout(() => loadData(), 0);
    return () => clearTimeout(t);
  }, [currentDate, loadData])


  const handleDetailsUpdate = async (shift: DashboardShift, value: string) => {
    if (isCertified) return; // Blocco UI
    if (shift.serviceDetails === value) return; // Nessuna modifica effettiva

    // Optimistic UI Update
    setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, serviceDetails: value } : s))
    
    try {
      const targetDate = new Date(currentDate);
      targetDate.setHours(12, 0, 0, 0); 
      const dateStr = targetDate.toISOString().split("T")[0];

      await fetch(`/api/admin/shifts/daily`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date: dateStr,
          userId: shift.userId,
          type: shift.type,
          serviceDetails: value
        })
      })
    } catch (e) {
      console.error("Errore salvataggio dettagli:", e)
    }
  }

  // --- CALCOLO LINGUETTE DELLA SETTIMANA ---
  const getWeekDates = (curr: Date) => {
     const w = [];
     const start = new Date(curr);
     const day = start.getDay();
     const diff = start.getDate() - day + (day === 0 ? -6 : 1);
     start.setDate(diff);
     for(let i=0; i<7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        w.push(d);
     }
     return w;
  }
  const weekDates = getWeekDates(currentDate);

  // --- AUTOMAZIONE SCUOLE ---
  const handleAutoSchools = async () => {
    setIsAutoAssigning(true)
    try {
      const y = currentDate.getFullYear()
      const m = String(currentDate.getMonth() + 1).padStart(2, "0")
      const d = String(currentDate.getDate()).padStart(2, "0")
      const dateStr = `${y}-${m}-${d}`

      const res = await fetch("/api/admin/shifts/auto-scuole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        loadData() // Ricarica la griglia
      } else {
        toast.error(data.error || "Nessun potenziale assegnamento trovato")
      }
    } catch {
      toast.error("Errore durante l'automazione scuole")
    }
    setIsAutoAssigning(false)
  }

  // --- DOWNLOAD PDF FIX ---
  const downloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    
    const doc = new jsPDF()
    const internalDoc = doc as unknown as { internal: { pageSize: { width: number } } }
    const pageWidth = internalDoc.internal.pageSize.width
    const dateStr = currentDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    
    const navelBlue: [number, number, number] = [0, 23, 54] // Naval Blue Sentinel

    // Header Istituzionale Premium
    doc.setFontSize(22)
    doc.setTextColor(navelBlue[0], navelBlue[1], navelBlue[2])
    const headerTitle = tenantName?.toUpperCase().includes("POLIZIA LOCALE") 
      ? tenantName.toUpperCase() 
      : `POLIZIA LOCALE ${tenantName?.toUpperCase() || "COMANDO"}`
    doc.setFont("helvetica", "bold")
    doc.text(headerTitle, pageWidth / 2, 20, { align: "center" })
    
    doc.setFontSize(14)
    doc.text("ORDINE DI SERVIZIO GIORNALIERO", pageWidth / 2, 28, { align: "center" })
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 116, 139)
    doc.text(dateStr.toUpperCase(), pageWidth / 2, 34, { align: "center" })

    doc.setDrawColor(navelBlue[0], navelBlue[1], navelBlue[2])
    doc.setLineWidth(0.5)
    doc.line(20, 38, pageWidth - 20, 38)
    
    // Preparazione Dati
    const body: { content: string; styles: Record<string, unknown> }[][] = []

    const isWorkingShift = (type: string) => /^[MPN]\d/.test((type || "").toUpperCase().replace(/[()]/g, "").trim())
    const currentShifts = shifts.filter(s => isWorkingShift(s.type))
    
    const sortedShifts = [...currentShifts].sort((a,b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type)
      if (a.patrolGroupId && b.patrolGroupId) return a.patrolGroupId.localeCompare(b.patrolGroupId)
      return (a.patrolGroupId ? -1 : 1)
    })

    sortedShifts.forEach(s => {
      const u = users.find(u => u.id === s.userId)
      if (!u) return
      
      const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente")
      const orarioPrincipale = s.timeRange || (s.type.startsWith("M") ? "08:00-14:00" : s.type.startsWith("P") ? "14:00-20:00" : "22:00-04:00")
      const disposizioni = s.serviceDetails || ""
      const schoolTimeMatch = disposizioni.match(/(\d{2}:\d{2})(-(\d{2}:\d{2}))?/)
      
      let orarioStampa = orarioPrincipale
      if (schoolTimeMatch) orarioStampa = `${schoolTimeMatch[0]}\n(${orarioPrincipale})`

      const servizio = s.serviceType ? s.serviceType.name : (u.servizio || "Vigilanza")
      const veicolo = s.vehicle ? `\n(${s.vehicle.name})` : ""
      
      const rowData: any = [
        { content: `${qualifica}\n${u.name}`, styles: { fontStyle: 'bold' } },
        { content: orarioStampa, styles: { halign: 'center', fontSize: 8, fontStyle: 'bold' } },
        { content: `${servizio}${veicolo}`, styles: { fontStyle: schoolTimeMatch ? 'bold' : 'normal' } },
        { content: disposizioni, styles: { fontSize: 8 } }
      ]
      
      rowData.isPatrol = !!s.patrolGroupId
      body.push(rowData)
    })

    if (body.length === 0) {
      toast.error("Nessun turno operativo trovato")
      return
    }

    autoTable(doc, {
      startY: 42,
      head: [['QUALIFICA / NOME', 'ORARIO', 'SERVIZIO / MEZZO', 'DISPOSIZIONI E LUOGHI']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: navelBlue, textColor: 255, fontSize: 10, halign: 'center', fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, cellPadding: 3, textColor: 40 },
      alternateRowStyles: { fillColor: [245, 247, 250] }, // Effetto Zebra Naval-ish
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 28 },
        2: { cellWidth: 45 },
        3: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        const row = body[data.row.index];
        if (row && (row as any).isPatrol && data.section === 'body') {
          data.cell.styles.fillColor = [230, 242, 255] // Highlight pattuglie
        }
      }
    })

    // Footer & Firme
    // @ts-expect-error accessing internal library property after autotable execution
    const finalY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    
    // Linee firme
    doc.text("L'UFFICIALE DI SERVIZIO", 45, finalY, { align: "center" })
    doc.line(20, finalY + 12, 70, finalY + 12)
    
    doc.text("IL COMANDANTE DEL CORPO", pageWidth - 55, finalY, { align: "center" })
    doc.line(pageWidth - 85, finalY + 12, pageWidth - 25, finalY + 12)

    doc.save(`ODS_${currentDate.toISOString().split('T')[0]}.pdf`)
  }

  const certifyAndEmit = async () => {
    if (!confirm("ATTENZIONE: La certificazione apporrà un sigillo digitale inappellabile a questo Ordine di Servizio. Una volta emesso, ogni modifica successiva invaliderà la firma. Procedere?")) return
    
    setLoading(true)
    try {
      // 1. Generiamo il PDF tramite il nuovo generatore (che include l'hash interno)
      const hash = await generateODSPDF({
        date: currentDate,
        users: users as DashboardUser[],
        shifts: shifts as DashboardShift[],
        tenantName: tenantName || "Comando Polizia Locale"
      })

      // 2. Registriamo la certificazione sul database tramite API
      const res = await fetch("/api/admin/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash,
          type: "ODS",
          metadata: {
            date: currentDate.toISOString().split('T')[0],
            agentsCount: shifts.filter(s => /^[MPN]\d/.test(s.type)).length,
            tenantName
          }
        })
      })

      if (res.ok) {
        setIsCertified(true)
        toast.success("ORDINE DI SERVIZIO CERTIFICATO ED EMESSO!", {
          duration: 5000,
          icon: '🔏'
        })

        // 3. Pubblica annuncio automatico in Bacheca
        try {
          const dateLabel = currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
          await fetch("/api/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `📋 OdS Certificato — ${dateLabel}`,
              body: `L'Ordine di Servizio per ${dateLabel} è stato firmato digitalmente e pubblicato. Verificate le vostre assegnazioni nella sezione "Il Mio OdS".`,
              category: "ODG",
              priority: "HIGH"
            })
          })
        } catch { /* Non bloccare il flusso se la bacheca fallisce */ }
      } else {
        const err = await res.json()
        if (res.status === 409) {
          toast.success("Documento già certificato in precedenza. PDF rigenerato.")
        } else {
          toast.error(`Errore persistenza: ${err.error}`)
        }
      }
    } catch (e) {
      console.error("Errore Certificazione:", e)
      toast.error("Errore durante la procedura di firma digitale")
    }
    setLoading(false)
  }

  // --- LOGICA RAGGRUPPAMENTI ---
  const isWorking = (type: string) => /^[MPN]\d/.test((type || "").toUpperCase().replace(/[()]/g, "").trim())
  const presentShifts = shifts.filter(s => isWorking(s.type))
  const mattinieri = presentShifts.filter(s => /^M/i.test((s.type||"").replace(/[()]/g,"")))
  const pomeridiani = presentShifts.filter(s => /^P/i.test((s.type||"").replace(/[()]/g,"")))

  const renderFasciaOrizzontale = (titolo: string, listaTurni: DashboardShift[]) => {
    if (listaTurni.length === 0) return null

    // Ufficiali
    const ufficiali = listaTurni.filter(s => users.find(u => u.id === s.userId)?.isUfficiale)
    const agenti = listaTurni.filter(s => !users.find(u => u.id === s.userId)?.isUfficiale)

    const gruppiAgenti: Record<string, DashboardShift[]> = {}
    agenti.forEach(s => {
      // @ts-expect-error accessing serviceCategory which is on the full Shift model
      const catName = s.serviceCategory ? s.serviceCategory.name : "ALTRI SERVIZI"
      if (!gruppiAgenti[catName]) gruppiAgenti[catName] = []
      gruppiAgenti[catName].push(s)
    })

    return (
      <div className="mb-0">
        {titolo === "POMERIGGIO" && (
          <div className="bg-amber-100/80 border-y border-amber-300 text-center py-1 mt-4">
            <h2 className="font-black text-amber-900 tracking-widest uppercase text-sm">POMERIGGIO</h2>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse border border-slate-200 bg-white">
           <thead className="bg-slate-50 border-b border-slate-200">
             <tr className="text-slate-500 font-bold tracking-wider">
               <th className="p-2 border-r border-slate-200 w-1/4">QUALIFICA E COGNOME NOME</th>
               <th className="p-2 border-r border-slate-200 w-28 text-center">ORARIO</th>
               <th className="p-2 border-r border-slate-200 w-1/4">SERVIZIO E VEICOLO</th>
               <th className="p-2">DISPOSIZIONI E LUOGHI (Editabile)</th>
             </tr>
           </thead>
           <tbody>
             {/* Ufficiali */}
             {ufficiali.length > 0 && (
               <>
                 <tr>
                   <td colSpan={4} className="bg-purple-100/50 py-1 text-center font-bold text-purple-900 text-[11px] border-b border-slate-200">
                     Ufficiali
                   </td>
                 </tr>
                 {ufficiali.map((s) => renderRigaTabella(s))}
               </>
             )}
             
             {/* Categorie Agenti */}
             {Object.entries(gruppiAgenti).map(([catName, servs]) => (
               <React.Fragment key={catName}>
                 <tr>
                   <td colSpan={4} className="bg-purple-100/50 py-1 text-center font-bold text-purple-900 text-[11px] border-b border-slate-200 border-t border-slate-300">
                     {catName}
                   </td>
                 </tr>
                 {servs.map((s) => renderRigaTabella(s))}
               </React.Fragment>
             ))}
           </tbody>
        </table>
      </div>
    )
  }

  const renderRigaTabella = (s: DashboardShift) => {
    const u = users.find(u => u.id === s.userId)
    if (!u) return null
    const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente")
    const orario = s.timeRange || (s.type.startsWith("M") ? "08:00-14:00" : s.type.startsWith("P") ? "14:00-20:00" : "22:00-04:00")
    const serviceName = s.serviceType ? s.serviceType.name : (u.servizio || "Vigilanza")
    const vehicleName = s.vehicle ? ` (${s.vehicle.name})` : ""

    return (
      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
        <td className="p-2 border-r border-slate-200">
           <span className="text-[10px] text-slate-500 mr-2">{qualifica}</span>
           <span className="font-bold text-slate-800">{u.name}</span>
        </td>
        <td className="p-2 border-r border-slate-200 font-mono text-center text-[11px] text-slate-600">
           {orario}
        </td>
        <td className="p-2 border-r border-slate-200 font-medium text-slate-700">
           {serviceName} <span className="text-slate-400 font-normal">{vehicleName}</span>
        </td>
        <td className="p-0 align-top">
           <input 
             type="text" 
             defaultValue={s.serviceDetails || ""}
             disabled={isCertified}
             onBlur={(e) => handleDetailsUpdate(s, e.target.value)}
             className={`w-full h-full p-2 text-xs bg-transparent focus:outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300
               ${isCertified ? 'cursor-not-allowed opacity-70' : 'focus:bg-yellow-50 focus:ring-2 focus:ring-inset focus:ring-indigo-400'}
             `}
             placeholder={isCertified ? "Sola lettura" : "Clicca per inserire (Es: 08:00-08:45 Sc. Golgota...)"}
           />
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white overflow-hidden animate-fade-in shadow-2xl">
      
      {/* Header Intestazione */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex justify-between items-center px-6">
         <div className="flex items-center gap-4">
           <h2 className="text-lg font-black text-white tracking-widest uppercase">Grid <span className="text-indigo-400">O.d.S.</span></h2>
           {isCertified && (
             <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full animate-in zoom-in duration-500">
               <ShieldCheck size={12} className="text-emerald-400" />
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sigillo Digitale Attivo</span>
             </div>
           )}
         </div>
         
         <div className="flex gap-2">
            <button 
              onClick={handleAutoSchools} 
              disabled={isAutoAssigning || isCertified}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-900/40 disabled:opacity-50"
            >
              <GraduationCap width={14} height={14}/> {isAutoAssigning ? "Assegnazione..." : "🪄 Auto-Scuole"}
            </button>
            <button 
                onClick={certifyAndEmit}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 text-xs tracking-wider border border-emerald-500/50"
              >
                <ShieldCheck width={18} height={18}/> {loading ? "..." : "CERTIFICA ED EMETTI"}
              </button>

              <button 
                onClick={downloadPDF}
                disabled={loading}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-700"
              >
                <Printer width={18} height={18}/> Stampa Semplice
              </button>
            {onClose && (
              <button onClick={onClose} className="p-2 bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all border border-slate-700">
                <X width={16} height={16}/>
              </button>
            )}
         </div>
      </div>

      {/* TABS SETTIMANALI (Come da Screenshot) */}
      <div className="bg-slate-50 border-b border-slate-200 flex overflow-x-auto shrink-0 px-2 pt-2">
         {weekDates.map((wd, index) => {
            const isSelected = wd.getDate() === currentDate.getDate()
            const lblDay = wd.toLocaleDateString("it-IT", { weekday: "long" }).charAt(0).toUpperCase() + wd.toLocaleDateString("it-IT", { weekday: "long" }).slice(1)
            const dateStr = wd.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
            return (
              <button 
                key={index} 
                onClick={() => setCurrentDate(wd)}
                className={`px-6 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-x border-t rounded-t-lg -mb-[1px] relative
                  ${isSelected ? 'bg-white border-slate-200 text-indigo-700 z-10 font-black' : 'bg-slate-100 border-transparent text-slate-400 hover:bg-slate-200'}
                `}
              >
                {lblDay} {dateStr}
              </button>
            )
         })}
      </div>

      {/* Corpo Griglia */}
      <div className="flex-1 overflow-auto p-4 bg-white relative">
         {loading ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
               <Loader2 width={40} height={40} className="animate-spin text-indigo-500" />
             </div>
         ) : (
            <div className="max-w-[1900px] mx-auto pb-20">
               {renderFasciaOrizzontale("MATTINA", mattinieri)}
               {renderFasciaOrizzontale("POMERIGGIO", pomeridiani)}
               
               {mattinieri.length === 0 && pomeridiani.length === 0 && (
                  <div className="p-12 text-center text-slate-400 italic">Vuoto per questa giornata.</div>
               )}
            </div>
         )}
      </div>

    </div>
  )
}
