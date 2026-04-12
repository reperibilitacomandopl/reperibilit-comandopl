import Link from "next/link"
import { HelpCircle, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Domande Frequenti (FAQ) | Sentinel"
}

export default function FaqPage() {
  const faqs = [
    {
      q: "Qual è il limite massimo di Agenti inseribili?",
      a: "Acquistando la licenza Scale o Enterprise, i tenant non hanno alcun limite di organico massimo. Nel periodo di Trial o piano base il limite viene imposto a configurazione (solitamente 10 o 50 agenti)."
    },
    {
      q: "I server applicativi dove sono situati?",
      a: "Tutti i dati, le rotte GPS e i file documentali dei comandi sono immagazzinati in istanze collocate nel territorio dell'Unione Europea, coperti severamente dal GDPR. Non condividiamo metadati con provider extra-EU."
    },
    {
      q: "Se tolgo la licenza, che fine fa il mio database?",
      a: "Garantiamo la possibilità di esportare tutto nel formato richiesto dal MEF. Al termine di tale procedura tutti i dati del database Supabase/Prisma associati a quel TenantID vengono irrevocabilmente distrutti in totale trasparenza tramite un Wipe job automatizzato."
    },
    {
      q: "Compatibilità App Mobile (iOS, Android)",
      a: "Sì, Sentinel è distribuito come Progressive Web App (PWA). Questo ci permette di eludere i pesanti canali burocratici degli store pubblici e fornire un link rapido ad ogni vostro operatore per installare l'icona e ricevere notifiche Push Native direttamente sullo smartphone di ordinanza."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-12 px-8 shadow-xl shadow-slate-200/50 sm:rounded-[2rem] border border-slate-100">
          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 bg-indigo-100 rounded-xl">
                <HelpCircle className="w-8 h-8 text-indigo-600" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Domande Frequenti (FAQ)</h1>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Informazioni rapide per i P.A.</p>
             </div>
          </div>
          
          <div className="space-y-6">
             {faqs.map((faq, i) => (
                <div key={i} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50">
                   <h3 className="text-lg font-bold text-slate-800 mb-2">{faq.q}</h3>
                   <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
             ))}
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
