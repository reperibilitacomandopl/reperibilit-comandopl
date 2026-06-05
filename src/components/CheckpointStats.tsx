"use client"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { MapPin, AlertTriangle, FileText, CheckCircle, BarChart3 } from 'lucide-react'

export default function CheckpointStats({ stats, isDark }: { stats: any, isDark: boolean }) {
  const cardBg = isDark ? "bg-slate-900 border-white/5" : "bg-white border-slate-200"
  const mutedText = isDark ? "text-white/40" : "text-slate-400"
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"

  // Dati per i grafici
  const statusData = [
    { name: 'Regolari', value: stats.veicoliTotali - stats.veicoliConSanzione, color: '#10b981' },
    { name: 'Sanzionati', value: stats.veicoliConSanzione, color: '#f59e0b' }
  ]

  // Top 5 Sanzioni
  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']
  const sanzioniData = stats.sanzioniPerArticolo && stats.sanzioniPerArticolo.length > 0 
    ? stats.sanzioniPerArticolo.map((s: any, idx: number) => ({
        name: s.descrizione.length > 25 ? s.descrizione.substring(0, 25) + '...' : s.descrizione,
        fullName: s.descrizione,
        value: s.count,
        color: colors[idx % colors.length]
      }))
    : [
        { name: 'Nessuna Sanzione', value: 0, color: '#cbd5e1' }
      ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Andamento Mensile */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 className="text-blue-500" size={18} /> Andamento Mensile
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.andamentoMensile} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="mese" stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} fontSize={10} tickMargin={10} />
                <YAxis stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"} fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" name="Veicoli" dataKey="veicoli" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Controlli" dataKey="controlli" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Esito Controlli e Anomalie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm flex flex-col`}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={18} /> Esito
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {statusData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs font-bold">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div> {d.name}
                </div>
              ))}
            </div>
          </div>

          <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm flex flex-col`}>
            <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={18} /> Top Sanzioni
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sanzioniData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} stroke={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)"} fontSize={11} fontWeight="bold" width={120} />
                  <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} 
                    formatter={(value: any, name: any, props: any) => [value, props.payload.fullName]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {sanzioniData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Luoghi */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <MapPin className="text-indigo-500" size={18} /> Top 10 Luoghi
          </h3>
          <div className="space-y-3">
            {stats.controlliPerLuogo.length === 0 ? (
              <p className={`text-sm ${mutedText}`}>Nessun dato disponibile</p>
            ) : (
              stats.controlliPerLuogo.map((l: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i < 3 ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold truncate max-w-[200px]">{l.luogo}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDark ? "bg-white/5" : "bg-slate-100"}`}>
                    {l.totale} controlli
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Targhe Recidive */}
        <div className={`p-6 rounded-3xl border ${cardBg} shadow-sm`}>
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText className="text-amber-500" size={18} /> Targhe Recidive
          </h3>
          <div className="space-y-3">
            {stats.targheMultiple.length === 0 ? (
              <p className={`text-sm ${mutedText}`}>Nessun dato disponibile</p>
            ) : (
              stats.targheMultiple.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-black tracking-widest text-blue-500">{t.targa}</span>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                    Controllata {t.volte} volte
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
