"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts'
import {
  MapPin, AlertTriangle, FileText, CheckCircle, BarChart3,
  Car, ShieldAlert, Users, Clock, TrendingUp, ShieldCheck, Award
} from 'lucide-react'

export default function CheckpointStats({ stats, isDark }: { stats: any, isDark: boolean }) {
  const cardBg = isDark ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
  const mutedText = isDark ? "text-white/50" : "text-slate-500"
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"

  // Dati per i grafici
  const statusData = [
    { name: 'Regolari', value: Math.max(0, (stats.veicoliTotali || 0) - (stats.veicoliConSanzione || 0)), color: '#10b981' },
    { name: 'Sanzionati', value: stats.veicoliConSanzione || 0, color: '#f59e0b' }
  ]

  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']
  const sanzioniData = stats.sanzioniPerArticolo && stats.sanzioniPerArticolo.length > 0 
    ? stats.sanzioniPerArticolo.map((s: any, idx: number) => ({
        name: s.descrizione.length > 28 ? s.descrizione.substring(0, 28) + '...' : s.descrizione,
        fullName: s.descrizione,
        value: s.count,
        color: colors[idx % colors.length]
      }))
    : [
        { name: 'Nessuna Sanzione', value: 0, color: '#cbd5e1' }
      ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* CARD KPI SUPERIORI ( 4 METRICHE CHIAVE ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Controlli Eseguiti */}
        <div className={`p-5 rounded-3xl border ${cardBg} shadow-sm relative overflow-hidden flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>Controlli Totali</span>
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black tracking-tight">{stats.controlliTotali || 0}</span>
            <span className="text-xs font-bold opacity-60 ml-2">Servizi registrati</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400">Oggi: {stats.controlliOggi || 0}</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400">Mese: {stats.controlliMese || 0}</span>
          </div>
        </div>

        {/* KPI 2: Veicoli Verificati */}
        <div className={`p-5 rounded-3xl border ${cardBg} shadow-sm relative overflow-hidden flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>Veicoli Verificati</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Car size={20} />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black tracking-tight">{stats.veicoliTotali || 0}</span>
            <span className="text-xs font-bold opacity-60 ml-2">Targhe verificate</span>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 text-[11px] font-bold text-emerald-400">
            <TrendingUp size={14} />
            <span>Media {stats.mediaVeicoli || 0} veicoli per servizio</span>
          </div>
        </div>

        {/* KPI 3: Sanzioni CdS Elevate */}
        <div className={`p-5 rounded-3xl border ${cardBg} shadow-sm relative overflow-hidden flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>Sanzioni Elevate</span>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black tracking-tight text-amber-500">{stats.veicoliConSanzione || 0}</span>
            <span className="text-xs font-bold opacity-60 ml-2">Infrazioni CdS</span>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] font-bold text-amber-400">
            <span>Tasso infrazione: {stats.percSanzioni || 0}%</span>
          </div>
        </div>

        {/* KPI 4: Irregolarità Documentali */}
        <div className={`p-5 rounded-3xl border ${cardBg} shadow-sm relative overflow-hidden flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-widest ${mutedText}`}>Anomalie Documenti</span>
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-black text-rose-500">{stats.veicoliRevisioneScaduta || 0}</span>
              <span className="text-[10px] font-bold block text-rose-400 uppercase">Rev. Scaduta</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="text-2xl font-black text-rose-400">{stats.veicoliAssicurazioneScaduta || 0}</span>
              <span className="text-[10px] font-bold block text-rose-300 uppercase">No Assicuraz.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] font-bold text-rose-400">
            <span>Rilevamenti da verbali / OCR</span>
          </div>
        </div>

      </div>

      {/* GRAFICI PRINCIPALI: ANDAMENTO E FASCE ORARIE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Grafico Andamento Mensile (occupa 2/3) */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="text-blue-500" size={18} /> Andamento Mensile Controlli & Veicoli
              </h3>
              <p className={`text-xs ${mutedText} mt-0.5`}>Volume di attività registrato negli ultimi 12 mesi</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.andamentoMensile} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorVeicoli" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorControlli" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="mese" stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontSize={10} tickMargin={10} />
                <YAxis stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" name="Veicoli Verificati" dataKey="veicoli" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorVeicoli)" />
                <Area type="monotone" name="Posti di Controllo" dataKey="controlli" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorControlli)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico Distribuzione Fasce Orarie (occupa 1/3) */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm flex flex-col justify-between`}>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
              <Clock className="text-purple-500" size={18} /> Fasce Orarie
            </h3>
            <p className={`text-xs ${mutedText} mb-4`}>Distribuzione dei posti di controllo nell'arco della giornata</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.fasceOrarie || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="fascia" stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontSize={10} />
                <YAxis stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)"} fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                <Bar dataKey="count" name="Controlli" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* RIGA ESITO CONTROLLI E TOP SANZIONI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Esito Controlli (Donut Chart) */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm flex flex-col`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={18} /> Esito Verifiche Veicoli
          </h3>
          <p className={`text-xs ${mutedText} mb-4`}>Proporzione tra veicoli in regola e sanzionati</p>
          
          <div className="flex-1 min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={6} dataKey="value">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black">{stats.veicoliTotali || 0}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Totale</span>
            </div>
          </div>

          <div className="flex justify-center gap-6 mt-2 pt-3 border-t border-white/5">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs font-bold">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div> 
                <span>{d.name}:</span>
                <span className="font-mono text-sm">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Sanzioni CdS Contestati */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm flex flex-col`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <ShieldAlert className="text-rose-500" size={18} /> Top Articoli CdS Contestati
          </h3>
          <p className={`text-xs ${mutedText} mb-4`}>Infrazioni più frequenti riscontrate nei controlli</p>
          
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sanzioniData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} stroke={isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)"} fontSize={11} fontWeight="bold" width={140} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} 
                  formatter={(value: any, name: any, props: any) => [value, props.payload.fullName]}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                  {sanzioniData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* CLASSIFICHE: TOP LUOGHI, OPERATORI ATTIVI E TARGHE RECIDIVE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Luoghi */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <MapPin className="text-indigo-500" size={18} /> Top 10 Luoghi di Controllo
          </h3>
          <p className={`text-xs ${mutedText} mb-4`}>Vie e piazze più presidiate</p>
          
          <div className="space-y-2.5">
            {(!stats.controlliPerLuogo || stats.controlliPerLuogo.length === 0) ? (
              <p className={`text-sm ${mutedText}`}>Nessun dato disponibile</p>
            ) : (
              stats.controlliPerLuogo.map((l: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${i < 3 ? 'bg-indigo-600 text-white shadow-md' : isDark ? 'bg-white/10 text-white/50' : 'bg-slate-200 text-slate-600'}`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-bold truncate">{l.luogo}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 shrink-0">
                    {l.totale} serv.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Operatori / Pattuglie */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <Award className="text-purple-400" size={18} /> Agenti Più Attivi nei Servizi
          </h3>
          <p className={`text-xs ${mutedText} mb-4`}>Classifica presenze nei posti di controllo</p>
          
          <div className="space-y-2.5">
            {(!stats.topOperatori || stats.topOperatori.length === 0) ? (
              <p className={`text-sm ${mutedText}`}>Nessun operatore registrato</p>
            ) : (
              stats.topOperatori.map((op: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${i === 0 ? 'bg-amber-500 text-slate-950 font-black shadow-md' : i < 3 ? 'bg-purple-600 text-white' : isDark ? 'bg-white/10 text-white/50' : 'bg-slate-200 text-slate-600'}`}>
                      {i + 1}
                    </div>
                    <span className="text-xs font-bold truncate">{op.nome}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 shrink-0">
                    {op.totale} serv.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Targhe Recidive */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <FileText className="text-amber-500" size={18} /> Targhe Controllate Più Volte
          </h3>
          <p className={`text-xs ${mutedText} mb-4`}>Veicoli sottoposti a verifiche multiple</p>
          
          <div className="space-y-2.5">
            {(!stats.targheMultiple || stats.targheMultiple.length === 0) ? (
              <p className={`text-sm ${mutedText}`}>Nessuna targa recidiva trovata</p>
            ) : (
              stats.targheMultiple.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                  <span className="text-xs font-black tracking-widest text-amber-400 font-mono">{t.targa}</span>
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md">
                    {t.volte} verifiche
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
