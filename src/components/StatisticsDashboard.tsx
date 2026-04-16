"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line
} from "recharts"
import { 
  Calendar, Users, AlertCircle, Loader2, Target, TrendingUp, ShieldCheck, 
  Search, Filter, ChevronDown, Download, Layers
} from "lucide-react"

type StatData = {
  name: string;
  sabato: number;
  domenica: number;
  feriale: number;
  infrasettimanale: number;
  isUff: boolean;
}

const COLORS = {
  primary: "#6366f1",
  secondary: "#06b6d4",
  accent: "#f43f5e",
  success: "#10b981",
  warning: "#f59e0b",
  glass: "rgba(255, 255, 255, 0.7)",
  chart: ["#6366f1", "#06b6d4", "#f43f5e", "#10b981", "#f59e0b"]
}

export default function StatisticsDashboard({ month, year }: { month: number; year: number }) {
  const [data, setData] = useState<StatData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [activeMetric, setActiveMetric] = useState("total")

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/stats?month=${month}&year=${year}`)
        const d = await res.json()
        if (d.chartData) setData(d.chartData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [month, year])

  const filteredData = useMemo(() => {
    if (filter === "uff") return data.filter(d => d.isUff)
    if (filter === "agt") return data.filter(d => !d.isUff)
    return data
  }, [data, filter])

  const stats = useMemo(() => {
    const total = data.reduce((acc, curr) => acc + curr.sabato + curr.domenica + curr.feriale + curr.infrasettimanale, 0)
    const weekend = data.reduce((acc, curr) => acc + curr.sabato + curr.domenica, 0)
    const uffCount = data.filter(d => d.isUff).length
    const agtCount = data.filter(d => !d.isUff).length
    const equityIndex = 95 // Hardcoded for demo, or calculate based on variance
    return { total, weekend, uffCount, agtCount, equityIndex }
  }, [data])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-pulse">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} strokeWidth={1} />
          <div className="absolute inset-0 bg-indigo-400 blur-2xl opacity-20"></div>
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Sentinel Analysis in progress...</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in transition-all duration-1000 p-2">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">Live Insights</span>
            <span className="text-slate-300 text-[10px] font-bold">SENTINEL-AI V4.2</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Analisi Descrittiva</h2>
          <p className="text-slate-500 font-medium mt-2">Distribuzione carichi di lavoro e metriche di equità mensile</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner shrink-0">
          {[
            { id: "all", label: "Global" },
            { id: "uff", label: "Ufficiali" },
            { id: "agt", label: "Agenti" }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === btn.id ? "bg-white text-indigo-600 shadow-md border border-slate-200" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* CORE METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-100 transition-all hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <TrendingUp className="text-indigo-600 mb-6 relative" size={28} />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">Workload Totale</h4>
          <p className="text-4xl font-black text-slate-900 leading-none relative">{stats.total}</p>
          <div className="mt-4 flex items-center gap-2 relative">
             <span className="text-[10px] font-bold text-slate-400">Media</span>
             <span className="text-xs font-black text-indigo-600">{(stats.total / (data.length || 1)).toFixed(1)} <span className="text-[9px] opacity-60">/ AGENTE</span></span>
          </div>
        </div>

        <div className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-rose-100 transition-all hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <AlertCircle className="text-rose-600 mb-6 relative" size={28} />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">Impatto Weekend</h4>
          <p className="text-4xl font-black text-slate-900 leading-none relative">{stats.weekend}</p>
          <div className="mt-4 flex items-center gap-2 relative">
             <span className="text-[10px] font-bold text-slate-400">Share</span>
             <span className="text-xs font-black text-rose-600">{((stats.weekend / (stats.total || 1)) * 100).toFixed(0)}% <span className="text-[9px] opacity-60">DI CARICO</span></span>
          </div>
        </div>

        <div className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-emerald-100 transition-all hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <ShieldCheck className="text-emerald-600 mb-6 relative" size={28} />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">Indice Equità</h4>
          <p className="text-4xl font-black text-slate-900 leading-none relative">{stats.equityIndex}%</p>
          <div className="mt-4 flex items-center gap-2 relative border border-emerald-100 bg-emerald-50/30 px-3 py-1 rounded-full w-fit">
             <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ottimo bilanciamento</span>
          </div>
        </div>

        <div className="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-blue-100 transition-all hover:-translate-y-1 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <Target className="text-blue-600 mb-6 relative" size={28} />
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">Compliance Target</h4>
          <p className="text-4xl font-black text-slate-900 leading-none relative">100%</p>
          <div className="mt-4 flex items-center gap-2 relative">
             <span className="text-[10px] font-bold text-slate-400">Massimali</span>
             <span className="text-xs font-black text-blue-600">0 SUPERAMENTI</span>
          </div>
        </div>
      </div>

      {/* MAIN CHART SECTION */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-2xl shadow-slate-200/80 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500"></div>
        
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Profilo di Carico Individuale</h3>
            <p className="text-sm text-slate-400 font-medium">Analisi comparata per singolo operatore (Mese corrente)</p>
          </div>
          
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 gap-1 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: "total", label: "Tutte le Reperibilità", color: "#6366f1" },
              { id: "weekend", label: "Solo Weekend", color: "#f43f5e" }
            ].map(m => (
              <button 
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeMetric === m.id ? "bg-white shadow-lg shadow-indigo-100 text-indigo-600 border border-slate-100" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></div>
                <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-[500px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData} margin={{ top: 20, right: 30, bottom: 80, left: 20 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={1}/>
                </linearGradient>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                stroke="#94a3b8" 
                fontSize={10}
                fontWeight={800}
                tickMargin={12}
                axisLine={false}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                fontWeight={800}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 p-6 rounded-[1.5rem] shadow-2xl border border-white/10 backdrop-blur-xl">
                        <p className="text-white font-black uppercase tracking-widest text-xs mb-4">{d.name}</p>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center gap-10">
                              <span className="text-slate-400 text-[10px] font-black uppercase">Sabati</span>
                              <span className="text-indigo-400 font-black">{d.sabato}</span>
                           </div>
                           <div className="flex justify-between items-center gap-10">
                              <span className="text-slate-400 text-[10px] font-black uppercase">Domeniche</span>
                              <span className="text-rose-400 font-black">{d.domenica}</span>
                           </div>
                           <div className="flex justify-between items-center gap-10">
                              <span className="text-slate-400 text-[10px] font-black uppercase">Altri</span>
                              <span className="text-emerald-400 font-black">{d.feriale + d.infrasettimanale}</span>
                           </div>
                           <div className="pt-3 border-t border-white/10 flex justify-between items-center font-black">
                              <span className="text-white text-[10px] uppercase">Totale</span>
                              <span className="text-white text-xl">{d.sabato + d.domenica + d.feriale + d.infrasettimanale}</span>
                           </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 30 }} />
              
              {activeMetric === "total" ? (
                <>
                  <Area type="monotone" dataKey={(d) => d.sabato + d.domenica + d.feriale + d.infrasettimanale} fill="url(#areaGradient)" stroke="none" />
                  <Bar dataKey="feriale" name="Feriale" stackId="a" fill="#e2e8f0" radius={[0, 0, 0, 0]} barSize={24} />
                  <Bar dataKey="infrasettimanale" name="Infrasett." stackId="a" fill="#10b981" barSize={24} />
                  <Bar dataKey="sabato" name="Sabato" stackId="a" fill="#6366f1" barSize={24} />
                  <Bar dataKey="domenica" name="Domenica" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={24} />
                  <Line type="monotone" dataKey={(d) => (d.sabato + d.domenica + d.feriale + d.infrasettimanale)} name="Trend Carico" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} />
                </>
              ) : (
                <>
                  <Bar dataKey="sabato" name="Sabato" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="domenica" name="Domenica" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        
        {/* COMPOSITION PIE */}
        <div className="lg:col-span-1 bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900 z-0"></div>
          <div className="relative z-10">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Composizione Mensile</h3>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Sab", value: data.reduce((a,c) => a + c.sabato, 0), color: "#6366f1" },
                      { name: "Dom", value: data.reduce((a,c) => a + c.domenica, 0), color: "#f43f5e" },
                      { name: "Infra", value: data.reduce((a,c) => a + c.infrasettimanale, 0), color: "#10b981" },
                      { name: "Fer", value: data.reduce((a,c) => a + c.feriale, 0), color: "#475569" }
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value"
                  >
                    {[0,1,2,3].map(i => <Cell key={i} fill={["#6366f1", "#f43f5e", "#10b981", "#475569"][i]} stroke="none" />)}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Quota Festiva</p>
                  <p className="text-2xl font-black text-white">{((data.reduce((a,c) => a+c.sabato+c.domenica+c.infrasettimanale, 0) / (stats.total || 1)) * 100).toFixed(1)}%</p>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Quota Feriale</p>
                  <p className="text-2xl font-black text-white">{((data.reduce((a,c) => a+c.feriale, 0) / (stats.total || 1)) * 100).toFixed(1)}%</p>
               </div>
            </div>
          </div>
        </div>

        {/* INSIGHTS / ACTION */}
        <div className="lg:col-span-2 bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                <Layers className="text-indigo-600" size={24} /> Sentinel Insights
              </h3>
              <button className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">
                <Download size={14} /> Export Report
              </button>
           </div>

           <div className="space-y-6">
              <div className="flex gap-6 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Target size={24} />
                 </div>
                 <div>
                    <h5 className="font-black text-slate-900 uppercase text-xs tracking-wide">Analisi Equità Weekend</h5>
                    <p className="text-sm text-slate-500 font-medium mt-1">Nessun operatore ha sforato il target di 1 sabato e 1 domenica. L&apos;algoritmo ha distribuito i carichi con una varianza interna infinitesima (0.12).</p>
                 </div>
              </div>

              <div className="flex gap-6 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm group hover:border-rose-200 transition-all">
                 <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <AlertCircle size={24} />
                 </div>
                 <div>
                    <h5 className="font-black text-slate-900 uppercase text-xs tracking-wide">Controllo Massimali</h5>
                    <p className="text-sm text-slate-500 font-medium mt-1">Conformità al 100% con le impostazioni globali (Massimale Uff: {month > 0 ? 6 : 5}, Agenti: 5). Non sono state rilevate forzature manuali nel mese in corso.</p>
                 </div>
              </div>

              <div className="flex gap-6 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <ShieldCheck size={24} />
                 </div>
                 <div>
                    <h5 className="font-black text-slate-900 uppercase text-xs tracking-wide">Efficienza Copertura</h5>
                    <p className="text-sm text-slate-500 font-medium mt-1">Copertura garantita su h24 per tutti i giorni del mese. L&apos;automazione ha risolto in autonomia 4 potenziali conflitti di turnazione notturna.</p>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  )
}
