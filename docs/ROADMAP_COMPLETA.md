# Sentinel Security Suite — Roadmap Completa per PA

> **Obiettivo:** Trasformare la v1 (`reperibilit-comandopl`) in un SaaS certificabile, vendibile alle Pubbliche Amministrazioni italiane.
> **Riferimenti normativi:** CAD (D.Lgs. 82/2005), GDPR (UE 2016/679), AgID, NIS2 (D.Lgs. 138/2024), OWASP Top 10, ISO/IEC 27001.

---

## Stato Attuale del Progetto

| Metriche | Valore |
|---|---|
| API Routes | 131 |
| Componenti React | 103 |
| Pagine | 42 |
| Modelli Prisma | 39 |
| Soft-delete | 10 modelli |
| Rate Limiting | Upstash Redis (4 livelli) |
| Crittografia | AES-256-GCM |
| Autenticazione | NextAuth v5 + JWT + 2FA TOTP |
| Mobile | PWA installabile + Telegram Bot |
| Deploy | Vercel + Docker/Nginx |

### Cosa già fatto (pre-audit)
- Rate limiting distribuito (Upstash Redis)
- Lockout account (campi nel DB, da attivare completamente)
- 2FA TOTP con trusted IPs
- MFA enforcement per admin
- Isolamento multi-tenant (middleware + tenantId filter)
- Audit logging bloccante con requestId
- Crittografia AES-256-GCM per dati sensibili
- Soft-delete su 10 modelli
- CSP restrittiva, HSTS, security headers
- Cookie banner GDPR
- Form demo funzionante (Telegram)
- Toolbar pianificazione riorganizzata
- KPI cliccabili + contatore richieste
- Legenda colori turni
- SOS long-press (2.5s)
- PDF watermark "BOZZA"
- Template ODS + notifica Telegram automatica

---

## FASE 1 — SICUREZZA CRITICA (Settimana 1-2)

> **Obiettivo:** Superare un penetration test e rispettare i requisiti minimi AgID.

### 1.1 — Lockout Account Progressivo

**Rischio attuale:** Il modello User ha `failedLoginAttempts` e `lockoutUntil` ma il meccanismo non copre tutti i flussi.

| # | Azione | File coinvolti |
|---|--------|----------------|
| 1.1.1 | Attivare lockout: 5 tentativi → 15 min, 10 → 24h con notifica admin, 20+ → blocco permanente | `auth.ts` |
| 1.1.2 | Inviare notifica Telegram/email all'utente al primo lockout | `auth.ts`, `lib/telegram.ts` |
| 1.1.3 | Aggiungere campo `lockoutReason` e `unlockedBy` nel modello User | `prisma/schema.prisma` |
| 1.1.4 | UI admin per sblocco manuale utenti bloccati | `components/admin/AdminPersonnelModal.tsx` |

### 1.2 — hCaptcha Dopo Tentativi Falliti

**Rischio attuale:** Nessuna protezione anti-bot sul form di login.

| # | Azione | File coinvolti |
|---|--------|----------------|
| 1.2.1 | Installare `@hcaptcha/react-hcaptcha` | `package.json` |
| 1.2.2 | Mostrare hCaptcha dopo 3 tentativi falliti sullo stesso IP | `app/login/page.tsx` |
| 1.2.3 | Validare il token hCaptcha lato server nell'endpoint auth | `auth.ts` |

### 1.3 — Backup Codes 2FA

**Rischio attuale:** Admin che perde il telefono perde l'accesso permanente. Il campo `twoFactorBackupCodes` esiste ma non è implementato.

| # | Azione | File coinvolti |
|---|--------|----------------|
| 1.3.1 | Generare 8 backup codes all'attivazione 2FA, hashare con bcrypt prima di salvare | `app/api/auth/2fa/setup/route.ts` |
| 1.3.2 | UI per mostrare i codici una volta sola con conferma di avvenuta copia | `components/TwoFactorSetupModal.tsx` |
| 1.3.3 | Endpoint per usare un backup code al posto del TOTP (monouso) | `app/api/auth/2fa/verify/route.ts` |
| 1.3.4 | Loggare ogni uso di backup code nell'audit | `lib/audit.ts` |

