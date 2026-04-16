import React from "react"
import { BookOpen, Plus } from "lucide-react"
import { AGENDA_CATEGORIES } from "@/utils/constants"

interface AgentPersonalAgendaProps {
  currentMonthName: string
  currentYear: number
  agendaEntries: any[]
  setShowAgenda: (v: boolean) => void
}

export default function AgentPersonalAgenda({ 
  currentMonthName, 
  currentYear, 
  agendaEntries, 
  setShowAgenda 
}: AgentPersonalAgendaProps) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900/90 to-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/15 rounded-full -mr-20 -mt-20 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
            <BookOpen size={24} className="text-purple-300" />
          </div>
          <div>
            <h3 className="text-lg font-black">Agenda Personale</h3>
            <p className="text-purple-300/80 text-[10px] font-bold uppercase tracking-widest">{currentMonthName} {currentYear}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
            <span className="text-2xl font-black block">{agendaEntries.length}</span>
            <span className="text-[8px] uppercase tracking-widest text-purple-300/70 font-bold">Voci</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
            <span className="text-2xl font-black block">{agendaEntries.filter(e => e.hours).reduce((a, e) => a + (e.hours || 0), 0)}</span>
            <span className="text-[8px] uppercase tracking-widest text-purple-300/70 font-bold">Ore</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 text-center border border-white/5">
            <span className="text-2xl font-black block">{new Set(agendaEntries.map(e => new Date(e.date).getUTCDate())).size}</span>
            <span className="text-[8px] uppercase tracking-widest text-purple-300/70 font-bold">Giorni</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-5">
          {AGENDA_CATEGORIES.map(cat => {
            const count = agendaEntries.filter(e => cat.items.some(i => i.code === e.code)).length
            if (count === 0) return null
            return (
              <span key={cat.group} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-[9px] font-bold text-white/80">
                <span>{cat.emoji}</span> {count}
              </span>
            )
          })}
        </div>

        <button 
          onClick={() => setShowAgenda(true)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-purple-900/50 active:scale-[0.97]"
        >
          <Plus size={18} />
          Gestisci Agenda
        </button>
      </div>
    </div>
  )
}
