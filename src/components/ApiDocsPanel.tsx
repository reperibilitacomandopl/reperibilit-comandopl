"use client"

import { Code2, Hash, Key, ExternalLink, Activity, Server, FileJson } from "lucide-react"

export default function ApiDocsPanel() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/shifts",
      desc: "Recupera i turni del mese corrente o di uno specifico mese.",
      params: "?year=YYYY&month=MM"
    },
    {
      method: "GET",
      path: "/api/admin/export-paghe",
      desc: "Genera il tracciato formattato per i software paghe della Ragioneria.",
      params: "?year=YYYY&month=MM"
    },
    {
      method: "POST",
      path: "/api/admin/overtime",
      desc: "Inserisce o sovrascrive un record di lavoro straordinario o assenza codificata.",
      params: 'Body JSON: { "userId": "<uuid>", "date": "YYYY-MM-DD", "hours": 2, "code": "2000" }'
    },
    {
       method: "POST",
       path: "/api/announcements",
       desc: "Invia una comunicazione/avviso in bacheca con eventuale obbligo di lettura.",
       params: 'Body JSON: { "title": "...", "body": "...", "priority": "URGENT", "requiresRead": true }'
    }
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-up">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl"><Server className="w-6 h-6" /></div>
              <h1 className="text-2xl font-black tracking-tight">Sentinel API REST</h1>
            </div>
            <p className="text-slate-400 font-medium ml-11">Interfacce standardizzate per CED e Sistemi Gestionali esterni.</p>
          </div>
          <div className="px-5 py-2 bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-700">
             <Activity className="w-4 h-4 text-emerald-400" />
             <span className="text-xs font-bold font-mono text-slate-300">v1.2.0-stable</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-2 text-slate-800"><Key className="w-4 h-4 text-indigo-500" /> Autenticazione</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
               Le API utilizzano cookie di sessione. Le chiamate programmatiche server-to-server possono essere autorizzate fornendo il Bearer Token (nella roadmap imminente) negli header HTTP: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded ml-1">Authorization: Bearer &lt;Token&gt;</code>. Attualmente supportato solo tramite NextAuth Session.
            </p>
         </div>
         <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-2 text-slate-800"><FileJson className="w-4 h-4 text-rose-500" /> Payload Data</h3>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
               Tutti i body di invio e le risposte del server (eccetto download diretti) seguono lo standard JSON puro. Inviare sempre l'header HTTP <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded ml-1">Content-Type: application/json</code>.
            </p>
         </div>
      </div>

      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden group">
             <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 border-b border-slate-100 bg-white">
                <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-widest uppercase ${ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{ep.method}</span>
                <span className="font-mono text-sm font-bold text-slate-800 flex-1 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-slate-400" /> {ep.path}</span>
             </div>
             <div className="px-5 py-4 space-y-3">
                <p className="text-sm font-semibold text-slate-600 leading-relaxed">{ep.desc}</p>
                <div className="bg-slate-800 text-emerald-400 font-mono text-[11px] p-3 rounded-xl border border-slate-700/50 shadow-inner overflow-x-auto whitespace-pre">
                   {ep.params}
                </div>
             </div>
          </div>
        ))}
      </div>
      
      <div className="text-center py-6 border-t border-slate-200">
         <p className="text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
            Per ulteriori query consultare lo <ExternalLink className="w-3.5 h-3.5" /> <a href="#" className="underline hover:text-indigo-600 transition-colors">Schema Prisma Data Model</a>
         </p>
      </div>
    </div>
  )
}
