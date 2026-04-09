"use client"

import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Printer, X, Save, GraduationCap } from "lucide-react"
import toast from "react-hot-toast"

export default function ServiceOrderDashboard({ onClose, tenantName }: { onClose?: () => void, tenantName?: string | null }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  
  const [users, setUsers] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = String(currentDate.getMonth() + 1).padStart(2, "0")
    const d = String(currentDate.getDate()).padStart(2, "0")
    
    try {
      const res = await fetch(`/api/admin/shifts/daily?date=${y}-${m}-${d}`)
      const data = await res.json()
      if (data.users) setUsers(data.users)
      if (data.shifts) setShifts(data.shifts)
      if (data.categories) setCategories(data.categories)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [currentDate])

  const changeDate = (days: number) => {
    const next = new Date(currentDate)
    next.setDate(next.getDate() + days)
    setCurrentDate(next)
  }

  const handleDetailsUpdate = async (shift: any, value: string) => {
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
      toast.error("Errore durante l'automazione")
    }
    setIsAutoAssigning(false)
  }

  // --- DOWNLOAD PDF FIX ---
  const downloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const dateStr = currentDate.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    
    // Header Istituzionale - Pulizia doppioni
    doc.setFontSize(22)
    doc.setTextColor(15, 23, 42) // Slate-900
    const headerTitle = tenantName?.toUpperCase().includes("POLIZIA LOCALE") 
      ? tenantName.toUpperCase() 
      : `POLIZIA LOCALE ${tenantName?.toUpperCase() || "COMANDO"}`
    doc.text(headerTitle, pageWidth / 2, 20, { align: "center" })
    
    doc.setFontSize(14)
    doc.text("ORDINE DI SERVIZIO GIORNALIERO", pageWidth / 2, 28, { align: "center" })
    
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // Slate-400
    doc.text(dateStr.toUpperCase(), pageWidth / 2, 34, { align: "center" })
    
    // Preparazione Dati
    const body: any[] = []

    const isWorking = (type: string) => /^[MPN]\d/.test((type || "").toUpperCase().replace(/[()]/g, "").trim())
    const currentShifts = shifts.filter(s => isWorking(s.type))
    
    // Ordiniamo per fascia (M poi P poi N)
    const sortedShifts = [...currentShifts].sort((a,b) => a.type.localeCompare(b.type))

    sortedShifts.forEach(s => {
      const u = users.find(u => u.id === s.userId)
      if (!u) return
      
      const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente")
      
      // Se ci sono dettagli (es. orari scuole), cerchiamo di estrarre l'orario specifico
      let orarioPrincipale = s.timeRange || (s.type.startsWith("M") ? "08:00-14:00" : s.type.startsWith("P") ? "14:00-20:00" : "22:00-04:00")
      let disposizioni = s.serviceDetails || ""
      
      // Rilevamento orari scuola (es. 07:45-08:30 o solo 07:45)
      const schoolTimeMatch = disposizioni.match(/(\d{2}:\d{2})(-(\d{2}:\d{2}))?/)
      
      let orarioStampa = orarioPrincipale
      if (schoolTimeMatch) {
         // Se è un servizio scuola, mettiamo l'orario della scuola in primo piano
         orarioStampa = `${schoolTimeMatch[0]}\n(${orarioPrincipale})`
      }

      const servizio = s.serviceType ? s.serviceType.name : (u.servizio || "Vigilanza")
      const veicolo = s.vehicle ? `\n(${s.vehicle.name})` : ""
      
      body.push([
        { content: `${qualifica}\n${u.name}`, styles: { fontStyle: 'bold' } },
        { content: orarioStampa, styles: { halign: 'center', fontSize: 8, fontStyle: schoolTimeMatch ? 'bold' : 'normal' } },
        { content: `${servizio}${veicolo}`, styles: { fontStyle: schoolTimeMatch ? 'bold' : 'normal' } },
        { content: disposizioni, styles: { fontSize: 8 } }
      ])
    })

    if (body.length === 0) {
      toast.error("Nessun turno operativo trovato per questa data. Il PDF sarebbe vuoto.")
      return
    }

    autoTable(doc, {
      startY: 45,
      head: [['QUALIFICA / NOME', 'ORARIO', 'SERVIZIO / MEZZO', 'DISPOSIZIONI E LUOGHI']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 10, halign: 'center' },
      bodyStyles: { fontSize: 9, cellPadding: 4, textColor: 50 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { cellWidth: 'auto' }
      }
    })

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(10)
    doc.text("L'UFFICIALE DI TURNO", pageWidth - 60, finalY, { align: "center" })
    doc.setDrawColor(200, 200, 200)
    doc.line(pageWidth - 90, finalY + 10, pageWidth - 30, finalY + 10)

    doc.save(`OdS_${currentDate.toISOString().split("T")[0]}.pdf`)
  }

  // --- LOGICA RAGGRUPPAMENTI ---
  const isWorking = (type: string) => /^[MPN]\d/.test((type || "").toUpperCase().replace(/[()]/g, "").trim())
  const presentShifts = shifts.filter(s => isWorking(s.type))
  const mattinieri = presentShifts.filter(s => /^M/i.test((s.type||"").replace(/[()]/g,"")))
  const pomeridiani = presentShifts.filter(s => /^P/i.test((s.type||"").replace(/[()]/g,"")))

  const renderFasciaOrizzontale = (titolo: string, listaTurni: any[]) => {
    if (listaTurni.length === 0) return null

    // Ufficiali
    const ufficiali = listaTurni.filter(s => users.find(u => u.id === s.userId)?.isUfficiale)
    const agenti = listaTurni.filter(s => !users.find(u => u.id === s.userId)?.isUfficiale)

    const gruppiAgenti: Record<string, any[]> = {}
    agenti.forEach(s => {
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

  const renderRigaTabella = (s: any) => {
    const u = users.find(u => u.id === s.userId)
    if (!u) return null
    const qualifica = u.qualifica || (u.isUfficiale ? "Uff.le" : "Agente")
    
    let orario = s.timeRange || (s.type.startsWith("M") ? "08:00-14:00" : s.type.startsWith("P") ? "14:00-20:00" : "00:00-00:00");
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
             onBlur={(e) => handleDetailsUpdate(s, e.target.value)}
             className="w-full h-full p-2 text-xs bg-transparent focus:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400 transition-all font-medium text-slate-700 placeholder:text-slate-300"
             placeholder="Clicca per inserire (Es: 08:00-08:45 Sc. Golgota...)"
           />
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white overflow-hidden animate-fade-in shadow-2xl">
      
      {/* Header Intestazione */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex justify-between items-center px-6">
         <h2 className="text-lg font-black text-white tracking-widest uppercase">Grid <span className="text-indigo-400">O.d.S.</span></h2>
         
         <div className="flex gap-2">
            <button 
              onClick={handleAutoSchools} 
              disabled={isAutoAssigning}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-900/40 disabled:opacity-50"
            >
              <GraduationCap size={14}/> {isAutoAssigning ? "Assegnazione..." : "🪄 Auto-Scuole"}
            </button>
            <button onClick={downloadPDF} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-900/40">
              <Printer size={14}/> STAMPA
            </button>
            {onClose && (
              <button onClick={onClose} className="p-2 bg-slate-800 text-slate-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all border border-slate-700">
                <X size={16}/>
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
               <Loader2 size={40} className="animate-spin text-indigo-500" />
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
import React from 'react';
