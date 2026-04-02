"use client"

import { useState } from "react"
import { Users, Briefcase } from "lucide-react"
import AnagraficaPanel from "./AnagraficaPanel"
import ServicesSettings from "./ServicesSettings"

export default function RisorseTabs({ agents, rotationGroups, categories }: any) {
  const [activeTab, setActiveTab] = useState<"personale" | "servizi">("personale")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestione Risorse & Setup</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Ufficio Comando: Gestione Agenti, Squadre, Autoparco e Categorie Servizi</p>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab("personale")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "personale" ? "bg-white text-blue-600 shadow-sm shadow-blue-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={18} />
          Organico e Squadre
        </button>
        <button
          onClick={() => setActiveTab("servizi")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "servizi" ? "bg-white text-emerald-600 shadow-sm shadow-emerald-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase size={18} />
          Servizi e Autoparco
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "personale" && (
          <div className="animate-in fade-in duration-500">
            <AnagraficaPanel agents={agents} rotationGroups={rotationGroups} categories={categories} />
          </div>
        )}
        
        {activeTab === "servizi" && (
          <div className="animate-in fade-in duration-500 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <ServicesSettings />
          </div>
        )}
      </div>
    </div>
  )
}