### 1.4 — Log Eventi MFA Completi

| # | Azione | File coinvolti |
|---|--------|----------------|
| 1.4.1 | Tracciare: attivazione MFA, disattivazione, verifica ok/ko, uso backup code, tentativi falliti consecutivi | `lib/audit.ts`, `app/api/auth/2fa/*` |
| 1.4.2 | Alert admin se più di 5 tentativi 2FA falliti consecutivi | `lib/telegram.ts` |

### 1.5 — Signed URL per File/Allegati

**Rischio attuale:** I file caricati potrebbero usare URL pubblici permanenti.

| # | Azione | File coinvolti |
|---|--------|----------------|
| 1.5.1 | Implementare generazione signed URL con scadenza 15 minuti | `lib/storage.ts` (nuovo) |
| 1.5.2 | Usare Cloudflare R2 o S3-compatible storage con bucket per tenant | `lib/storage.ts` |
| 1.5.3 | Organizzare file in `/tenants/{tenantId}/{userId}/...` | `lib/storage.ts` |

### 1.6 — Test Isolamento Tenant Automatizzato

| # | Azione | File coinvolti |
|---|--------|----------------|
| 1.6.1 | Scrivere test E2E: utente Comune A non vede dati Comune B (API + pagine) | `__tests__/e2e/tenant-isolation.test.ts` |
| 1.6.2 | Aggiungere al flusso CI/CD GitHub Actions | `.github/workflows/ci.yml` |

---

## FASE 2 — SICUREZZA AVANZATA (Settimana 3-4)

> **Obiettivo:** Conformità GDPR completa e protezione da minacce OWASP Top 10.

### 2.1 — Rate Limiting Per-Utente

**Rischio attuale:** Il rate limiting è per IP. Un utente malintenzionato dietro VPN può bypassarlo.

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.1.1 | Aggiungere chiave `ratelimit:user:{userId}:write` sui limiter | `lib/rate-limit.ts` |
| 2.1.2 | Applicare limiti GET 200/min per utente autenticato | `middleware.ts` |
| 2.1.3 | Applicare limiti 10/ora per generazione PDF OdS | `app/api/admin/ods/generate/route.ts` |

### 2.2 — Monitoraggio Anomalie e Alert

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.2.1 | Aggiungere contatore operazioni per tenant in Redis | `lib/rate-limit.ts` |
| 2.2.2 | Alert Telegram se un tenant supera 3× il consumo medio in 10 minuti | `lib/anomaly-detector.ts` (nuovo) |
| 2.2.3 | Dashboard superadmin con metriche in tempo reale | `components/SuperAdminDashboard.tsx` |

### 2.3 — Firma Digitale PDF con Certificato X.509

**Rischio attuale:** L'OdS ha hash SHA-256 ma non ha firma digitale con certificato. Per pieno valore legale serve firma X.509.

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.3.1 | Integrare `node-forge` o `@peculiar/x509` per firma PKCS#7 | `utils/pdf-generator.ts` |
| 2.3.2 | Acquistare certificato da CA accreditata AgID (Infocert/Aruba) | — |
| 2.3.3 | Aggiungere firma digitale visibile + invisibile nel PDF | `utils/pdf-generator.ts` |

### 2.4 — Timestamp RFC 3161 (opponibile a terzi)

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.4.1 | Richiedere timestamp a FreeTSA/DigiCert TSA alla generazione OdS | `utils/pdf-generator.ts` |
| 2.4.2 | Salvare il token di timestamp nel DB con l'OdS | Modello `CertifiedDocument` |

### 2.5 — Dependency Scanning Automatico

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.5.1 | Aggiungere `npm audit --audit-level=high` al CI/CD | `.github/workflows/ci.yml` |
| 2.5.2 | Attivare Dependabot su GitHub per aggiornamenti automatici | GitHub Settings |
| 2.5.3 | Aggiungere Snyk scan (piano gratuito) | `.github/workflows/security.yml` (nuovo) |

