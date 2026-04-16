"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Users, Briefcase, Key } from "lucide-react"
import AnagraficaPanel from "./AnagraficaPanel"
import ServicesSettings from "./ServicesSettings"
import PatrolSettingsPanel from "./PatrolSettingsPanel"
import SquadreManager from "./SquadreManager"
import PermissionsPanel from "./PermissionsPanel"
import { Shield, RotateCcw } from "lucide-react"

type TabType = "personale" | "cicli" | "servizi" | "pattuglie" | "permessi"

interface RisorseTabsProps {
  agents: any[]
  rotationGroups: { id: string; name: string }[]
  categories: { id: string; name: string; types: { id: string; name: string }[] }[]
}

export default function RisorseTabs({ agents, rotationGroups, categories }: RisorseTabsProps) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") as TabType | null
  const [activeTab, setActiveTab] = useState<"personale" | "cicli" | "servizi" | "pattuglie" | "permessi">(
    initialTab && ["personale", "cicli", "servizi", "pattuglie", "permessi"].includes(initialTab) 
      ? initialTab 
      : "personale"
  )

  // Opzionale: aggiorna il tab se il parametro cambia (es. navigazione interna)
  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["personale", "cicli", "servizi", "pattuglie", "permessi"].includes(tab)) {
       const t = setTimeout(() => setActiveTab(tab as TabType), 0);
       return () => clearTimeout(t);
    }
  }, [searchParams])

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
          <Users width={18} height={18} />
          Anagrafica Agenti
        </button>
        <button
          onClick={() => setActiveTab("cicli")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "cicli" ? "bg-white text-orange-600 shadow-sm shadow-orange-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <RotateCcw width={18} height={18} />
          Motori Ciclici (Turni)
        </button>
        <button
          onClick={() => setActiveTab("servizi")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "servizi" ? "bg-white text-emerald-600 shadow-sm shadow-emerald-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase width={18} height={18} />
          Servizi e Autoparco
        </button>
        <button
          onClick={() => setActiveTab("pattuglie")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "pattuglie" ? "bg-white text-indigo-600 shadow-sm shadow-indigo-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Shield width={18} height={18} />
          Pattuglie Fisse
        </button>
        <button
          onClick={() => setActiveTab("permessi")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === "permessi" ? "bg-white text-indigo-600 shadow-sm shadow-indigo-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key width={18} height={18} />
          Permessi Operativi
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "personale" && (
          <div className="animate-in fade-in duration-500">
            <AnagraficaPanel agents={agents as any} rotationGroups={rotationGroups} categories={categories} />
          </div>
        )}
        
        {activeTab === "servizi" && (
          <div className="animate-in fade-in duration-500 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <ServicesSettings />
          </div>
        )}

        {activeTab === "pattuglie" && (
          <div className="animate-in fade-in duration-500 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/50">
            <PatrolSettingsPanel />
          </div>
        )}
        {activeTab === "cicli" && (
          <div className="animate-in fade-in duration-500 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-orange-100/50">
            <SquadreManager />
          </div>
        )}
        {activeTab === "permessi" && (
          <div className="animate-in fade-in duration-500 bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/50">
            <PermissionsPanel users={agents as any} />
          </div>
        )}

      </div>
    </div>
  )
}
