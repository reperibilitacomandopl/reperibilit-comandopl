import os

# Percorso del file da riparare
file_path = r"c:\Users\dibenedettom\Desktop\portale-caserma\src\components\AdminDashboard.tsx"

# Marcatori per identificare la sezione da sostituire
start_marker = "{/* === ANAGRAFICA MODAL === */}"
end_marker = "{/* Settings Panel Modal */}"

# Il nuovo contenuto Premium e corretto
new_modal_content = """      {/* === ANAGRAFICA MODAL === */}
      {showAnagrafica && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 lg:p-6" onClick={() => setShowAnagrafica(false)}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="relative z-10">
                <h2 className="font-black text-2xl flex items-center gap-3 uppercase tracking-tight">
                  <Users size={28} className="text-blue-400" /> 
                  Gestione Personale
                </h2>
                <p className="text-slate-400 text-xs mt-1 font-bold tracking-widest uppercase opacity-70">Anagrafica, Qualifiche e Scadenze Operative</p>
              </div>
              <button 
                onClick={() => setShowAnagrafica(false)} 
                className="text-slate-400 hover:text-white transition-all bg-white/10 p-3 rounded-2xl hover:scale-110 active:scale-95"
              >
                <X size={24} />
              </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border-b border-slate-100 px-8 py-4 flex flex-wrap gap-6 items-center shrink-0 shadow-sm relative z-20">
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Cerca matricola o nome..." 
                  value={anagSearchQuery}
                  onChange={e => setAnagSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 text-sm bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white font-black text-slate-700 w-64 transition-all"
                />
              </div>
              
              <div className="flex gap-3">
                <select
                  value={anagSquadraFilter}
                  onChange={e => setAnagSquadraFilter(e.target.value)}
                  className="px-4 py-2.5 text-xs bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 font-black text-slate-700 cursor-pointer transition-all"
                >
                  <option value="ALL">TUTTE LE SQUADRE</option>
                  {uniqueSquadre.map(sq => (
                    <option key={sq} value={sq}>{sq}</option>
                  ))}
                </select>

                <select
                  value={anagQualificaFilter}
                  onChange={e => setAnagQualificaFilter(e.target.value)}
                  className="px-4 py-2.5 text-xs bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 font-black text-slate-700 cursor-pointer transition-all"
                >
                  <option value="ALL">TUTTE LE QUALIFICHE</option>
                  {uniqueQualifiche.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-4">
                <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 uppercase tracking-widest">
                  {filteredAnagraficaAgents.length} {filteredAnagraficaAgents.length === 1 ? 'Operatore' : 'Operatori'}
                </div>
                <button 
                  onClick={() => setShowAddUser(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Plus size={16} /> Aggiungi Agente
                </button>
              </div>
            </div>
            
            {/* Cards Grid */}
            <div className="p-8 overflow-y-auto bg-slate-50/50 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredAnagraficaAgents.map(agent => {
                  const todayShift = shifts.find(s => s.userId === agent.id && new Date(s.date).toDateString() === new Date().toDateString());
                  const isExpiring = (date) => {
                    if (!date) return false;
                    const d = new Date(date);
                    const now = new Date();
                    return d.getTime() < now.getTime() + (30 * 24 * 60 * 60 * 1000); 
                  };

                  return (
                    <div key={agent.id} className={`group relative bg-white rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden flex flex-col ${editingAgent === agent.id ? 'border-amber-400 shadow-2xl ring-8 ring-amber-100/50' : 'border-slate-100 hover:border-blue-400 hover:shadow-2xl hover:-translate-y-2 hover:bg-white'}`}>
                      {/* Card Top Decoration */}
                      <div className={`h-28 transition-all duration-500 ${agent.isUfficiale ? 'bg-indigo-600' : 'bg-slate-800'} ${editingAgent === agent.id ? 'bg-amber-500' : ''} relative p-6`}>
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute top-4 right-6 flex gap-2">
                           {isExpiring(agent.scadenzaPatente) && <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50" title="Patente in Scadenza"></div>}
                           {isExpiring(agent.scadenzaPortoArmi) && <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg shadow-red-500/50" title="Porto d'Armi in Scadenza"></div>}
                        </div>
                      </div>

                      {/* Avatar & Header Info */}
                      <div className="absolute top-12 left-8 flex items-end gap-5">
                        <div className="w-24 h-24 bg-white rounded-[2rem] p-1.5 shadow-2xl border border-slate-50 transition-transform duration-500 group-hover:scale-105">
                          <div className={`w-full h-full rounded-[1.7rem] flex items-center justify-center text-white font-black text-3xl shadow-inner ${agent.isUfficiale ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                            {agent.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                        </div>
                        <div className="mb-4">
                           <span className="text-[10px] font-black text-white/90 uppercase tracking-widest block mb-1 drop-shadow-sm">Matr. {agent.matricola}</span>
                           <h4 className="text-white font-black text-lg tracking-tighter leading-none uppercase truncate max-w-[150px] drop-shadow-md">{agent.name}</h4>
                        </div>
                      </div>

                      <div className="px-8 pt-16 pb-8 flex-1 flex flex-col">
                        {editingAgent === agent.id ? (
                          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                             <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Nome Completo</label>
                                  <input type="text" value={tempName} onChange={e => setTempName(e.target.value.toUpperCase())} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-500 focus:bg-white" />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Matricola</label>
                                  <input type="text" value={tempMatricola} onChange={e => setTempMatricola(e.target.value.toUpperCase())} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-500 focus:bg-white" />
                               </div>
                             </div>
                             
                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Qualifica Operativa</label>
                                <input type="text" value={tempQualifica} onChange={e => setTempQualifica(e.target.value)} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-500 focus:bg-white" placeholder="Es. Istruttore Direttivo" />
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Data Assunzione</label>
                                  <input type="date" value={tempDataAssunzione} onChange={e => setTempDataAssunzione(e.target.value)} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:border-amber-500 focus:bg-white uppercase" />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Squadra / Reparto</label>
                                  <input type="text" value={tempSquadra} onChange={e => setTempSquadra(e.target.value.toUpperCase())} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-amber-500 focus:bg-white" />
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Scadenza Patente</label>
                                  <input type="date" value={tempScadenzaPatente} onChange={e => setTempScadenzaPatente(e.target.value)} className="w-full bg-rose-50/30 border border-amber-200 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:border-amber-500 focus:bg-white uppercase" />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Scadenza Porto Armi</label>
                                  <input type="date" value={tempScadenzaPortoArmi} onChange={e => setTempScadenzaPortoArmi(e.target.value)} className="w-full bg-rose-50/30 border border-amber-200 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:border-amber-500 focus:bg-white uppercase" />
                               </div>
                             </div>

                             <div className="space-y-1">
                                <label className="text-[9px] font-black text-amber-700 uppercase tracking-widest pl-1">Note Interne Operative</label>
                                <textarea value={tempNoteInterne} onChange={e => setTempNoteInterne(e.target.value)} rows={2} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-500 focus:bg-white resize-none" placeholder="Annotazioni su turnazioni speciali, limitazioni o note varie..." />
                             </div>

                             <div className="flex justify-between items-center gap-3 pt-4 border-t border-amber-200">
                                <button onClick={async () => {
                                  if (!confirm(`Vuoi davvero eliminare l'operatore ${agent.name}? L'azione è irreversibile.`)) return
                                  const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: agent.id }) })
                                  if (res.ok) { toast.success('Operatore eliminato'); router.refresh(); }
                                }} className="p-3 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95" title="Elimina Operatore">
                                  <Trash2 size={20} />
                                </button>
                                <div className="flex gap-2">
                                   <button onClick={() => setEditingAgent(null)} className="px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors">Annulla</button>
                                   <button onClick={async () => {
                                      const res = await fetch('/api/admin/users', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                          userId: agent.id, name: tempName, matricola: tempMatricola, squadra: tempSquadra, qualifica: tempQualifica,
                                          massimale: tempMassimale, email: tempEmail, phone: tempPhone,
                                          dataAssunzione: tempDataAssunzione || null,
                                          scadenzaPatente: tempScadenzaPatente || null, 
                                          scadenzaPortoArmi: tempScadenzaPortoArmi || null, 
                                          noteInterne: tempNoteInterne || null 
                                        })
                                      })
                                      if (res.ok) { toast.success('Profilo aggiornato!'); setEditingAgent(null); router.refresh(); }
                                      else { toast.error('Errore durante il salvataggio'); }
                                    }} className="bg-slate-900 text-white px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-lg shadow-slate-200 active:scale-95 transition-all">Salva Tutto</button>
                                </div>
                             </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col animate-in fade-in duration-700">
                             {/* Display Info Chips */}
                             <div className="flex flex-wrap gap-2 mb-6">
                               <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${agent.isUfficiale ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                 {agent.qualifica || 'Agente'}
                               </span>
                               <span className="px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100">
                                 {agent.squadra || 'Libero'}
                               </span>
                             </div>

                             {/* Quick Details List */}
                             <div className="space-y-4 mb-8">
                               <div className="flex items-center gap-4 group/item">
                                 <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400 group-hover/item:bg-blue-100 group-hover/item:text-blue-600 transition-colors">
                                   <MapPin size={18} />
                                 </div>
                                 <div>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Stato Attuale</p>
                                   <span className="text-xs font-black text-slate-700 group-hover/item:text-blue-700 transition-colors">{todayShift ? todayShift.type : 'Fuori Turno / Libero'}</span>
                                 </div>
                               </div>
                               <div className="flex items-center gap-4 group/item">
                                 <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400 group-hover/item:bg-amber-100 group-hover/item:text-amber-600 transition-colors">
                                   <CalendarIcon size={18} />
                                 </div>
                                 <div>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Servizio Ordinario</p>
                                   <span className="text-xs font-black text-slate-700">Turnazione Ciclica</span>
                                 </div>
                               </div>
                               <div className="flex items-center gap-4 group/item">
                                 <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400 group-hover/item:bg-rose-100 group-hover/item:text-rose-600 transition-colors">
                                   <Phone size={18} />
                                 </div>
                                 <div>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Recapito Telefonico</p>
                                   <span className="text-xs font-black text-slate-700">{agent.phone || 'Non Inserito'}</span>
                                 </div>
                               </div>
                             </div>

                             {/* Progress Bars / Stats */}
                             <div className="mt-auto pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                   <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Carico Reperibilità</p>
                                      <div className="flex items-center gap-2">
                                         <span className={`text-xl font-black tracking-tighter ${agent.repTotal > agent.massimale ? 'text-rose-600' : 'text-slate-900'}`}>{agent.repTotal}</span>
                                         <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">/ {agent.massimale}</span>
                                      </div>
                                   </div>
                                   <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-1000 ${agent.repTotal > agent.massimale ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (agent.repTotal / agent.massimale) * 100)}%` }}></div>
                                   </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                  <button onClick={() => setSelectedAgentForDetails(agent)} className="px-4 py-3 bg-white text-slate-900 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm flex items-center justify-center gap-2">
                                    <Eye size={14} /> Fascicolo
                                  </button>
                                  <button onClick={() => {
                                      setEditingAgent(agent.id); 
                                      setTempName(agent.name); 
                                      setTempMatricola(agent.matricola); 
                                      setTempSquadra(agent.squadra || "");
                                      setTempQualifica(agent.qualifica || "Agente di P.L."); 
                                      setTempMassimale(agent.massimale); 
                                      setTempEmail(agent.email || ""); 
                                      setTempPhone(agent.phone || "");
                                      setTempDataAssunzione(agent.dataAssunzione ? new Date(agent.dataAssunzione).toISOString().split('T')[0] : "");
                                      setTempScadenzaPatente(agent.scadenzaPatente ? new Date(agent.scadenzaPatente).toISOString().split('T')[0] : "");
                                      setTempScadenzaPortoArmi(agent.scadenzaPortoArmi ? new Date(agent.scadenzaPortoArmi).toISOString().split('T')[0] : "");
                                      setTempNoteInterne(agent.noteInterne || ""); 
                                      setNewPass("");
                                    }} className="px-4 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <FileEdit size={14} /> Gestisci
                                  </button>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )"""

# Lettura del file originale
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Trova gli indici dei marcatori
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if start_marker in line:
        start_idx = i
    if end_marker in line:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    # Costruisci il nuovo contenuto del file
    new_file_content = lines[:start_idx] + [new_modal_content + "\\n"] + lines[end_idx:]
    
    # Scrivi il file riparato
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_file_content)
    
    print("Riparazione completata e design premium applicato!")
else:
    print(f"Marcatori non trovati: start={start_idx}, end={end_idx}")

