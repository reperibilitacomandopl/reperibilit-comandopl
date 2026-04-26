import Link from "next/link"
import { Cookie, Shield, ArrowRight, Info, CheckCircle2 } from "lucide-react"

export const metadata = {
  title: "Cookie Policy — Informativa sull'uso dei cookie | Sentinel Security Suite",
  description: "Informativa estesa sull'uso dei cookie e di altri strumenti di tracciamento della piattaforma Sentinel Security Suite."
}

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-950 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center md:justify-start">
            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <Cookie className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Cookie Policy
              </h1>
              <p className="text-sm font-bold text-amber-300/60 mt-1 uppercase tracking-widest">
                Gestione della privacy e tracciamento
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8 md:p-12 space-y-10">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" /> Cosa sono i Cookie?
            </h2>
            <p className="text-slate-600 leading-relaxed">
              I cookie sono piccoli file di testo che i siti visitati dagli utenti inviano ai loro terminali, ove vengono memorizzati per essere poi ritrasmessi agli stessi siti alla visita successiva.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Cookie utilizzati da questa piattaforma
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Sentinel Security Suite utilizza esclusivamente <strong>cookie tecnici</strong> necessari al corretto funzionamento del servizio. Non vengono utilizzati cookie di profilazione o di terze parti per finalità pubblicitarie.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left p-3 text-slate-700">Nome Cookie</th>
                    <th className="text-left p-3 text-slate-700">Scopo</th>
                    <th className="text-left p-3 text-slate-700">Durata</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr className="border-b border-slate-100">
                    <td className="p-3 font-mono text-xs">next-auth.session-token</td>
                    <td className="p-3">Mantiene la sessione dell'utente autenticato</td>
                    <td className="p-3">30 giorni</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="p-3 font-mono text-xs">next-auth.csrf-token</td>
                    <td className="p-3">Protezione contro attacchi Cross-Site Request Forgery</td>
                    <td className="p-3">Sessione</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">next-auth.callback-url</td>
                    <td className="p-3">Memorizza la pagina di destinazione dopo il login</td>
                    <td className="p-3">Sessione</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
            <h2 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
              <Info className="w-5 h-5" /> Base Giuridica
            </h2>
            <p className="text-sm text-indigo-800 leading-relaxed">
              L'installazione di questi cookie non richiede il preventivo consenso degli utenti ai sensi delle Linee Guida del Garante Privacy (10 giugno 2021), in quanto sono strettamente necessari per erogare il servizio richiesto dall'interessato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Come disabilitare i cookie</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              È possibile bloccare o eliminare i cookie direttamente dalle impostazioni del browser:
            </p>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Chrome', 'Firefox', 'Safari', 'Edge'].map(browser => (
                <li key={browser} className="bg-slate-100 p-3 rounded-xl text-center text-xs font-bold text-slate-700 uppercase tracking-wider border border-slate-200">
                  {browser}
                </li>
              ))}
            </ul>
          </section>

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
