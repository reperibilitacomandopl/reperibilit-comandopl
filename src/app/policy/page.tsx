import Link from "next/link"
import { Shield, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Privacy Policy | Sentinel Security Suite"
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-12 px-8 shadow-xl shadow-slate-200/50 sm:rounded-[2rem] border border-slate-100">
          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 bg-indigo-100 rounded-xl">
                <Shield className="w-8 h-8 text-indigo-600" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Ultimo aggiornamento: Aprile 2026</p>
             </div>
          </div>
          
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-slate-800">1. Introduzione</h2>
            <p className="text-slate-600">Sentinel Security Suite ("Noi", "Il Servizio") è impegnato a proteggere e rispettare la vostra privacy. La presente Informativa sulla privacy descrive come raccogliamo, elaboriamo e proteggiamo i dati personali in conformità al Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679). Questa informativa si applica specificamente al trattamento dei dati organizzativi e informativi del personale della Polizia Locale Italiana.</p>

            <h2 className="text-xl font-bold text-slate-800 mt-8">2. Dati Raccolti</h2>
            <ul className="text-slate-600 list-disc pl-5 space-y-2">
               <li><strong>Dati di Identificazione:</strong> Nome, matricola amministrativa e informazioni di contatto istituzionale per la rubricazione interna.</li>
               <li><strong>Dati di Servizio:</strong> Assegnazioni di lavoro, tipologia pattuglie (Es. polizia stradale, polizia commerciale), straordinari e ferie (categorie non mediche).</li>
               <li><strong>Dati GPS (SOS Live):</strong> Le coordinate in tempo reale del dispositivo vengono attivate <em>esclusivamente</em> sul client nel momento in cui l'utente lancia volontariamente un alert SOS, unicamente per il tempo necessario alla gestione dell'operazione.</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 mt-8">3. Conservazione dei Dati</h2>
            <p className="text-slate-600">Sentinel implementa la crittografia <em>End-to-End</em> per garantire l'immutabilità dei log (Audit) di sistema e proteggere il Database cloud distribuito. I dati rimangono di esclusiva proprietà e titolarità dell'Ente Comunale operante. Nessun dato verrà mai rivenduto, inviato a terzi o processato per algoritmi di marketing.</p>
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
