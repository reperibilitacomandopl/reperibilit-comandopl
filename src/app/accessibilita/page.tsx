import Link from "next/link"
import { Accessibility, CheckCircle2, AlertCircle, Mail, ExternalLink, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Dichiarazione di Accessibilità — Sentinel Security Suite",
  description: "Dichiarazione di accessibilità conforme alle Linee Guida AgID ai sensi del D.Lgs. 106/2018 e della Direttiva UE 2016/2102."
}

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-blue-900 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <Accessibility className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Dichiarazione di Accessibilità
              </h1>
              <p className="text-sm font-bold text-blue-300/60 mt-1 uppercase tracking-widest">
                Ai sensi del D.Lgs. 106/2018 e della Direttiva UE 2016/2102
              </p>
            </div>
          </div>
          <p className="text-white/40 text-sm font-medium mt-4">
            Ultimo aggiornamento: Aprile 2026 — Versione 1.0
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12 space-y-10">

            {/* 1. Stato di conformità */}
            <section>
              <SectionTitle number="1" title="Stato di Conformità" />
              <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <h3 className="text-base font-black text-emerald-800">Parzialmente Conforme</h3>
                </div>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  La piattaforma <strong>Sentinel Security Suite</strong> è <strong>parzialmente conforme</strong> ai 
                  requisiti previsti dall&apos;allegato A alla norma UNI EN 301549:2018 (WCAG 2.1 livello AA), 
                  ai sensi della Direttiva (UE) 2016/2102 e del D.Lgs. 106/2018 di recepimento.
                </p>
              </div>
            </section>

            {/* 2. Contenuti accessibili */}
            <section>
              <SectionTitle number="2" title="Contenuti Accessibili" />
              <div className="mt-4 space-y-3">
                <ComplianceItem status="ok" text="Navigazione da tastiera completa su tutte le funzionalità principali" />
                <ComplianceItem status="ok" text="Link 'Vai al contenuto principale' (skip-to-content) per navigazione rapida" />
                <ComplianceItem status="ok" text="Contrasto testo/sfondo conforme WCAG AA (rapporto minimo 4.5:1)" />
                <ComplianceItem status="ok" text="Indicatori di focus visibili su tutti gli elementi interattivi" />
                <ComplianceItem status="ok" text="Supporto prefers-reduced-motion per la riduzione delle animazioni" />
                <ComplianceItem status="ok" text="Supporto prefers-contrast: high per la modalità alto contrasto" />
                <ComplianceItem status="ok" text="Attributo lang='it' sulla pagina HTML per screen reader" />
                <ComplianceItem status="ok" text="Struttura semantica HTML5 con landmark (header, main, nav, footer)" />
                <ComplianceItem status="ok" text="Testi alternativi per immagini e icone decorative" />
                <ComplianceItem status="ok" text="Formulari con etichette associate e messaggi di errore chiari" />
              </div>
            </section>

            {/* 3. Contenuti non accessibili */}
            <section>
              <SectionTitle number="3" title="Contenuti Non Accessibili" />
              <div className="mt-4 space-y-3">
                <ComplianceItem status="warn" text="Alcune tabelle complesse (griglia turni) possono risultare difficili da navigare con screen reader" />
                <ComplianceItem status="warn" text="I PDF degli Ordini di Servizio generati automaticamente potrebbero non essere completamente accessibili (PDF/UA)" />
                <ComplianceItem status="warn" text="Alcune notifiche toast potrebbero non essere annunciate tempestivamente da tutti gli screen reader" />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mt-4">
                <p className="text-sm text-amber-800 leading-relaxed">
                  <strong>Motivo della non conformità:</strong> Le eccezioni sopra elencate sono dovute alla complessità 
                  intrinseca delle griglie di pianificazione turni e alla generazione automatica di documenti PDF. 
                  Sono in corso interventi correttivi per raggiungere la piena conformità.
                </p>
              </div>
            </section>

            {/* 4. Come segnalare problemi */}
            <section>
              <SectionTitle number="4" title="Meccanismo di Feedback e Informazioni di Contatto" />
              <div className="mt-4 prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed">
                  Per segnalare problemi di accessibilità o richiedere informazioni in formato accessibile, 
                  è possibile contattare:
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-black text-blue-800">Contatti per l&apos;Accessibilità</h4>
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1.5 list-none pl-0">
                    <li><strong>Email:</strong> accessibilita@sentinel-pl.it</li>
                    <li><strong>PEC:</strong> sentinel-pl@pec.it</li>
                    <li><strong>Oggetto:</strong> &quot;Segnalazione Accessibilità - [descrizione del problema]&quot;</li>
                  </ul>
                </div>
                <p className="text-slate-600 leading-relaxed mt-4">
                  Ci impegniamo a rispondere entro <strong>30 giorni</strong> dalla ricezione della segnalazione.
                </p>
              </div>
            </section>

            {/* 5. Procedura di attuazione */}
            <section>
              <SectionTitle number="5" title="Procedura di Attuazione" />
              <div className="mt-4 prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed">
                  In caso di risposta insoddisfacente o assente entro 30 giorni, l&apos;utente può inviare una 
                  segnalazione al <strong>Difensore Civico per il Digitale</strong> presso l&apos;Agenzia per l&apos;Italia 
                  Digitale (AgID), utilizzando il modulo disponibile sul sito:
                </p>
                <a 
                  href="https://form.agid.gov.it/view/ecdbc340-e3ea-11ec-a9a2-17c2b1e725a9" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md"
                >
                  <ExternalLink className="w-4 h-4" />
                  Segnalazione al Difensore Civico Digitale
                </a>
              </div>
            </section>

            {/* 6. Informazioni tecniche */}
            <section>
              <SectionTitle number="6" title="Informazioni sulla Piattaforma" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700 bg-slate-50 w-1/3">Nome piattaforma</td>
                      <td className="p-3">Sentinel Security Suite</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700 bg-slate-50">Tipologia</td>
                      <td className="p-3">Applicazione Web SaaS (Software as a Service)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700 bg-slate-50">Standard di riferimento</td>
                      <td className="p-3">WCAG 2.1 Livello AA — EN 301549:2018</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700 bg-slate-50">Tecnologie utilizzate</td>
                      <td className="p-3">HTML5, CSS3, JavaScript (Next.js, React), ARIA</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700 bg-slate-50">Browser supportati</td>
                      <td className="p-3">Chrome 90+, Firefox 90+, Safari 15+, Edge 90+</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-700 bg-slate-50">Screen reader testati</td>
                      <td className="p-3">NVDA, VoiceOver (macOS/iOS), TalkBack (Android)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center mt-8 pb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Torna alla Home
          </Link>
          <span className="text-slate-300 mx-4">·</span>
          <Link href="/policy" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            Privacy Policy <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}

// Sub-components
function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-sm font-black text-blue-600">{number}</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
  )
}

function ComplianceItem({ status, text }: { status: "ok" | "warn"; text: string }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${status === "ok" ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"}`}>
      {status === "ok" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      )}
      <p className={`text-sm font-medium leading-relaxed ${status === "ok" ? "text-emerald-800" : "text-amber-800"}`}>
        {text}
      </p>
    </div>
  )
}
