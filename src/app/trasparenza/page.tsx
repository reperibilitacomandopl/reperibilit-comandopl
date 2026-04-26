import Link from "next/link"
import { Info, Shield, CheckCircle2, Server, Clock, Scale, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Amministrazione Trasparente & SLA — Sentinel Security Suite",
  description: "Informazioni sulla trasparenza del servizio, livelli di servizio (SLA) e conformità normativa della piattaforma Sentinel Security Suite."
}

export default function TransparencyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <Info className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Amministrazione Trasparente
              </h1>
              <p className="text-sm font-bold text-blue-300/60 mt-1 uppercase tracking-widest">
                Informazioni sul servizio e conformità
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12 space-y-12">
            
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" /> Caratteristiche del Servizio SaaS
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <FeatureCard 
                  title="Hosting Cloud EU" 
                  description="Dati ospitati su infrastruttura AWS in territorio UE (Francoforte, DE) conforme al GDPR." 
                />
                <FeatureCard 
                  title="Disponibilità (Uptime)" 
                  description="Target di disponibilità del servizio del 99.9% su base annua, esclusi i periodi di manutenzione programmata." 
                />
                <FeatureCard 
                  title="Sicurezza ICT" 
                  description="Conforme alle Misure Minime di Sicurezza ICT per le PA (Circolare AgID n. 2/2017)." 
                />
                <FeatureCard 
                  title="Multi-tenant" 
                  description="Isolamento logico rigoroso tra i dati dei diversi Comandi/Enti." 
                />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" /> Livelli di Servizio (SLA)
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600">
                  Sentinel garantisce i seguenti tempi di risposta per il supporto tecnico (Working Hours: Lun-Ven 09:00-18:00):
                </p>
                <ul className="space-y-4 mt-6">
                  <SlaItem priority="Alta" impact="Bloccante (Sistema non raggiungibile)" response="4 ore lavorative" />
                  <SlaItem priority="Media" impact="Limitata (Malfunzionamento parziale)" response="8 ore lavorative" />
                  <SlaItem priority="Bassa" impact="Quesiti o richieste di configurazione" response="24 ore lavorative" />
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" /> Riferimenti Normativi
              </h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Codice dell'Amministrazione Digitale (CAD):</strong> D.Lgs. 82/2005 e successive modifiche.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Regolamento UE 2016/679 (GDPR):</strong> Protezione dei dati personali.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>D.Lgs. 106/2018:</strong> Requisiti di accessibilità dei siti web e delle applicazioni mobili delle PA.</span>
                </li>
              </ul>
            </section>

          </div>
        </div>

        <div className="text-center mt-12 pb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Torna alla Home
          </Link>
        </div>
      </main>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
      <h3 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-wide">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}

function SlaItem({ priority, impact, response }: { priority: string; impact: string; response: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm gap-4">
      <div>
        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest mb-2 inline-block ${
          priority === 'Alta' ? 'bg-rose-100 text-rose-700' : 
          priority === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
        }`}>
          Priorità {priority}
        </span>
        <p className="text-sm font-bold text-slate-800">{impact}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold text-slate-400 uppercase">Tempo di Risposta</p>
        <p className="text-sm font-black text-indigo-600">{response}</p>
      </div>
    </div>
  )
}
