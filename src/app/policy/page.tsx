import Link from "next/link"
import { Shield, ArrowRight, Mail, Building2, Scale, FileText, Eye, Trash2, Download, AlertCircle } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Informativa sul trattamento dei dati personali | Sentinel Security Suite",
  description: "Informativa completa ai sensi del Regolamento UE 2016/679 (GDPR) sul trattamento dei dati personali effettuato da Sentinel Security Suite."
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                Informativa sulla Privacy
              </h1>
              <p className="text-sm font-bold text-blue-300/60 mt-1 uppercase tracking-widest">
                Ai sensi degli Artt. 13 e 14 del Regolamento UE 2016/679 (GDPR)
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

            {/* 1. Titolare del Trattamento */}
            <section>
              <SectionHeader icon={Building2} number="1" title="Titolare del Trattamento" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  Il Titolare del trattamento dei dati personali è l&apos;Ente Comunale che ha sottoscritto il contratto
                  di licenza SaaS con Sentinel Security Suite (&ldquo;Piattaforma&rdquo;). Sentinel Security Suite opera
                  in qualità di <strong>Responsabile del trattamento</strong> ai sensi dell&apos;Art. 28 del Regolamento UE 2016/679,
                  sulla base di un apposito Data Processing Agreement (DPA) stipulato con ciascun Ente.
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-4">
                  <p className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Contatti del Responsabile del Trattamento
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li><strong>Denominazione:</strong> Sentinel Security Suite</li>
                    <li><strong>Email:</strong> privacy@sentinel-pl.it</li>
                    <li><strong>PEC:</strong> sentinel-pl@pec.it</li>
                  </ul>
                </div>
                <p className="text-slate-600 leading-relaxed mt-4">
                  Per la nomina del <strong>Data Protection Officer (DPO)</strong> dell&apos;Ente Titolare,
                  si prega di consultare il Registro dei Trattamenti dell&apos;Ente stesso, pubblicato ai sensi dell&apos;Art. 37 GDPR.
                </p>
              </div>
            </section>

            {/* 2. Categorie di Dati Trattati */}
            <section>
              <SectionHeader icon={FileText} number="2" title="Categorie di Dati Personali Trattati" />
              <div className="mt-4 space-y-4">
                <DataCategory
                  title="Dati Identificativi"
                  items={[
                    "Nome e cognome del personale",
                    "Matricola amministrativa",
                    "Qualifica e grado funzionale",
                    "Indirizzo email istituzionale (opzionale)",
                    "Numero di telefono di servizio (opzionale)",
                    "Data di nascita e data di assunzione"
                  ]}
                />
                <DataCategory
                  title="Dati di Servizio"
                  items={[
                    "Turni di lavoro assegnati e orari di servizio",
                    "Tipo di servizio svolto (es. pattuglia stradale, viabilità scuole)",
                    "Appartenenza a squadre/sezioni operative",
                    "Scambi turno richiesti e approvati",
                    "Straordinari e ore lavorate"
                  ]}
                />
                <DataCategory
                  title="Dati di Assenza"
                  items={[
                    "Ferie, permessi retribuiti, congedi (solo tipo e durata, senza diagnosi)",
                    "Permessi L.104/92 (solo il diritto, non la patologia)",
                    "Congedi parentali e formativi",
                    "Saldi residui annuali per tipologia"
                  ]}
                />
                <DataCategory
                  title="Dati di Geolocalizzazione (GPS)"
                  badge="Trattamento particolare"
                  items={[
                    "Coordinate GPS al momento della timbratura (clock-in/clock-out), solo se la funzionalità è attivata dall'Ente",
                    "Coordinate GPS in caso di attivazione volontaria dell'SOS Emergenza da parte dell'agente operatore",
                    "I dati GPS NON sono raccolti in modalità continuativa e NON costituiscono tracciamento in tempo reale"
                  ]}
                />
                <DataCategory
                  title="Dati Tecnici"
                  items={[
                    "Indirizzo IP (per finalità di sicurezza e rate limiting)",
                    "User-agent del browser",
                    "Timestamp di accesso e operazioni (audit log)"
                  ]}
                />
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                  <p className="text-sm font-bold text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Dati NON trattati
                  </p>
                  <p className="text-sm text-rose-700 mt-2">
                    La Piattaforma <strong>non raccoglie</strong>: dati sanitari, diagnosi mediche, orientamento politico,
                    religioso o sessuale, dati biometrici, dati giudiziari. Le assenze per malattia sono registrate
                    solo come codice &ldquo;MALATTIA&rdquo; senza alcun riferimento alla patologia.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Finalità e Base Giuridica */}
            <section>
              <SectionHeader icon={Scale} number="3" title="Finalità e Base Giuridica del Trattamento" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Finalità</th>
                      <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Base Giuridica (Art. 6 GDPR)</th>
                      <th className="text-left p-3 font-bold text-slate-700 border-b border-slate-200">Conservazione</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b border-slate-100">
                      <td className="p-3">Gestione turni di lavoro e organizzazione del servizio</td>
                      <td className="p-3">Art. 6(1)(e) — Esecuzione compito di interesse pubblico</td>
                      <td className="p-3">5 anni dalla data</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3">Generazione Ordini di Servizio (OdS)</td>
                      <td className="p-3">Art. 6(1)(c) — Obbligo legale (D.Lgs. 267/2000)</td>
                      <td className="p-3">10 anni (obbligo archivistico)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3">Timbrature GPS e verifica presenza in servizio</td>
                      <td className="p-3">Art. 6(1)(e) — Interesse pubblico + informativa ex Art. 4 L. 300/1970</td>
                      <td className="p-3">6 mesi</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3">SOS Emergenze e geolocalizzazione operativa</td>
                      <td className="p-3">Art. 6(1)(d) — Interesse vitale + Art. 6(1)(e)</td>
                      <td className="p-3">6 mesi</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3">Gestione assenze, ferie, permessi</td>
                      <td className="p-3">Art. 6(1)(b) — Esecuzione rapporto contrattuale di lavoro</td>
                      <td className="p-3">5 anni</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3">Export dati per la Ragioneria (buste paga)</td>
                      <td className="p-3">Art. 6(1)(c) — Obbligo legale (normativa fiscale)</td>
                      <td className="p-3">10 anni</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="p-3">Audit log e tracciabilità operazioni</td>
                      <td className="p-3">Art. 6(1)(f) — Legittimo interesse (sicurezza informatica)</td>
                      <td className="p-3">12 mesi</td>
                    </tr>
                    <tr>
                      <td className="p-3">Notifiche push e comunicazioni via Telegram</td>
                      <td className="p-3">Art. 6(1)(e) — Interesse pubblico (comunicazione operativa)</td>
                      <td className="p-3">6 mesi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Destinatari e Trasferimenti */}
            <section>
              <SectionHeader icon={Eye} number="4" title="Destinatari e Trasferimenti dei Dati" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  I dati personali possono essere comunicati a:
                </p>
                <ul className="text-slate-600 space-y-2 mt-3 list-disc pl-5">
                  <li>
                    <strong>Sub-responsabili del trattamento</strong>, elencati e contrattualizzati con DPA:
                    <ul className="mt-2 space-y-1.5 text-sm">
                      <li><strong>Supabase Inc.</strong> — Database PostgreSQL (hosting: AWS EU-Central-1, Francoforte, Germania). DPA: <a href="https://supabase.com/privacy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener">supabase.com/privacy</a></li>
                      <li><strong>Vercel Inc.</strong> — Hosting applicazione web (Edge Network con PoP in EU). DPA: <a href="https://vercel.com/legal/dpa" className="text-indigo-600 hover:underline" target="_blank" rel="noopener">vercel.com/legal/dpa</a></li>
                      <li><strong>Telegram FZ-LLC</strong> — Solo per le notifiche operative, se attivate dall&apos;Ente (nessun dato personale trasferito oltre il messaggio di notifica)</li>
                    </ul>
                  </li>
                  <li><strong>Personale autorizzato dell&apos;Ente</strong> con ruolo di Amministratore, nei limiti delle proprie abilitazioni</li>
                </ul>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-5 mt-4">
                  <p className="text-sm font-bold text-amber-800 mb-2">⚠️ Trasferimenti extra-UE</p>
                  <p className="text-sm text-amber-700">
                    I server database sono localizzati nell&apos;Unione Europea (AWS Frankfurt, DE).
                    Vercel potrebbe processare richieste HTTP tramite edge nodes extra-UE: in tal caso,
                    i trasferimenti sono coperti dalle Standard Contractual Clauses (SCC) ai sensi dell&apos;Art. 46(2)(c) GDPR
                    e dal Data Privacy Framework UE-USA.
                    <strong> Nessun dato viene venduto o condiviso con terze parti per finalità di marketing o profilazione.</strong>
                  </p>
                </div>
              </div>
            </section>

            {/* 5. Diritti dell'Interessato */}
            <section>
              <SectionHeader icon={Download} number="5" title="Diritti dell'Interessato" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  In qualità di interessato, ogni operatore ha diritto di esercitare i seguenti diritti
                  rivolgendosi al <strong>Titolare del Trattamento</strong> (l&apos;Ente Comunale) o al Responsabile (Sentinel):
                </p>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <RightCard title="Diritto di Accesso" article="Art. 15" description="Ottenere conferma che sia o meno in corso un trattamento di dati personali che lo riguardano e, in tal caso, ottenere copia dei dati." />
                  <RightCard title="Diritto di Rettifica" article="Art. 16" description="Ottenere la rettifica dei dati personali inesatti o l'integrazione dei dati incompleti." />
                  <RightCard title="Diritto alla Cancellazione" article="Art. 17" description="Ottenere la cancellazione dei dati personali, salvo obblighi di legge che ne impongano la conservazione." />
                  <RightCard title="Diritto di Limitazione" article="Art. 18" description="Ottenere la limitazione del trattamento in caso di contestazione sulla esattezza dei dati." />
                  <RightCard title="Diritto alla Portabilità" article="Art. 20" description="Ricevere i dati personali in un formato strutturato, di uso comune e leggibile da dispositivo automatico (es. CSV)." />
                  <RightCard title="Diritto di Opposizione" article="Art. 21" description="Opporsi al trattamento dei dati per motivi legittimi, salvo prevalenti interessi pubblici." />
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mt-6">
                  <p className="text-sm font-bold text-indigo-800 mb-2">📧 Come esercitare i diritti</p>
                  <p className="text-sm text-indigo-700">
                    Inviare una richiesta scritta a <strong>privacy@sentinel-pl.it</strong> o contattare il DPO
                    dell&apos;Ente di appartenenza. La richiesta sarà evasa entro 30 giorni dalla ricezione.
                    In caso di mancato riscontro, è possibile proporre reclamo al <strong>Garante per la Protezione
                    dei Dati Personali</strong> (<a href="https://www.garanteprivacy.it" className="text-indigo-600 hover:underline" target="_blank" rel="noopener">www.garanteprivacy.it</a>).
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Data Retention */}
            <section>
              <SectionHeader icon={Trash2} number="6" title="Conservazione e Cancellazione dei Dati" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  I dati personali sono conservati per il tempo strettamente necessario alle finalità
                  sopra descritte, secondo la seguente politica di retention:
                </p>
                <ul className="text-slate-600 space-y-2 mt-3 list-disc pl-5">
                  <li><strong>Timbrature GPS e dati di geolocalizzazione:</strong> 6 mesi (cancellazione automatica mensile)</li>
                  <li><strong>Notifiche e comunicazioni operative:</strong> 6 mesi</li>
                  <li><strong>Audit log operativi:</strong> 12 mesi</li>
                  <li><strong>Turni di servizio, assenze e dati organizzativi:</strong> 5 anni (obbligo documentale PA)</li>
                  <li><strong>Ordini di Servizio firmati digitalmente:</strong> 10 anni (obbligo archivistico)</li>
                  <li><strong>Dati contrattuali dell&apos;Ente (Tenant):</strong> conservati per tutta la durata del contratto + 10 anni</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  La cancellazione automatica è gestita tramite un processo di <em>data retention</em> schedulato
                  che opera il primo giorno di ogni mese. In caso di cessazione del rapporto contrattuale,
                  l&apos;Ente può richiedere l&apos;esportazione completa dei propri dati in formato strutturato (CSV/XLSX)
                  e la successiva cancellazione dal sistema.
                </p>
              </div>
            </section>

            {/* 7. Sicurezza */}
            <section>
              <SectionHeader icon={Shield} number="7" title="Misure di Sicurezza" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  Sentinel Security Suite implementa le seguenti misure tecniche e organizzative
                  a protezione dei dati personali:
                </p>
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <SecurityMeasure title="Crittografia" description="TLS 1.3 per tutti i dati in transito. Crittografia AES-256 per i dati at rest nel database." />
                  <SecurityMeasure title="Autenticazione" description="Password con hashing bcrypt (costo computazionale 10), JWT firmati con chiave crittografica a 256 bit." />
                  <SecurityMeasure title="Autorizzazione" description="Isolamento multi-tenant rigoroso. Controllo accessi basato su ruoli (RBAC) con permessi granulari." />
                  <SecurityMeasure title="Rate Limiting" description="Protezione anti brute-force su login e API critiche. Blocco automatico dopo 5 tentativi falliti." />
                  <SecurityMeasure title="Audit Trail" description="Registrazione immutabile di tutte le operazioni amministrative con timestamp, autore e dettagli." />
                  <SecurityMeasure title="Backup" description="Backup automatici giornalieri del database con retention di 30 giorni. Point-in-time recovery disponibile." />
                </div>
              </div>
            </section>

            {/* 8. Cookie */}
            <section>
              <SectionHeader icon={FileText} number="8" title="Cookie e Tecnologie di Tracciamento" />
              <div className="prose prose-slate max-w-none mt-4">
                <p className="text-slate-600 leading-relaxed">
                  La Piattaforma utilizza esclusivamente <strong>cookie tecnici strettamente necessari</strong> al funzionamento:
                </p>
                <ul className="text-slate-600 space-y-2 mt-3 list-disc pl-5">
                  <li><strong>Cookie di sessione (next-auth.session-token):</strong> necessario per mantenere l&apos;autenticazione dell&apos;utente. Scade alla chiusura della sessione o dopo 30 giorni.</li>
                  <li><strong>Cookie CSRF (next-auth.csrf-token):</strong> necessario per la protezione contro attacchi Cross-Site Request Forgery.</li>
                </ul>
                <p className="text-slate-600 leading-relaxed mt-4">
                  <strong>Non vengono utilizzati cookie di profilazione, analytics di terze parti, o tecnologie di tracciamento pubblicitario.</strong> Pertanto, ai sensi delle Linee Guida del Garante Privacy sui cookie (10 giugno 2021), non è necessario il consenso preventivo per i cookie tecnici.
                </p>
              </div>
            </section>

            {/* 9. Modifiche */}
            <section>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <p className="text-sm font-bold text-slate-700 mb-2">Modifiche alla presente informativa</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Il Responsabile del Trattamento si riserva il diritto di modificare, aggiornare o integrare
                  la presente informativa in qualsiasi momento. Le modifiche saranno comunicate mediante
                  pubblicazione sulla Piattaforma. Si raccomanda di consultare periodicamente questa pagina.
                  L&apos;utilizzo continuato della Piattaforma dopo la pubblicazione delle modifiche costituisce
                  accettazione delle stesse.
                </p>
              </div>
            </section>

          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8 pb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Torna alla Home
          </Link>
          <span className="text-slate-300 mx-4">·</span>
          <Link href="/terms" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            Termini di Servizio <ArrowRight className="w-4 h-4" />
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

function DataCategory({ title, items, badge }: { title: string; items: string[]; badge?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200">
            {badge}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
            <span className="text-indigo-400 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RightCard({ title, article, description }: { title: string; article: string; description: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full">{article}</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}

function SecurityMeasure({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
      <h4 className="text-sm font-bold text-emerald-800 mb-1">{title}</h4>
      <p className="text-xs text-emerald-700 leading-relaxed">{description}</p>
    </div>
  )
}
