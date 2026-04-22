"use client"

import dynamic from "next/dynamic"

const ControlRoomMap = dynamic(() => import("./ControlRoomMap"), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-50 rounded-[2.5rem] border border-slate-200 animate-pulse items-center justify-center">
      <p className="text-slate-400 font-black uppercase tracking-widest text-xs text-center p-8">Inizializzazione Sistemi GPS...</p>
    </div>
  )
})

export default function MapWrapper() {
  return <ControlRoomMap />
}