### 2.6 — Penetration Test Automatizzato OWASP ZAP

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.6.1 | Aggiungere OWASP ZAP Full Scan su staging a ogni deploy | `.github/workflows/security.yml` |

### 2.7 — Secrets Management

| # | Azione | File coinvolti |
|---|--------|----------------|
| 2.7.1 | Verificare `.env` in `.gitignore` e mai committato | `.gitignore` |
| 2.7.2 | Ruotare AUTH_SECRET, DB credentials, Upstash token ogni 90 giorni | Documentazione |
| 2.7.3 | Documentare procedura rotazione secrets | `docs/SECURITY.md` (nuovo) |

---

## FASE 3 — FUNZIONALITÀ ORGANIZZATIVE (Settimana 5-7)

> **Obiettivo:** Colmare i gap funzionali per essere competitivi con soluzioni enterprise.

### 3.1 — Pianificazione Ferie Annuale

| # | Azione | File coinvolti |
|---|--------|----------------|
| 3.1.1 | Modello `VacationPlan` (tenantId, userId, periodo, stato, note) | `prisma/schema.prisma` |
| 3.1.2 | UI agente: selezionare periodo estivo/invernale con preferenze | `components/agent/VacationPlanner.tsx` (nuovo) |
| 3.1.3 | UI admin: vista annuale con conflitti evidenziati, drag & drop assegnazione | `components/admin/VacationManager.tsx` (nuovo) |
| 3.1.4 | Calcolo automatico giorni residui per periodo | `app/api/admin/vacations/route.ts` (nuovo) |

### 3.2 — Workflow Approvativo a 2 Livelli

| # | Azione | File coinvolti |
|---|--------|----------------|
| 3.2.1 | Flusso: agente → ufficiale di turno → admin (con timeout 48h) | `app/api/requests/*` |
| 3.2.2 | Notifica Telegram/email a ogni passaggio e su timeout | `lib/telegram.ts` |
| 3.2.3 | UI con stato visibile (in attesa ufficiale / in attesa admin / approvata) | `components/agent/AgentRequestForm.tsx` |

### 3.3 — Modulo Reperibilità Notturna e Festiva

| # | Azione | File coinvolti |
|---|--------|----------------|
| 3.3.1 | Estendere modello Shift con tipo `NOTTURNO`, `FESTIVO`, `REPERIBILITA` | `prisma/schema.prisma` |
| 3.3.2 | Griglia separata per reperibilità nel planner mensile | `components/MonthlyShiftPlanner.tsx` |
| 3.3.3 | Calcolo indennità automatico in base al CCNL | `utils/entitlements-calc.ts` (nuovo) |

### 3.4 — Dashboard del Comandante

| # | Azione | File coinvolti |
|---|--------|----------------|
| 3.4.1 | Vista alto livello: copertura territorio, tempi medi intervento, statistiche per zona | `components/CommanderDashboard.tsx` (nuovo) |
| 3.4.2 | Report mensile automatico via PEC al sindaco | `app/api/cron/commander-report/route.ts` (nuovo) |
| 3.4.3 | Grafici trend (recharts): organico, straordinari, assenteismo | `components/CommanderDashboard.tsx` |

### 3.5 — Gestione Eventi e Servizi Programmabili

| # | Azione | File coinvolti |
|---|--------|----------------|
| 3.5.1 | Modello `Event` (nome, data, luogo, fabbisogno agenti, pattuglie dedicate) | `prisma/schema.prisma` |
| 3.5.2 | Assegnazione automatica pattuglie all'evento | `utils/event-planner.ts` (nuovo) |
| 3.5.3 | UI creazione evento con mappa per delimitare area | `components/admin/EventManager.tsx` (nuovo) |

### 3.6 — Integrazione MonthlyReport dalla v2

