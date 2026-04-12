import Link from "next/link"
import { ScrollText, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Termini e Condizioni | Sentinel Security Suite"
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-12 px-8 shadow-xl shadow-slate-200/50 sm:rounded-[2rem] border border-slate-100">
          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 bg-indigo-100 rounded-xl">
                <ScrollText className="w-8 h-8 text-indigo-600" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Termini di Servizio</h1>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Condizioni di Utenza (EULA)</p>
             </div>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-slate-800">1. Oggetto</h2>
            <p className="text-slate-600">Le presenti condizioni disciplinano l'utilizzo della piattaforma <strong>Sentinel Security Suite</strong>, fornita in modalità SaaS per modernizzare la Sala Operativa dei Comandi di Polizia Locale IT. Sottoscrivendo il servizio, l'Ente accetta integralmente i presenti vincoli di utilizzo per i propri operatori autorizzati. L'abuso dei sistemi, attacchi Denial of Service o reverse-engineering dell'infrastruttura costituiscono violazione ed è passibile del blocco totale dei tenant associati.</p>
            
            <h2 className="text-xl font-bold text-slate-800 mt-8">2. Sicurezza Infrastrutturale</h2>
            <p className="text-slate-600">Il licenziatario (e quindi ogni "Utente Amministratore") è responsabile di tutelare le credenziali dei manager e la gestione delle abilitazioni dei propri agenti. Sentinel è esonerata da qualsiasi responsabilità riguardante errori di immissione (es. Erronea qualifica per gli straordinari in fase di stampa budget) imputabile all'operato utente interno.</p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">3. Trial e Piani di Sottoscrizione</h2>
            <p className="text-slate-600">Offriamo un ambiente di prova (Trial) di durata variabile. Al termine del periodo, o in caso di superamento del "Max Agents Limit" previsto dal proprio tier, funzioni come le comunicazioni operative in bacheca ed aggregazioni analitiche saranno limitate all'esportazione di base per obblighi documentali finché il tenant non viene aggiornato a un piano di produzione superiore (Scale/Enterprise).</p>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
             <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" /> Torna alla Home
             </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
