import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { getLabel } from "@/utils/agenda-codes"

interface ExportCartellinoOptions {
  agentName: string
  matricola: string
  monthName: string
  month: number
  year: number
  days: number[]
  data: any // cartellino data object (shifts, clocks, requests, etc.)
}

export function exportCartellinoPDF(options: ExportCartellinoOptions) {
  const { agentName, matricola, monthName, month, year, days, data } = options
  
  const doc = new jsPDF("landscape")
  
  // Header
  doc.setFontSize(16)
  doc.text(`Cartellino Presenze - ${monthName} ${year}`, 14, 15)
  doc.setFontSize(11)
  doc.text(`Agente: ${agentName} (${matricola})`, 14, 22)
  doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")}`, 14, 28)

  const tableData = days.map(day => {
    const dateObj = new Date(Date.UTC(year, month - 1, day))
    const dateStr = dateObj.toISOString().split('T')[0]
    
    const dayShifts = data.shifts?.filter((s: any) => new Date(s.date).toISOString().split('T')[0] === dateStr) || []
    const requests = data.requests?.filter((r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr) || []
    const clocks = data.clockRecords?.filter((c: any) => new Date(c.timestamp).toISOString().split('T')[0] === dateStr) || []
    
    const primaryShift = dayShifts[0]
    const overtime = dayShifts.reduce((acc: number, s: any) => acc + (s.overtimeHours || 0), 0)
    
    // Date string
    const dateFormatted = `${day} ${format(dateObj, "MMM", { locale: it })} (${format(dateObj, "EEEE", { locale: it }).substring(0, 3)})`
    
    // Shift string
    const shiftStr = primaryShift ? `${primaryShift.type} ${primaryShift.timeRange ? `(${primaryShift.timeRange})` : ''}` : '-'
    
    // Clocks string
    const clocksStr = clocks.map((c: any) => `${c.type === 'IN' ? 'E' : 'U'}: ${format(new Date(c.timestamp), "HH:mm")}`).join("\n") || '-'
    
    // Straordinario
    const overtimeStr = overtime > 0 ? `+${overtime}h` : '-'
    
    // Note / Assenze
    const reqsStr = requests.map((r: any) => `${r.hours ? r.hours + 'h ' : ''}${getLabel(r.code) || r.code}`).join(", ")
    const serviceDetails = primaryShift?.serviceDetails || ''
    const notesStr = [reqsStr, serviceDetails].filter(Boolean).join(" | ") || '-'

    return [
      dateFormatted,
      shiftStr,
      clocksStr,
      overtimeStr,
      notesStr
    ]
  })

  autoTable(doc, {
    startY: 35,
    head: [['Data', 'Turno Previsto', 'Timbrature Effettive', 'Straordinario', 'Assenze e Note']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
    headStyles: { fillColor: [40, 50, 70], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 'auto' }
    }
  })

  doc.save(`Cartellino_${matricola}_${monthName}_${year}.pdf`)
}

export function exportCartellinoExcel(options: ExportCartellinoOptions) {
  const { agentName, matricola, monthName, month, year, days, data } = options
  
  const excelData = days.map(day => {
    const dateObj = new Date(Date.UTC(year, month - 1, day))
    const dateStr = dateObj.toISOString().split('T')[0]
    
    const dayShifts = data.shifts?.filter((s: any) => new Date(s.date).toISOString().split('T')[0] === dateStr) || []
    const requests = data.requests?.filter((r: any) => new Date(r.date).toISOString().split('T')[0] === dateStr) || []
    const clocks = data.clockRecords?.filter((c: any) => new Date(c.timestamp).toISOString().split('T')[0] === dateStr) || []
    
    const primaryShift = dayShifts[0]
    const overtime = dayShifts.reduce((acc: number, s: any) => acc + (s.overtimeHours || 0), 0)
    
    const dateFormatted = `${day} ${format(dateObj, "MMM", { locale: it })}`
    const dayOfWeek = format(dateObj, "EEEE", { locale: it })
    const shiftType = primaryShift ? primaryShift.type : '-'
    const shiftTime = primaryShift?.timeRange || '-'
    const clocksList = clocks.map((c: any) => `${c.type}: ${format(new Date(c.timestamp), "HH:mm")}`).join(" | ") || '-'
    const reqsStr = requests.map((r: any) => `${r.hours ? r.hours + 'h ' : ''}${getLabel(r.code) || r.code}`).join(", ")
    const notes = [reqsStr, primaryShift?.serviceDetails].filter(Boolean).join(" | ") || '-'

    return {
      "Giorno": dateFormatted,
      "Giorno Settimana": dayOfWeek,
      "Turno": shiftType,
      "Orario": shiftTime,
      "Timbrature": clocksList,
      "Straordinario (h)": overtime > 0 ? overtime : '',
      "Assenze / Note": notes
    }
  })

  const ws = XLSX.utils.json_to_sheet(excelData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Cartellino")
  
  // Aggiungiamo larghezza automatica
  const wscols = [
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 50 }
  ]
  ws['!cols'] = wscols
  
  XLSX.writeFile(wb, `Cartellino_${matricola}_${monthName}_${year}.xlsx`)
}
