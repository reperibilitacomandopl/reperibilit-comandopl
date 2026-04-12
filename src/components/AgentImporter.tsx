"use client"

import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, AlertCircle, Check, X, Download, Users, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

// ============================================================================
// AGENT IMPORTER — Import da CSV/Excel
// ============================================================================

interface ImportedAgent {
  name: string
  matricola: string
  qualifica?: string
  email?: string
  phone?: string
  squadra?: string
  isUfficiale?: boolean
}

interface AgentImporterProps {
  onImportComplete?: (count: number) => void
  embedded?: boolean // true when inside OnboardingWizard
}

export default function AgentImporter({ onImportComplete, embedded = false }: AgentImporterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ImportedAgent[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload")
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] }>({ created: 0, skipped: 0, errors: [] })
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "overwrite">("skip")
  const fileRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const templateData = [
      { Nome: "ROSSI MARIO", Matricola: "001", Qualifica: "Agente di P.L.", Email: "rossi@comune.it", Telefono: "3331234567", Squadra: "A", Ufficiale: "NO" },
      { Nome: "BIANCHI ANNA", Matricola: "002", Qualifica: "Istruttore di Vigilanza", Email: "bianchi@comune.it", Telefono: "", Squadra: "B", Ufficiale: "SI" },
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, "Agenti")
    XLSX.writeFile(wb, "template_importazione_agenti.xlsx")
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    parseFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    setFile(f)
    parseFile(f)
  }

  const parseFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet)

        if (jsonData.length === 0) {
          setErrors(["Il file è vuoto o non contiene dati validi."])
          return
        }

        // Auto-map columns
        const agents: ImportedAgent[] = []
        const parseErrors: string[] = []

        jsonData.forEach((row, i) => {
          const name = row["Nome"] || row["nome"] || row["NOME"] || row["Cognome e Nome"] || row["name"] || ""
          const matricola = row["Matricola"] || row["matricola"] || row["MATRICOLA"] || row["Matr"] || row["matr"] || ""
          const qualifica = row["Qualifica"] || row["qualifica"] || row["QUALIFICA"] || ""
          const email = row["Email"] || row["email"] || row["EMAIL"] || row["E-mail"] || ""
          const phone = row["Telefono"] || row["telefono"] || row["TELEFONO"] || row["Phone"] || row["Tel"] || ""
          const squadra = row["Squadra"] || row["squadra"] || row["SQUADRA"] || row["Gruppo"] || ""
          const uffRaw = row["Ufficiale"] || row["ufficiale"] || row["UFFICIALE"] || ""
          const isUfficiale = ["SI", "SÌ", "YES", "1", "TRUE", "X"].includes(uffRaw.toUpperCase().trim())

          if (!name.trim()) {
            parseErrors.push(`Riga ${i + 2}: Nome mancante`)
            return
          }
          if (!matricola.toString().trim()) {
            parseErrors.push(`Riga ${i + 2}: Matricola mancante per "${name}"`)
            return
          }

          agents.push({
            name: name.trim().toUpperCase(),
            matricola: matricola.toString().trim(),
            qualifica: qualifica.trim() || "Agente di P.L.",
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            squadra: squadra.trim() || undefined,
            isUfficiale
          })
        })

        // Check duplicates within file
        const matricole = agents.map(a => a.matricola)
        const duplicates = matricole.filter((m, i) => matricole.indexOf(m) !== i)
        if (duplicates.length > 0) {
          parseErrors.push(`Matricole duplicate nel file: ${[...new Set(duplicates)].join(", ")}`)
        }

        setParsedData(agents)
        setErrors(parseErrors)
        setStep("preview")
      } catch {
        setErrors(["Errore nella lettura del file. Assicurati che sia un file CSV o Excel valido."])
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleImport = async () => {
    setStep("importing")
    try {
      const res = await fetch("/api/admin/import-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents: parsedData, duplicateMode })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Errore durante l'importazione")
        setStep("preview")
        return
      }
      setImportResult(data)
      setStep("done")
      toast.success(`${data.created} agenti importati con successo!`)
      onImportComplete?.(data.created)
    } catch {
      toast.error("Errore di rete durante l'importazione")
      setStep("preview")
    }
  }

  const reset = () => {
    setFile(null)
    setParsedData([])
    setErrors([])
    setStep("upload")
    setImportResult({ created: 0, skipped: 0, errors: [] })
    if (fileRef.current) fileRef.current.value = ""
  }

  const containerClass = embedded
    ? ""
    : "bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 md:p-10"

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Importa Agenti</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Carica un file CSV o Excel con l&apos;elenco del personale</p>
          </div>
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all">
            <Download className="w-4 h-4" /> Scarica Template
          </button>
        </div>
      )}

      {/* STEP: UPLOAD */}
      {step === "upload" && (
        <div>
          {embedded && (
            <div className="flex justify-end mb-4">
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all">
                <Download className="w-3.5 h-3.5" /> Scarica Template Excel
              </button>
            </div>
          )}
          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
            onClick={() => fileRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="w-16 h-16 bg-slate-100 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
              <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-base font-bold text-slate-700 mb-1">Trascina il file qui o clicca per selezionarlo</p>
            <p className="text-xs text-slate-400 font-medium">Formati supportati: .xlsx, .xls, .csv</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Manual entry hint */}
          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            Non hai un file? Puoi sempre aggiungere gli agenti manualmente dalla sezione <strong>Anagrafica</strong>.
          </p>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === "preview" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{file?.name}</p>
                <p className="text-xs text-slate-400 font-medium">{parsedData.length} agenti trovati</p>
              </div>
            </div>
            <button onClick={reset} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Attenzione</span>
              </div>
              <ul className="space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-xs text-amber-700 font-medium">• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicate handling */}
          <div className="mb-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Se la matricola esiste già:</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDuplicateMode("skip")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${duplicateMode === "skip" ? "bg-blue-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600"}`}
              >
                Salta (non sovrascrivere)
              </button>
              <button
                onClick={() => setDuplicateMode("overwrite")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${duplicateMode === "overwrite" ? "bg-amber-600 text-white shadow-md" : "bg-white border border-slate-200 text-slate-600"}`}
              >
                Aggiorna dati esistenti
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 max-h-[320px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matricola</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qualifica</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Squadra</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Uff.</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((a, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 text-xs text-slate-400 font-mono">{i + 1}</td>
                    <td className="p-3 text-xs font-bold text-slate-900 uppercase">{a.name}</td>
                    <td className="p-3 text-xs font-mono text-slate-600">{a.matricola}</td>
                    <td className="p-3 text-xs text-slate-500">{a.qualifica}</td>
                    <td className="p-3 text-xs text-slate-400">{a.email || "—"}</td>
                    <td className="p-3 text-xs text-slate-500 font-bold">{a.squadra || "—"}</td>
                    <td className="p-3 text-xs">{a.isUfficiale ? <span className="text-amber-600 font-bold">SI</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={reset} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">
              Annulla
            </button>
            <button
              onClick={handleImport}
              disabled={parsedData.length === 0}
              className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" /> Importa {parsedData.length} Agenti
            </button>
          </div>
        </div>
      )}

      {/* STEP: IMPORTING */}
      {step === "importing" && (
        <div className="py-16 text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-900">Importazione in corso...</p>
          <p className="text-sm text-slate-400 mt-1">Stiamo caricando {parsedData.length} agenti nel sistema</p>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Importazione Completata!</h3>
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-600">{importResult.created}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Creati</div>
            </div>
            {importResult.skipped > 0 && (
              <div className="text-center">
                <div className="text-2xl font-black text-amber-500">{importResult.skipped}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saltati</div>
              </div>
            )}
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-left max-w-md mx-auto">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-rose-700 font-medium">• {err}</p>
              ))}
            </div>
          )}

          <button onClick={reset} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all">
            Importa un altro file
          </button>
        </div>
      )}
    </div>
  )
}
