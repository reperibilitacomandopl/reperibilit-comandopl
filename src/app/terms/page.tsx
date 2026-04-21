import Link from "next/link"
import { ScrollText, ArrowRight, Shield, Scale, Clock, AlertTriangle, FileText, Handshake, Ban, Mail } from "lucide-react"

export const metadata = {
  title: "Termini e Condizioni di Servizio | Sentinel Security Suite",
  description: "Condizioni generali di contratto per l'utilizzo della piattaforma SaaS Sentinel Security Suite da parte degli Enti di Polizia Locale."
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <ScrollText className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Termini e Condizioni di Servizio
              </h1>
              <p className="text-sm font-bold text-blue-300/60 mt-1 uppercase tracking-widest">
                Condizioni Generali di Contratto (CGC) — SaaS per la PA
              </p>
            </div>
          </div>
          <p className="text-white/40 text-sm font-medium mt-4">
            Ultimo aggiornamento: Aprile 2026 — Versione 2.0
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12 space-y-10">

            {/* 1. Oggetto */}
            <section>
              <SectionHeader icon={FileText} number="1" title="Oggetto e Definizioni" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  Le presenti Condizioni Generali di Contratto (&ldquo;Condizioni&rdquo;) disciplinano l&apos;accesso
                  e l&apos;utilizzo della piattaforma <strong>Sentinel Security Suite</strong> (&ldquo;Piattaforma&rdquo; o &ldquo;Servizio&rdquo;),
                  fornita in modalità Software-as-a-Service (SaaS) per la gestione operativa dei Comandi di Polizia Locale italiani.
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">Definizioni</p>
                  <ul className="text-sm text-slate-600 space-y-2">
                    <li><strong>&ldquo;Fornitore&rdquo;</strong> — Sentinel Security Suite, operatore della Piattaforma</li>
                    <li><strong>&ldquo;Ente&rdquo; o &ldquo;Licenziatario&rdquo;</strong> — L&apos;Ente Comunale / Comando di Polizia Locale che sottoscrive il Servizio</li>
                    <li><strong>&ldquo;Amministratore&rdquo;</strong> — Utente abilitato dall&apos;Ente con ruolo di gestione nella Piattaforma</li>
                    <li><strong>&ldquo;Agente&rdquo; o &ldquo;Operatore&rdquo;</strong> — Personale dell&apos;Ente con accesso al proprio profilo e turni</li>
                    <li><strong>&ldquo;Tenant&rdquo;</strong> — Istanza logica isolata della Piattaforma assegnata all&apos;Ente</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 2. Piani e Sottoscrizione */}
            <section>
              <SectionHeader icon={Handshake} number="2" title="Piani, Sottoscrizione e Fatturazione" />
              <div className="prose prose-slate max-w-none mt-4 space-y-4">
                <p className="text-slate-600 leading-relaxed">
                  <strong>2.1 Trial.</strong> L&apos;Ente può attivare un ambiente di prova gratuito (&ldquo;Trial&rdquo;) della durata massima
                  di 30 giorni. Durante il Trial, tutte le funzionalità sono disponibili senza limitazioni. Al termine
                  del periodo, se l&apos;Ente non procede alla sottoscrizione di un piano a pagamento, le funzionalità di
                  modifica saranno disabilitate; i dati saranno conservati per ulteriori 90 giorni prima della cancellazione.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>2.2 Piani a pagamento.</strong> I piani disponibili (Starter, Professional, Enterprise) differiscono
                  per numero massimo di agenti gestibili e funzionalità incluse, come pubblicato sulla pagina Prezzi della Piattaforma.
                  I prezzi sono espressi come canone mensile IVA esclusa.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>2.3 Fatturazione PA.</strong> Il Fornitore emette fatturazione elettronica nel formato FatturaPA (XML)
                  compatibile con il Sistema di Interscambio (SdI). L&apos;Ente è responsabile di comunicare il proprio
                  Codice Univoco Ufficio (CUU), Codice Fiscale e CIG (se applicabile).
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>2.4 MePA.</strong> Il Servizio è disponibile anche tramite il Mercato Elettronico della Pubblica
                  Amministrazione (MePA) di CONSIP, ove applicabile.
                </p>
              </div>
            </section>

            {/* 3. SLA */}
            <section>
              <SectionHeader icon={Clock} number="3" title="Livelli di Servizio (SLA)" />
              <div className="prose prose-slate max-w-none mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Metrica</th>
                        <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Starter</th>
                        <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Professional</th>
                        <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-semibold">Uptime garantito</td>
                        <td className="p-3">99.0%</td>
                        <td className="p-3">99.5%</td>
                        <td className="p-3 font-bold text-emerald-600">99.9%</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-semibold">Assistenza</td>
                        <td className="p-3">Email (48h)</td>
                        <td className="p-3">Email (24h)</td>
                        <td className="p-3">Prioritaria (4h)</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-semibold">Manutenzione programmata</td>
                        <td className="p-3" colSpan={3}>Domenica 02:00-06:00 CET, con preavviso 72h</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold">Backup</td>
                        <td className="p-3" colSpan={3}>Automatico giornaliero, retention 30 giorni</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-600 leading-relaxed mt-4">
                  In caso di mancato rispetto degli SLA per cause imputabili al Fornitore, l&apos;Ente
                  avrà diritto a un credito proporzionale al canone mensile secondo quanto previsto
                  nel contratto specifico del proprio piano.
                </p>
              </div>
            </section>

            {/* 4. Responsabilità */}
            <section>
              <SectionHeader icon={Shield} number="4" title="Responsabilità e Obblighi" />
              <div className="prose prose-slate max-w-none mt-4 space-y-4">
                <p className="text-slate-600 leading-relaxed">
                  <strong>4.1 Obblighi del Fornitore.</strong> Il Fornitore si impegna a: mantenere la Piattaforma
                  operativa nei limiti degli SLA; implementare misure di sicurezza adeguate; eseguire backup regolari;
                  notificare tempestivamente eventuali violazioni dei dati (data breach) ai sensi dell&apos;Art. 33 GDPR.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>4.2 Obblighi dell&apos;Ente.</strong> L&apos;Ente si impegna a: custodire le credenziali di accesso
                  degli Amministratori; utilizzare la Piattaforma in conformità alla normativa vigente;
                  garantire la correttezza dei dati inseriti; non tentare attacchi informatici, reverse-engineering
                  o accessi non autorizzati.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>4.3 Limitazione di responsabilità.</strong> Il Fornitore non è responsabile per:
                  errori di immissione dati da parte dell&apos;Ente; interruzioni dovute a cause di forza maggiore;
                  danni indiretti o consequenziali. La responsabilità massima del Fornitore è limitata
                  al canone annuale corrisposto dall&apos;Ente.
                </p>
              </div>
            </section>

            {/* 5. Trattamento Dati */}
            <section>
              <SectionHeader icon={Scale} number="5" title="Trattamento dei Dati Personali (Art. 28 GDPR)" />
              <div className="prose prose-slate max-w-none mt-4 space-y-4">
                <p className="text-slate-600 leading-relaxed">
                  <strong>5.1 Ruoli.</strong> L&apos;Ente è il <strong>Titolare del Trattamento</strong>.
                  Il Fornitore è il <strong>Responsabile del Trattamento</strong> e tratta i dati personali
                  esclusivamente per conto e su istruzione dell&apos;Ente, nei limiti di quanto previsto
                  dal Data Processing Agreement (DPA) allegato al contratto.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>5.2 Sub-responsabili.</strong> Il Fornitore si avvale dei sub-responsabili
                  elencati nell&apos;Informativa sulla Privacy. L&apos;Ente autorizza preventivamente l&apos;utilizzo
                  dei sub-responsabili indicati, con possibilità di opporsi alla nomina di
                  nuovi sub-responsabili entro 30 giorni dalla comunicazione.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>5.3 Data Breach.</strong> In caso di violazione dei dati personali, il Fornitore
                  notifica il Titolare senza ingiustificato ritardo e comunque entro 48 ore dalla
                  scoperta, fornendo le informazioni previste dall&apos;Art. 33(3) GDPR.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>5.4 Portabilità e cancellazione.</strong> Alla cessazione del contratto,
                  il Fornitore mette a disposizione dell&apos;Ente un export completo dei dati in formato
                  strutturato (CSV/XLSX) e procede alla cancellazione dei dati entro 90 giorni,
                  salvo obblighi di legge.
                </p>
              </div>
            </section>

            {/* 6. Proprietà Intellettuale */}
            <section>
              <SectionHeader icon={Ban} number="6" title="Proprietà Intellettuale e Licenza" />
              <div className="prose prose-slate max-w-none mt-4 space-y-4">
                <p className="text-slate-600 leading-relaxed">
                  <strong>6.1</strong> La Piattaforma e tutto il software, il design, i loghi e la documentazione
                  sono di proprietà esclusiva del Fornitore. L&apos;Ente riceve una licenza d&apos;uso non esclusiva,
                  non trasferibile, limitata alla durata del contratto.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>6.2</strong> I dati inseriti dall&apos;Ente nella Piattaforma restano di <strong>esclusiva proprietà
                  dell&apos;Ente</strong>. Il Fornitore non acquisisce alcun diritto sui dati e non li utilizza
                  per finalità proprie.
                </p>
              </div>
            </section>

            {/* 7. Recesso */}
            <section>
              <SectionHeader icon={AlertTriangle} number="7" title="Durata, Recesso e Cessazione" />
              <div className="prose prose-slate max-w-none mt-4 space-y-4">
                <p className="text-slate-600 leading-relaxed">
                  <strong>7.1</strong> Il contratto ha durata annuale con rinnovo automatico, salvo
                  disdetta comunicata con almeno 60 giorni di preavviso rispetto alla scadenza.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>7.2</strong> Ciascuna parte può recedere per giusta causa (es. inadempimento
                  grave, violazione degli SLA ripetuta, uso fraudolento) con effetto immediato
                  previa comunicazione scritta via PEC.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  <strong>7.3</strong> Alla cessazione, il Fornitore garantisce un periodo di transizione
                  di 90 giorni durante il quale l&apos;Ente può esportare i propri dati. Trascorso tale termine,
                  i dati saranno cancellati in modo sicuro e irreversibile.
                </p>
              </div>
            </section>

            {/* 8. Foro Competente */}
            <section>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <p className="text-sm font-bold text-slate-700 mb-2">8. Legge Applicabile e Foro Competente</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Le presenti Condizioni sono regolate dalla legge italiana. Per ogni controversia
                  derivante dall&apos;interpretazione o dall&apos;esecuzione del presente contratto sarà competente
                  in via esclusiva il Foro di Bari.
                </p>
              </div>
            </section>

            {/* 9. Contatti */}
            <section>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
                <p className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Contatti
                </p>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li><strong>Commerciale:</strong> info@sentinel-pl.it</li>
                  <li><strong>Supporto tecnico:</strong> supporto@sentinel-pl.it</li>
                  <li><strong>Privacy/DPO:</strong> privacy@sentinel-pl.it</li>
                  <li><strong>PEC:</strong> sentinel-pl@pec.it</li>
                </ul>
              </div>
            </section>

          </div>
        </div>

        {/* Navigation */}
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionHeader({ icon: Icon, number, title }: { icon: any; number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">
        <span className="text-indigo-500 mr-1">{number}.</span> {title}
      </h2>
    </div>
  )
}
