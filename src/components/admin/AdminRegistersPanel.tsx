"use client"

import { useState, useEffect } from "react"
import { Clock, WalletCards, LogIn, LogOut, Search, Activity, CheckCircle2, Save } from "lucide-react"

export default function AdminRegistersPanel() {
  const [activeTab, setActiveTab] = useState('clock') // 'clock' | 'balances'
  
  return (
    <div className="space-y-6">
       <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200 w-full sm:w-fit">
          <button 
             onClick={() => setActiveTab('clock')}
             className={`flex-1 sm:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'clock' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
             <div className="flex items-center justify-center gap-2"><Clock size={16} /> Cartellini</div>
          </button>
          <button 
             onClick={() => setActiveTab('balances')}
             className={`flex-1 sm:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'balances' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
             <div className="flex items-center justify-center gap-2"><WalletCards size={16} /> Saldi Ferie</div>
          </button>
       </div>

       {activeTab === 'clock' ? <AdminClockMonitor /> : <AdminBalancesPanel />}
    </div>
  )
}

function AdminClockMonitor() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch("/api/admin/clock-records")
      .then(res => res.json())
      .then(data => {
        if (data.records) setRecords(data.records)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredRecords = records.filter((r: any) => 
     r.user?.name.toLowerCase().includes(search.toLowerCase()) || 
     r.user?.matricola.includes(search)
  )

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
         <div>
            <h3 className="text-xl font-black text-slate-800">Monitoraggio Cartellini Oggi</h3>
            <p className="text-sm font-medium text-slate-500">Ultime registrazioni GPS e manuali</p>
         </div>
         <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cerca agente o matricola..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
         </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12"><Activity className="animate-spin text-slate-300" size={32} /></div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-sm">Nessuna timbratura registrata oggi.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredRecords.map((r: any) => {
              const isEnter = r.type === "SCENDI_IN_STRADA" || r.type === "INIZIO_TURNO"
              return (
                 <div key={r.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-4 hover:shadow-md transition-all">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isEnter ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                       {isEnter ? <LogIn size={24} /> : <LogOut size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-black text-slate-800 truncate">{r.user?.name}</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Matr. {r.user?.matricola}</p>
                       <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isEnter ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isEnter ? 'Entrato' : 'Uscito'}
                          </span>
                          <span className="text-sm font-black text-slate-900">
                             {new Date(r.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </div>
                 </div>
              )
           })}
        </div>
      )}
    </div>
  )
}

function AdminBalancesPanel() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Local state for edits
  const [editableFer, setEditableFer] = useState<{[key:string]: string}>({})

  const year = new Date().getFullYear()

  useEffect(() => {
    fetch(`/api/admin/balances?year=${year}`)
      .then(res => res.json())
      .then(d => {
        if (!d.error) {
           setData(d)
           const newFer: any = {}
           d.agents.forEach((agent: any) => {
              const balance = d.balances.find((b:any) => b.userId === agent.id)
              const detail = balance?.details.find((bd:any) => bd.code === '0015' || bd.code === 'FERIE')
              newFer[agent.id] = detail ? detail.initialValue.toString() : "32"
           })
           setEditableFer(newFer)
        }
      })
      .finally(() => setLoading(false))
  }, [year])

  const handleSaveAll = async () => {
    setSaving(true)
    const updates = []
    
    for (const agent of data.agents) {
       updates.push({
          userId: agent.id,
          code: "0015",
          label: "Ferie Ordinarie",
          initialValue: parseFloat(editableFer[agent.id] || "0"),
          unit: "DAYS"
       })
    }

    await fetch("/api/admin/balances", {
       method: "PUT",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ year, updates })
    })

    setSaving(false)
    alert("Saldi aggiornati con successo!")
  }

  if (loading) return <div className="flex justify-center py-12"><Activity className="animate-spin text-slate-300" size={32} /></div>

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
         <div>
            <h3 className="text-2xl font-black text-slate-800">Saldi Ferie {year}</h3>
            <p className="text-sm font-medium text-slate-500">Configura le spettanze base per gli agenti. (I consumi vengono scalati in automatico dai turni approvati).</p>
         </div>
         <button 
           onClick={handleSaveAll}
           disabled={saving}
           className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 disabled:opacity-50 transition-all w-full md:w-auto"
         >
           {saving ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
           Salva Tutti i Saldi
         </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
         <table className="w-full text-left border-collapse">
            <thead>
               <tr>
                  <th className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 p-4 border-b border-slate-200">Agente</th>
                  <th className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 p-4 border-b border-slate-200 text-center">Ferie Spettanti</th>
                  <th className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 p-4 border-b border-slate-200 text-center">Ferie Consumate</th>
                  <th className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 p-4 border-b border-slate-200 text-center">Residuo</th>
               </tr>
            </thead>
            <tbody>
               {data.agents.map((agent: any) => {
                  const used = data.usage?.shiftsCount?.filter((s:any) => s.userId === agent.id && (s.type === '0015' || s.type === 'FERIE')).reduce((acc:any, curr:any) => acc + curr._count._all, 0) || 0
                  const initial = parseFloat(editableFer[agent.id] || "0")
                  const residue = Math.max(0, initial - used)

                  return (
                     <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                        <td className="p-4">
                           <p className="font-black text-slate-800 text-sm">{agent.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matr. {agent.matricola}</p>
                        </td>
                        <td className="p-4 text-center">
                           <input 
                             type="number"
                             value={editableFer[agent.id] || ''}
                             onChange={e => setEditableFer({...editableFer, [agent.id]: e.target.value})}
                             className="w-20 text-center bg-white border border-slate-200 rounded-lg py-2 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                           />
                        </td>
                        <td className="p-4 text-center">
                           <span className="inline-flex items-center justify-center min-w-[2rem] h-8 bg-slate-100 rounded-lg font-black text-slate-600 text-sm">
                             {used}
                           </span>
                        </td>
                        <td className="p-4 text-center">
                           <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-8 rounded-lg font-black text-sm px-2 ${residue === 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                             {residue} g
                           </span>
                        </td>
                     </tr>
                  )
               })}
            </tbody>
         </table>
      </div>
    </div>
  )
}
