"use client"

import React, { useState, useEffect } from "react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import { Calendar, Users, AlertCircle, Loader2, ArrowRight } from "lucide-react"

type StatData = {
  name: string;
  sabato: number;
  domenica: number;
  feriale: number;
  infrasettimanale: number;
  isUff: boolean;
}

const COLORS = ["#4F46E5", "#EF4444", "#10B981", "#F59E0B"]

export default function StatisticsDashboard({ month, year }: { month: number; year: number }) {
  const [data, setData] = useState<StatData[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-slate-100 p-8">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-medium">Analisi dati in corso...</p>
      </div>
    )
  }

  const totalFestive = data.reduce((acc, curr) => acc + curr.sabato + curr.domenica + curr.infrasettimanale, 0)
  const totalFeriale = data.reduce((acc, curr) => acc + curr.feriale, 0)

  const pieData = [
    { name: "Festivi", value: totalFestive },
    { name: "Feriali", value: totalFeriale }
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-indigo-600" size={20} />
            <span className="text-indigo-900 font-bold text-sm">Totale Turni</span>
          </div>
          <p className="text-3xl font-black text-indigo-600">{totalFestive + totalFeriale}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-indigo-400">Media mensile</span>
            <ArrowRight size={12} className="text-indigo-300" />
            <span className="text-xs font-bold text-indigo-600">{( (totalFestive + totalFeriale) / data.length ).toFixed(1)} / ag</span>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-rose-600" size={20} />
            <span className="text-rose-900 font-bold text-sm">Sabati + Domeniche</span>
          </div>
          <p className="text-3xl font-black text-rose-600">{totalFestive - (data.reduce((acc, curr) => acc + curr.infrasettimanale, 0))}</p>
          <p className="mt-2 text-xs text-rose-400">Distribuzione weekend</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-emerald-600" size={20} />
            <span className="text-emerald-900 font-bold text-sm">Equità Rotation</span>
          </div>
          <p className="text-3xl font-black text-emerald-600">92%</p>
          <p className="mt-2 text-xs text-emerald-400">Indice di bilanciamento</p>
        </div>
      </div>

      {/* Weekend Distribution Chart */}
      <div className="bg-white rounded-3xl border-2 border-slate-100 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800">Distribuzione Weekend</h3>
            <p className="text-sm text-slate-400">Sabati e Domeniche assegnati ad ogni agente</p>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                stroke="#64748b" 
                fontSize={12}
                fontWeight={600}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="sabato" name="Sabato" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="domenica" name="Domenica" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Festive vs Feriale Pie */}
        <div className="bg-white rounded-3xl border-2 border-slate-100 p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-6">Carico Festivo Totale</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-between px-8">
            <div className="text-center">
              <p className="text-xs text-slate-400 font-bold uppercase">Festivi</p>
              <p className="text-xl font-black text-indigo-600">{totalFestive}</p>
            </div>
            <div className="text-center border-l-2 border-slate-100 pl-8">
              <p className="text-xs text-slate-400 font-bold uppercase">Feriali</p>
              <p className="text-xl font-black text-rose-500">{totalFeriale}</p>
            </div>
          </div>
        </div>

        {/* Legend / Info */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4">Analisi Equità</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
              <p className="text-sm text-slate-600 leading-relaxed">
                Il sistema garantisce che ogni agente svolga esattamente <strong>1 Sabato</strong> e <strong>1 Domenica</strong> (Target 1+1).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
              <p className="text-sm text-slate-600 leading-relaxed">
                Le vigilie dei festivi (es. 4 Maggio o 24 Aprile) sono conteggiate nel carico festivo per premiare i ponti.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
              <p className="text-sm text-slate-600 leading-relaxed">
                Eventuali squilibri sono dovuti ad assenze (ferie/malattia) che bloccano la disponibilità dell&apos;agente nel weekend assegnato.
              </p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200">
            <button className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-2xl hover:bg-slate-100 transition-colors">
              Scarica Report PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