| # | Azione | File coinvolti |
|---|--------|----------------|
| 3.6.1 | Portare `MonthlyReport.tsx` con grafici Recharts ed export Excel | Copiare da v2 |
| 3.6.2 | Aggiungere pagina `/admin/report` | `app/[tenantSlug]/admin/report/page.tsx` |
| 3.6.3 | Collegare nella sidebar admin | `components/AdminSidebar.tsx` |

---

## FASE 4 — GRAFICA E UX DESKTOP (Settimana 8-9)

> **Obiettivo:** Interfaccia professionale, accessibile, con Dark Mode.

### 4.1 — Dark Mode Completa

| # | Azione | File coinvolti |
|---|--------|----------------|
| 4.1.1 | Aggiungere toggle Dark/Light nella sidebar admin e header agente | `components/AdminSidebar.tsx`, `components/agent/AgentHeader.tsx` |
| 4.1.2 | Tema scuro con palette ottimizzata per centrale operativa | `app/globals.css`, configurazione Tailwind |
| 4.1.3 | Rispettare `prefers-color-scheme` del sistema + override manuale salvato | `app/layout.tsx` |
| 4.1.4 | Dark mode per TUTTE le pagine (admin, agent, login, landing, superadmin) | Tutti i componenti |

### 4.2 — Vista Multi-Monitor per Centrale Operativa

| # | Azione | File coinvolti |
|---|--------|----------------|
| 4.2.1 | Modalità "schermo diviso": mappa a sinistra, coda interventi a destra, KPIs in alto | `components/ControlRoomMap.tsx` |
| 4.2.2 | Layout responsive per 2-3 monitor con CSS Grid `grid-template-areas` | `components/ControlRoomMap.tsx` |
| 4.2.3 | Sincronizzazione stato tra finestre (Broadcast Channel API) | `hooks/useMultiWindow.ts` (nuovo) |

### 4.3 — Shortcut da Tastiera

| # | Azione | File coinvolti |
|---|--------|----------------|
| 4.3.1 | `Ctrl+T` timbra, `Ctrl+S` SOS, `Ctrl+I` nuovo intervento, `1-9` naviga viste | `hooks/useKeyboardShortcuts.ts` (nuovo) |
| 4.3.2 | Barra ricerca globale `Ctrl+K` per saltare a qualsiasi pagina/agente | `components/GlobalSearchModal.tsx` (nuovo) |
| 4.3.3 | Overlay help `?` per mostrare tutti gli shortcut disponibili | `components/KeyboardHelpModal.tsx` (nuovo) |

### 4.4 — Vista Timeline Interventi

| # | Azione | File coinvolti |
|---|--------|----------------|
| 4.4.1 | Timeline orizzontale interattiva (24h) con interventi sovrapposti ai turni | `components/InterventionTimeline.tsx` (nuovo) |
| 4.4.2 | Zoom in/out per fascia oraria, click per aprire dettaglio intervento | `components/InterventionTimeline.tsx` |

### 4.5 — Esportazione Report Personalizzabile

| # | Azione | File coinvolti |
|---|--------|----------------|
| 4.5.1 | Drag & drop widget KPI per comporre report mensili personalizzati | `components/ReportBuilder.tsx` (nuovo) |
| 4.5.2 | Salva/carica configurazione report come template | `components/ReportBuilder.tsx` |
| 4.5.3 | Genera PDF multipagina dal report personalizzato | `utils/report-generator.ts` (nuovo) |

---

## FASE 5 — MOBILE (Settimana 10-12)

> **Obiettivo:** Esperienza mobile eccellente e pubblicazione sugli store.

### 5.1 — Miglioramenti PWA Attuale

