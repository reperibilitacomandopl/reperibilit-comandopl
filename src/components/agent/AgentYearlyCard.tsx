"use client"

import React, { useState, useEffect } from "react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from "recharts"
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Award, 
  Activity, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2
} from "lucide-react"
import toast from "react-hot-toast"

export default function AgentYearlyCard() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const monthLabels = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/agent/yearly-stats?year=${year}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      
      // Transform data for recharts
      const chartData = json.monthlyStats.map((m: any) => ({
        name: monthLabels[m.month - 1],
        "Ore Ordinarie": m.workHours,
        "Straordinario": m.extraordinaryHours,
        "Recupero": m.recoveryHours
      }))
      
      setData({ ...json, chartData })
    } catch (e) {
      toast.error("Errore nel recupero dati annuali")
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [year])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
        <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Analisi Dati Annuali in corso...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header & Controls */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6 text-left">
            <div className="p-4 bg-indigo-500 rounded-3xl shadow-xl shadow-indigo-500/20">
              <Award className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Cartellino <span className="text-indigo-400">Annuale</span></h2>
              <p className="text-indigo-300/60 font-black text-[10px] uppercase tracking-[0.3em]">Riepilogo Attività & Statistiche • {year}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setYear(year - 1)}
              className="p-2 text-white/50 hover:text-white transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="text-xl font-black text-white w-16 text-center">{year}</span>
            <button 
              onClick={() => setYear(year + 1)}
              className="p-2 text-white/50 hover:text-white transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Ore Lavorate", value: data?.summary.totalWorkHours.toFixed(1), icon: Clock, color: "blue", unit: "h" },
          { label: "Straordinario", value: data?.summary.totalExtra.toFixed(1), icon: TrendingUp, color: "emerald", unit: "h" },
          { label: "Ferie Godute", value: data?.summary.totalLeave, icon: Calendar, color: "amber", unit: "gg" },
          { label: "Malattia", value: data?.summary.totalSick, icon: AlertCircle, color: "rose", unit: "gg" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
            <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{stat.value}</span>
              <span className="text-sm font-bold text-slate-400">{stat.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Bar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <Activity className="text-indigo-500" size={20} />
              Distribuzione Mensile Ore
            </h3>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Lavoro vs Straordinario
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '1rem' }} />
                <Bar dataKey="Ore Ordinarie" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Straordinario" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Recupero" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-8 bg-slate-50 border-b border-slate-100">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Dettaglio Mensile</h3>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-100">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Mese</th>
                  <th className="px-6 py-4 text-center">Ord.</th>
                  <th className="px-6 py-4 text-center text-emerald-600">Stra.</th>
                  <th className="px-6 py-4 text-center text-amber-600">Fer.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.monthlyStats.map((m: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-700 text-xs">{monthLabels[idx]}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{m.workHours.toFixed(0)}h</td>
                    <td className="px-6 py-4 text-center text-xs font-black text-emerald-600">{m.extraordinaryHours > 0 ? `${m.extraordinaryHours.toFixed(0)}h` : '-'}</td>
                    <td className="px-6 py-4 text-center text-xs font-black text-amber-600">{m.leaveDays > 0 ? `${m.leaveDays}gg` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Performance Area Chart */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[300px]">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-indigo-500" size={20} />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Trend Straordinario</h3>
          </div>
          <div className="w-full h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.chartData}>
                <defs>
                  <linearGradient id="colorExtra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="Straordinario" stroke="#10b981" fillOpacity={1} fill="url(#colorExtra)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>

    </div>
  )
}
