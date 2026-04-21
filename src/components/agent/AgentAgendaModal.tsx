"use client"

import { useState } from "react"
import { X, BookOpen, Search, Plus, Trash2 } from "lucide-react"
import { CAT_COLORS } from "@/utils/constants"
import { AGENDA_CATEGORIES, getCategoryForCode } from "@/utils/agenda-codes"
import { AgendaItem } from "@/types/dashboard"

interface AgentAgendaModalProps {
  currentMonthName: string
  currentYear: number
  userName: string
  agendaEntries: AgendaItem[]
  onClose: () => void
  onSave: (date: number, code: string, hours: string, note: string) => Promise<boolean>
  onDelete: (id: string) => Promise<void>
  daysInMonth: number
  agendaSaving: boolean
}

export default function AgentAgendaModal({
  currentMonthName,
  currentYear,
  userName,
  agendaEntries,
  onClose,
  onSave,
  onDelete,
  daysInMonth,
  agendaSaving
}: AgentAgendaModalProps) {
  const [agendaDate, setAgendaDate] = useState('')
  const [agendaCode, setAgendaCode] = useState('')
  const [agendaHours, setAgendaHours] = useState('')
  const [agendaNote, setAgendaNote] = useState('')
  const [agendaSearch, setAgendaSearch] = useState('')

  const handleLocalSave = async () => {
    if (!agendaDate || !agendaCode) return
    const success = await onSave(parseInt(agendaDate), agendaCode, agendaHours, agendaNote)
    if (success) {
      setAgendaCode('')
      setAgendaHours('')
      setAgendaNote('')
      setAgendaDate('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/15 backdrop-blur-sm rounded-2xl">
                <BookOpen size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Agenda Personale</h2>
                <p className="text-white/70 text-xs font-semibold mt-0.5">{currentMonthName} {currentYear} · {userName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="text-center">
                  <span className="text-2xl font-black block leading-none">{agendaEntries.length}</span>
                  <span className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Voci</span>
                </div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-center">
                  <span className="text-2xl font-black block leading-none">{agendaEntries.filter(e => e.hours).reduce((a, e) => a + (e.hours || 0), 0)}</span>
                  <span className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Ore Tot.</span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="w-full md:w-[380px] bg-slate-50 border-r border-slate-100 p-5 overflow-y-auto custom-scrollbar flex-shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">✏️ Nuovo Appunto</p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">📅 Giorno</label>
                <select 
                  value={agendaDate} 
                  onChange={e => setAgendaDate(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors"
                >
                  <option value="">Seleziona giorno...</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d.toString()}>{d} {currentMonthName} {currentYear}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">🔍 Cerca Tipo</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Ferie, 104, straord..."
                    value={agendaSearch}
                    onChange={e => setAgendaSearch(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar border-2 border-slate-100 rounded-xl p-3 bg-white">
                {AGENDA_CATEGORIES.map(cat => {
                  const filteredItems = cat.items.filter(i => 
                    i.label.toLowerCase().includes(agendaSearch.toLowerCase()) || 
                    i.code.includes(agendaSearch)
                  )
                  if (filteredItems.length === 0) return null
                  const colors = CAT_COLORS[cat.color] || CAT_COLORS.blue
                  return (
                    <div key={cat.group}>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${colors.text}`}>
                        <span className="text-sm">{cat.emoji}</span> {cat.group}
                      </p>
                      <div className="grid grid-cols-1 gap-1">
                        {filteredItems.map(item => (
                          <button
                            key={item.code}
                            onClick={() => setAgendaCode(item.code)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 ${
                              agendaCode === item.code 
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-200 scale-[1.01]' 
                                : `${colors.bg} ${colors.text} border ${colors.border} hover:shadow-sm`
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agendaCode === item.code ? 'bg-white' : colors.dot}`}></span>
                            <span className="truncate">{item.label}</span>
                            <span className={`ml-auto text-[9px] shrink-0 ${agendaCode === item.code ? 'text-white/60' : 'opacity-40'}`}>{item.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">⏱ Ore</label>
                  <input 
                    type="number" step="0.5" min="0" max="24" placeholder="0"
                    value={agendaHours} onChange={e => setAgendaHours(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1 ml-0.5">📝 Note</label>
                  <input
                    type="text"
                    placeholder="Opzionale..."
                    value={agendaNote} onChange={e => setAgendaNote(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-purple-400 transition-colors placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button
                onClick={handleLocalSave}
                disabled={!agendaDate || !agendaCode || agendaSaving}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-black text-sm transition-all shadow-lg shadow-purple-200 active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {agendaSaving ? 'Salvataggio...' : 'Aggiungi all\'Agenda'}
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 flex flex-col bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">I Tuoi Appunti</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{agendaEntries.length} {agendaEntries.length === 1 ? 'voce' : 'voci'} registrate</p>
              </div>
              <div className="hidden lg:flex flex-wrap gap-1">
                {AGENDA_CATEGORIES.map(cat => {
                  const count = agendaEntries.filter(e => cat.items.some(i => i.code === e.code)).length
                  if (count === 0) return null
                  return (
                    <span key={cat.group} className="text-[9px] font-bold bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">{cat.emoji} {count}</span>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {agendaEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2rem] flex items-center justify-center mb-5 text-4xl">
                    📋
                  </div>
                  <p className="text-slate-700 text-base font-black">Nessun appunto ancora</p>
                  <p className="text-slate-400 text-xs mt-1.5 max-w-xs">Usa il form a sinistra per aggiungere ferie, permessi, straordinari e altro alla tua agenda personale.</p>
                </div>
              ) : (
                agendaEntries.map(entry => {
                  const cat = getCategoryForCode(entry.code)
                  const colors = cat ? (CAT_COLORS[cat.color] || CAT_COLORS.blue) : CAT_COLORS.blue
                  const emoji = cat?.emoji || '📌'
                  const entryDate = new Date(entry.date)
                  return (
                    <div key={entry.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 ${colors.border} ${colors.bg} transition-all hover:shadow-md group`}>
                      <div className="w-11 h-11 bg-white rounded-xl flex flex-col items-center justify-center shrink-0 shadow-sm border border-slate-100">
                        <span className="text-base font-black text-slate-800 leading-none">{entryDate.getUTCDate()}</span>
                        <span className="text-[7px] font-bold text-slate-400 uppercase">{['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][entryDate.getUTCDay()]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm">{emoji}</span>
                          <span className={`text-sm font-bold ${colors.text}`}>{entry.label}</span>
                          {entry.hours != null && entry.hours > 0 && (
                            <span className="text-[10px] bg-white/80 text-slate-600 rounded-full px-2 py-0.5 font-bold border border-slate-100">{entry.hours}h</span>
                          )}
                        </div>
                        {entry.note && <p className="text-[11px] text-slate-500 mt-0.5 truncate italic">&ldquo;{entry.note}&rdquo;</p>}
                      </div>
                      <button 
                        onClick={() => onDelete(entry.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Elimina"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            
            {agendaEntries.length > 0 && (
              <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-purple-500 uppercase tracking-widest">Totale</p>
                    <p className="text-lg font-black text-purple-700">{agendaEntries.length} <span className="text-xs font-bold text-purple-400">voci</span></p>
                  </div>
                  {agendaEntries.filter(e => e.hours).length > 0 && (
                    <>
                      <div className="w-px h-8 bg-purple-200"></div>
                      <div>
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Ore</p>
                        <p className="text-lg font-black text-indigo-700">{agendaEntries.filter(e => e.hours).reduce((a, e) => a + (e.hours || 0), 0)}<span className="text-xs font-bold text-indigo-400">h</span></p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  {AGENDA_CATEGORIES.map(cat => {
                    const count = agendaEntries.filter(e => cat.items.some(i => i.code === e.code)).length
                    if (count === 0) return null
                    const colors = CAT_COLORS[cat.color] || CAT_COLORS.blue
                    return <span key={cat.group} className={`w-3 h-3 rounded-full ${colors.dot}`} title={`${cat.group}: ${count}`}></span>
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

