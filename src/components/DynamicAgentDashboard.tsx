"use client"
import dynamic from "next/dynamic"
import { RefreshCw } from "lucide-react"

const AgentDashboard = dynamic(() => import("./AgentDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
      <RefreshCw size={40} className="text-slate-200 animate-spin mb-4" />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Caricamento Dashboard...</p>
    </div>
  )
})

export default function DynamicAgentDashboard(props: any) {
  return <AgentDashboard {...props} />
}
