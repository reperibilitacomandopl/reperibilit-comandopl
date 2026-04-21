import Link from "next/link"
import { Shield, ArrowRight, FileSearch, AlertTriangle, CheckCircle2, Scale, Users, MapPin, Database, Lock } from "lucide-react"

export const metadata = {
  title: "DPIA — Valutazione d'Impatto sulla Protezione dei Dati | Sentinel Security Suite",
  description: "Valutazione d'Impatto sulla Protezione dei Dati (DPIA) ai sensi dell'Art. 35 del Regolamento UE 2016/679 per la piattaforma Sentinel Security Suite."
}

export default function DPIAPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
              <FileSearch className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                DPIA — Valutazione d&apos;Impatto
              </h1>
              <p className="text-sm font-bold text-blue-300/60 mt-1 uppercase tracking-widest">
                Art. 35 Regolamento UE 2016/679 (GDPR)
              </p>
            </div>
          </div>
          <p className="text-white/40 text-sm font-medium mt-4">
            Documento di valutazione redatto: Aprile 2026 — Rev. 1.0
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12 space-y-10">

            {/* Intro */}
            <section>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" /> Perché questa DPIA è necessaria
                </p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Ai sensi dell&apos;Art. 35 GDPR e dell&apos;elenco delle tipologie di trattamenti soggetti a DPIA
                  pubblicato dal Garante per la Protezione dei Dati Personali (Provvedimento n. 467/2018),
                  il trattamento effettuato dalla piattaforma Sentinel Security Suite richiede una Valutazione
                  d&apos;Impatto in quanto:
                </p>
                <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc pl-5">
                  <li>Trattamento di dati di personale in rapporto di subordinazione (sorveglianza sistematica)</li>
                  <li>Utilizzo di dati di geolocalizzazione (Art. 4 L. 300/1970 — Statuto dei Lavoratori)</li>
                  <li>Trattamento su larga scala per organizzazioni di pubblica sicurezza</li>
                  <li>Monitoraggio sistematico di prestazioni lavorative (turni, presenze, straordinari)</li>
                </ul>
              </div>
            </section>

            {/* 1. Descrizione del Trattamento */}
            <section>
              <SectionHeader icon={Database} number="1" title="Descrizione Sistematica del Trattamento" />
              <div className="prose prose-slate max-w-none mt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <InfoCard label="Natura del trattamento" value="Raccolta, registrazione, organizzazione, strutturazione, conservazione, consultazione, uso, comunicazione, cancellazione di dati personali degli operatori di Polizia Locale" />
                  <InfoCard label="Ambito del trattamento" value="Dati identificativi, dati di servizio (turni, presenze), dati di geolocalizzazione (timbrature GPS, SOS), dati su assenze (senza dati sanitari), audit log operativi" />
                  <InfoCard label="Contesto del trattamento" value="Gestione operativa quotidiana di Comandi di Polizia Locale italiani in ambiente cloud multi-tenant. Accesso via browser web e PWA mobile." />
                  <InfoCard label="Finalità del trattamento" value="Pianificazione turni, generazione OdS con firma digitale, verifica presenze, gestione assenze e scambi turno, comunicazioni operative, reportistica per Ragioneria" />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <p className="text-sm font-bold text-slate-700 mb-3">Soggetti interessati</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                      <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">Agenti PL</p>
                      <p className="text-[10px] text-slate-400">Operatori in servizio</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                      <Shield className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">Ufficiali</p>
                      <p className="text-[10px] text-slate-400">Funzionari e dirigenti</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                      <Scale className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <p className="text-xs font-bold text-slate-700">Amministratori</p>
                      <p className="text-[10px] text-slate-400">Gestori del sistema</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Necessità e Proporzionalità */}
            <section>
              <SectionHeader icon={Scale} number="2" title="Valutazione di Necessità e Proporzionalità" />
              <div className="mt-4 space-y-3">
                <AssessmentRow
                  question="Il trattamento è necessario per la finalità perseguita?"
                  answer="Sì. La pianificazione dei turni, la generazione degli OdS e il monitoraggio delle presenze sono obblighi normativi per gli Enti di Polizia Locale (D.Lgs. 267/2000, TUEL)."
                  status="ok"
                />
                <AssessmentRow
                  question="Esistono alternative meno invasive?"
                  answer="Il sistema sostituisce processi cartacei (fogli Excel, fax, telefonate) che sono meno sicuri e meno tracciabili. La digitalizzazione riduce il rischio di perdita/accesso non autorizzato."
                  status="ok"
                />
                <AssessmentRow
                  question="La geolocalizzazione è proporzionata?"
                  answer="Il GPS è attivabile solo su base volontaria per le timbrature e in emergenza (SOS). Non è un tracciamento continuo. L'Ente può disattivare la funzione. Conforme all'Art. 4 Statuto Lavoratori con informativa preventiva."
                  status="ok"
                />
                <AssessmentRow
                  question="I dati sono minimizzati?"
                  answer="Sì. Non si raccolgono dati sanitari (diagnosi), dati biometrici, o dati particolari ex Art. 9 GDPR. Le assenze per malattia sono registrate solo come codice generico."
                  status="ok"
                />
                <AssessmentRow
                  question="I periodi di conservazione sono giustificati?"
                  answer="Sì. I dati GPS sono cancellati automaticamente dopo 6 mesi. I dati organizzativi seguono gli obblighi archivistici della PA (5-10 anni)."
                  status="ok"
                />
              </div>
            </section>

            {/* 3. Rischi e Misure */}
            <section>
              <SectionHeader icon={AlertTriangle} number="3" title="Analisi dei Rischi e Misure di Mitigazione" />
              <div className="mt-4 space-y-4">
                <RiskRow
                  risk="Accesso non autorizzato ai dati degli agenti"
                  probability="Media"
                  impact="Alto"
                  measures={[
                    "Autenticazione con password hashate (bcrypt)",
                    "Middleware centralizzato con verifica sessione su ogni request",
                    "Isolamento multi-tenant rigoroso a livello database",
                    "Rate limiting anti brute-force",
                    "Audit log di tutte le operazioni amministrative"
                  ]}
                  residualRisk="Basso"
                />
                <RiskRow
                  risk="Violazione/perdita dei dati (data breach)"
                  probability="Bassa"
                  impact="Molto Alto"
                  measures={[
                    "Crittografia TLS 1.3 in transito, AES-256 at rest",
                    "Backup automatici giornalieri con retention 30 giorni",
                    "Database ospitato su infrastruttura AWS EU (Francoforte)",
                    "Procedura di incident response documentata",
                    "Notifica al Titolare entro 48 ore dalla scoperta"
                  ]}
                  residualRisk="Basso"
                />
                <RiskRow
                  risk="Sorveglianza sproporzionata via GPS"
                  probability="Bassa"
                  impact="Alto"
                  measures={[
                    "GPS attivato solo al momento della timbratura (non continuo)",
                    "SOS GPS attivato volontariamente dall'operatore",
                    "Dati GPS cancellati automaticamente dopo 6 mesi",
                    "Informativa preventiva ex Art. 4 Statuto Lavoratori",
                    "Possibilità per l'Ente di disattivare la funzione GPS"
                  ]}
                  residualRisk="Molto Basso"
                />
                <RiskRow
                  risk="Uso improprio dei dati da parte degli Amministratori"
                  probability="Media"
                  impact="Medio"
                  measures={[
                    "Permessi granulari (RBAC) — non tutti gli admin vedono tutto",
                    "Audit trail immutabile di ogni operazione",
                    "Month Lock per prevenire modifiche retroattive",
                    "Formazione raccomandata per gli Amministratori"
                  ]}
                  residualRisk="Basso"
                />
                <RiskRow
                  risk="Trasferimento dati extra-UE"
                  probability="Bassa"
                  impact="Medio"
                  measures={[
                    "Database su AWS EU-Central-1 (Francoforte, Germania)",
                    "DPA con Supabase e Vercel con SCC (Standard Contractual Clauses)",
                    "Vercel edge network con PoP EU per minimizzare routing extra-UE",
                    "Nessun sub-responsabile in giurisdizioni senza adequacy decision"
                  ]}
                  residualRisk="Molto Basso"
                />
              </div>
            </section>

            {/* 4. Conclusioni */}
            <section>
              <SectionHeader icon={CheckCircle2} number="4" title="Conclusioni e Parere" />
              <div className="prose prose-slate max-w-none mt-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                  <p className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5" /> Esito della Valutazione
                  </p>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    Sulla base dell&apos;analisi condotta, si conclude che il livello di <strong>rischio residuo
                    è accettabile</strong>, in quanto le misure tecniche e organizzative implementate sono adeguate
                    a mitigare i rischi identificati. Il trattamento può proseguire nel rispetto delle
                    condizioni e delle misure descritte nel presente documento.
                  </p>
                  <p className="text-sm text-emerald-700 leading-relaxed mt-3">
                    Si raccomanda di:
                  </p>
                  <ul className="text-sm text-emerald-700 mt-2 space-y-1 list-disc pl-5">
                    <li>Riesaminare la presente DPIA con cadenza annuale o in caso di modifiche significative al trattamento</li>
                    <li>Consultare il DPO dell&apos;Ente prima dell&apos;attivazione delle funzionalità GPS</li>
                    <li>Fornire informativa preventiva scritta a tutto il personale interessato (Art. 4 L. 300/1970)</li>
                    <li>Procedere con la qualificazione AgID/ACN per l&apos;iscrizione al Catalogo Cloud Italia</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Firma */}
            <section>
              <div className="border-t border-slate-200 pt-6 mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 rounded-xl p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Redatto da</p>
                    <p className="text-sm font-bold text-slate-700">Sentinel Security Suite</p>
                    <p className="text-xs text-slate-500">Ruolo: Responsabile del Trattamento</p>
                    <p className="text-xs text-slate-400 mt-2">Data: Aprile 2026</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approvato da</p>
                    <p className="text-sm font-bold text-slate-700">[Nome DPO / Titolare Ente]</p>
                    <p className="text-xs text-slate-500">Ruolo: Titolare del Trattamento / DPO</p>
                    <p className="text-xs text-slate-400 mt-2">Data: _______________</p>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-8 pb-8">
          <Link href="/policy" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            <ArrowRight className="w-4 h-4 rotate-180" /> Privacy Policy
          </Link>
          <span className="text-slate-300 mx-4">·</span>
          <Link href="/terms" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            Termini di Servizio <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-slate-300 mx-4">·</span>
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm">
            Home <ArrowRight className="w-4 h-4" />
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  )
}