| # | Azione | File coinvolti |
|---|--------|----------------|
| 5.1.1 | **Modalità "In Servizio"**: dopo timbratura interfaccia scura essenziale, risparmio batteria OLED | `components/DynamicAgentDashboard.tsx` |
| 5.1.2 | **Modalità Una Mano**: pulsanti principali in basso (thumb zone), gesture swipe tra viste | `components/agent/MobileNavBar.tsx` |
| 5.1.3 | **Widget Schermata Home**: notifica persistente turno in corso (Android) | Service Worker |
| 5.1.4 | **Vibrazione differenziata**: SOS pattern lungo, nuova notifica breve, allarme burst | `components/agent/FloatingSosButton.tsx`, `hooks/useGpsTracking.ts` |
| 5.1.5 | **Badge icona PWA**: contatore notifiche non lette sull'icona app | Service Worker |
| 5.1.6 | **Pull-to-refresh** su liste (turni, interventi, bacheca) | Componenti agent |

### 5.2 — Funzionalità Mobile Avanzate

| # | Azione | File coinvolti |
|---|--------|----------------|
| 5.2.1 | **OCR Lettura Targhe**: fotocamera → OCR targa → verifica copertura assicurativa | `components/agent/PlateScanner.tsx` (nuovo) |
| 5.2.2 | **Navigazione GPS verso intervento**: aprire mappa nativa con percorso | `components/agent/AgentInterventions.tsx` |
| 5.2.3 | **Registrazione Vocale → Testo**: dettare note intervento convertite in testo | `components/agent/VoiceNotes.tsx` (nuovo) |
| 5.2.4 | **Foto Allegato Intervento**: scattare foto con geotag, allegare a intervento | `components/agent/AgentInterventions.tsx` |
| 5.2.5 | **Firma su Schermo**: raccogliere firma digitale del cittadino sul dispositivo | `components/agent/SignaturePad.tsx` (nuovo) |

### 5.3 — Trusted Web Activity (Google Play Store)

| # | Azione |
|---|--------|
| 5.3.1 | Creare progetto Android minimo con TWA che wrappa la PWA |
| 5.3.2 | Configurare Digital Asset Links per verificare proprietà dominio (`.well-known/assetlinks.json`) |
| 5.3.3 | Pubblicare su Google Play Store (25$ one-time) |
| 5.3.4 | Aggiungere supporto notifiche push native via FCM |

### 5.4 — Wrapper iOS per App Store

| # | Azione |
|---|--------|
| 5.4.1 | Creare progetto Xcode minimo con WKWebView + PWA |
| 5.4.2 | Aggiungere supporto APNs per notifiche push native (via Capacitor o wrapper nativo) |
| 5.4.3 | Pubblicare su Apple App Store (99$/anno) |

### 5.5 — Piano Futuro App Nativa (2027)

| # | Azione |
|---|--------|
| 5.5.1 | Valutare Flutter per app nativa completa (unica codebase Android + iOS) |
| 5.5.2 | Funzionalità native: NFC lettura badge, Face ID / Touch ID login, widget nativi |
| 5.5.3 | Stesso backend API, app nativa come client aggiuntivo |

---

## FASE 6 — COMPLIANCE E DOCUMENTAZIONE PA (Settimana 13-14)

> **Obiettivo:** Documentazione necessaria per contratto con PA e go-live in produzione.

### 6.1 — Documentazione Legale

| # | Azione |
|---|--------|
| 6.1.1 | **DPA (Data Processing Agreement)** — Contratto responsabile trattamento dati conforme GDPR art.28 |
| 6.1.2 | **Registro Trattamenti Dati** (art.30 GDPR) — Consultabile nell'app (`/admin/compliance`) |
| 6.1.3 | **Template Nomina DPO** — PDF generabile automaticamente dal sistema |
| 6.1.4 | **Manuale Operativo** — Documentazione utente completa (admin + agente) con screenshot |
| 6.1.5 | **SLA Document** — Tempi di risposta e risoluzione per ogni severity |

### 6.2 — Certificazioni Tecniche

| # | Azione |
|---|--------|
| 6.2.1 | Penetration test con report firmato da professionista certificato OSCP/CEH |
| 6.2.2 | Vulnerability assessment OWASP Top 10 completo |
| 6.2.3 | Test di carico (JMeter o k6): sostenere 500 utenti simultanei |
| 6.2.4 | Disaster recovery plan con test di ripristino documentato |

