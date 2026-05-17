"use client"

import { useState } from "react"
import { FileText, Shield, Clock, Download, Eye, Scale } from "lucide-react"

const slaLevels = [
  { level: "Critical", desc: "Sistema down", response: "1 ora", resolution: "4 ore", color: "rose" },
  { level: "High", desc: "Funzione core KO", response: "4 ore", resolution: "24 ore", color: "amber" },
  { level: "Medium", desc: "Funzione degradata", response: "24 ore", resolution: "72 ore", color: "blue" }
]

const docs = [
  { id: "dpa", title: "Data Processing Agreement (DPA)", icon: Shield, desc: "Contratto responsabile trattamento dati conforme GDPR art.28.", fields: ["Nome Comando", "Nome Responsabile", "Indirizzo Sede", "Partita IVA"] },
  { id: "registro", title: "Registro Trattamenti Dati (art.30)", icon: FileText, desc: "Documentazione obbligatoria di tutti i trattamenti dati personali.", fields: ["Finalità trattamento", "Categorie dati", "Base giuridica", "Periodo conservazione"] },
  { id: "dpo", title: "Nomina DPO", icon: Scale, desc: "Atto di nomina del Data Protection Officer.", fields: ["Nome DPO", "Email DPO", "Estremi nomina"] },
  { id: "sla", title: "Service Level Agreement", icon: Clock, desc: "Tempi di risposta e risoluzione garantiti.", fields: ["Referente PA", "Email referente", "Telefono emergenze"] }
]

const refs = [
  { label: "CAD", ref: "D.Lgs. 82/2005" }, { label: "GDPR", ref: "UE 2016/679" },
  { label: "NIS2", ref: "D.Lgs. 138/2024" }, { label: "eIDAS", ref: "UE 910/2014" },
  { label: "AgID", ref: "Linee Guida PA" }, { label: "OWASP", ref: "Top 10 2021" },
  { label: "ISO", ref: "27001:2022" }, { label: "WCAG", ref: "2.1 AA" }
]

export default function ComplianceCenter() {
  const [selected, setSelected] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const generatePdf = async (docId: string) => {
    setDownloading(docId)
    const res = await fetch(`/api/admin/generate-compliance-doc?type=${docId}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `${docId}-sentinel.pdf`; a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(null)
  }

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro Conformità PA</h1><p className="text-sm text-slate-500 mt-1 font-medium">Documentazione legale per la Pubblica Amministrazione</p></div>

      {/* SLA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase mb-4">Service Level Agreement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slaLevels.map(sla => (
            <div key={sla.level} className={`bg-${sla.color}-50 border border-${sla.color}-200 rounded-xl p-4`}>
              <span className={`text-xs font-black text-${sla.color}-600 uppercase`}>{sla.level}</span>
              <p className="text-[10px] text-slate-500 mt-1">{sla.desc}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-slate-400">Risposta</span><p className="text-sm font-black">{sla.response}</p></div>
                <div><span className="text-[9px] text-slate-400">Risoluzione</span><p className="text-sm font-black">{sla.resolution}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GDPR Breach */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h3 className="text-sm font-black text-amber-800 uppercase flex items-center gap-2 mb-2"><Clock size={16} /> Obblighi GDPR — Data Breach</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div><p className="font-black text-amber-700">Notifica al Garante (art.33)</p><p className="text-amber-600 mt-1">Entro 72 ore dalla scoperta. Template precompilato disponibile.</p></div>
          <div><p className="font-black text-amber-700">Notifica agli Interessati (art.34)</p><p className="text-amber-600 mt-1">Obbligatoria se rischio elevato per i diritti delle persone.</p></div>
        </div>
      </div>

      {/* Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map(doc => (
          <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><doc.icon size={24} /></div>
              <div className="flex-1">
                <h4 className="font-black text-slate-800 text-sm">{doc.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{doc.desc}</p>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => generatePdf(doc.id)} disabled={downloading === doc.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider disabled:opacity-50">
                    <Download size={12} /> {downloading === doc.id ? "..." : "Genera PDF"}
                  </button>
                  <button onClick={() => setSelected(selected === doc.id ? null : doc.id)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase ${selected === doc.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                    <Eye size={12} className="inline mr-1" /> {selected === doc.id ? "Nascondi" : "Anteprima"}
                  </button>
                </div>
              </div>
            </div>
            {selected === doc.id && (
              <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3">Campi da compilare:</p>
                <div className="space-y-2">
                  {doc.fields.map((f, i) => (
                    <input key={i} type="text" placeholder={f}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:border-indigo-400 focus:outline-none" />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Normative References */}
      <div className="bg-slate-900 text-white rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase mb-4">Riferimenti Normativi</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {refs.map(r => (
            <div key={r.label} className="bg-white/10 rounded-xl p-3">
              <p className="font-black">{r.label}</p>
              <p className="text-white/50 text-[10px] mt-0.5">{r.ref}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