function AssessmentRow({ question, answer, status }: { question: string; answer: string; status: "ok" | "warning" | "risk" }) {
  return (
    <div className={`rounded-xl p-5 border ${status === "ok" ? "bg-emerald-50 border-emerald-100" : status === "warning" ? "bg-amber-50 border-amber-100" : "bg-rose-50 border-rose-100"}`}>
      <p className={`text-sm font-bold mb-2 flex items-center gap-2 ${status === "ok" ? "text-emerald-800" : status === "warning" ? "text-amber-800" : "text-rose-800"}`}>
        {status === "ok" && <CheckCircle2 className="w-4 h-4" />}
        {status === "warning" && <AlertTriangle className="w-4 h-4" />}
        {question}
      </p>
      <p className={`text-sm leading-relaxed ${status === "ok" ? "text-emerald-700" : status === "warning" ? "text-amber-700" : "text-rose-700"}`}>
        {answer}
      </p>
    </div>
  )
}

function RiskRow({ risk, probability, impact, measures, residualRisk }: {
  risk: string;
  probability: string;
  impact: string;
  measures: string[];
  residualRisk: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">{risk}</p>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0 w-fit">
          Residuo: {residualRisk}
        </span>
      </div>
      <div className="p-5">
        <div className="flex gap-4 mb-3">
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Probabilità</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{probability}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Impatto</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{impact}</p>
          </div>
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Misure di mitigazione</p>
        <ul className="space-y-1">
          {measures.map((m, i) => (
            <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
              <Lock className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