### 6.3 — Infrastruttura

| # | Azione |
|---|--------|
| 6.3.1 | Backup database crittografato giornaliero con retention 30 giorni + snapshot mensili 1 anno |
| 6.3.2 | Test ripristino backup mensile automatizzato |
| 6.3.3 | Backup su regione geografica diversa dal DB principale (requisito continuità GDPR) |
| 6.3.4 | Infrastructure as Code (Terraform/Pulumi) per replicare ambiente in emergenza |

### 6.4 — SLA e Incident Response

| Severity | Descrizione | Tempo risposta | Tempo risoluzione |
|---|---|---|---|
| **Critical** | Sistema completamente down | 1 ora | 4 ore |
| **High** | Funzione core non disponibile | 4 ore | 24 ore |
| **Medium** | Funzione non critica degradata | 24 ore | 72 ore |
| **Low** | Bug minore, cosmetico | 48 ore | Release successiva |

**Obblighi GDPR breach:**
- Notifica al Garante entro **72 ore** dalla scoperta (art.33)
- Notifica agli interessati se rischio elevato (art.34)
- Template notifica breach pronto e approvato legalmente

---

## 📊 Riepilogo per Fasi

| Fase | Durata | Obiettivo | Criticità |
|---|---|---|---|
| 🔴 Fase 1 — Sicurezza Critica | 2 settimane | Lockout, hCaptcha, Backup Codes 2FA, MFA Log, Signed URL, Test Isolamento | ⚠ Critico |
| 🟠 Fase 2 — Sicurezza Avanzata | 2 settimane | Rate limit per-utente, Anomaly detection, Firma X.509, Timestamp, Dep Scan, OWASP ZAP | Alto |
| 🟡 Fase 3 — Funzionalità Org.ve | 3 settimane | Ferie annuali, Workflow 2 livelli, Reperibilità, Dashboard Comandante, Eventi, MonthlyReport | Alto |
| 🟢 Fase 4 — UI/UX Desktop | 2 settimane | Dark mode, Multi-monitor, Shortcut tastiera, Timeline, Report builder | Medio |
| 🔵 Fase 5 — Mobile | 3 settimane | PWA migliorata, TWA Play Store, OCR targhe, Foto/Firma, Voice notes | Medio |
| 🟣 Fase 6 — Compliance PA | 2 settimane | DPA, Registro GDPR, SLA, Pentest, Backup, Disaster Recovery | Alto |

**Totale stimato: 14 settimane (~3.5 mesi)** per prodotto completo, certificabile e vendibile.

---

## 🎯 Quick Wins (Prima Settimana)

Azioni ad alto impatto e basso sforzo da fare subito:

1. **Attivare lockout account** (1.1.1) — già ci sono i campi nel DB, va solo attivato in `auth.ts`
2. **Implementare backup codes 2FA** (1.3) — i campi esistono già nel modello User
3. **Aggiungere rate limiting per-utente** (2.1) — estensione del sistema Redis già attivo
4. **Portare MonthlyReport dalla v2** (3.6) — copia di 1 file + 1 pagina
5. **Aggiungere link Impostazioni nella sidebar** — modifica di 1 file

---

## Riferimenti Normativi

- **CAD** (Codice Amministrazione Digitale) — D.Lgs. 82/2005
- **GDPR** (Regolamento Generale Protezione Dati) — UE 2016/679
- **Linee guida AgID** — Sicurezza nel procurement ICT per PA
- **OWASP Top 10** — [https://owasp.org/Top10/](https://owasp.org/Top10/)
- **ISO/IEC 27001** — Standard internazionale sicurezza informazioni
- **NIS2 Directive** — Recepita in Italia con D.Lgs. 138/2024
- **Linee guida Garante Privacy** — Provvedimenti su dati biometrici, geolocalizzazione, videosorveglianza

---

*Documento generato il 16/05/2026 — aggiornare ad ogni major release del prodotto.*
