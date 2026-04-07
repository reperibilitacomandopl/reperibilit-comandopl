"use client"

import dynamic from "next/dynamic"

const ServiceOrderDashboard = dynamic(() => import("@/components/ServiceOrderDashboard"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">
      CARICAMENTO MOTORE PDF...
    </div>
  )
})

export default function ServiceOrderClient() {
  return <ServiceOrderDashboard />
}
