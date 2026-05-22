# CAPITOLATO TECNICO
## Fornitura in modalità SaaS di Piattaforma per la Gestione Operativa dei Comandi di Polizia Locale

**Denominazione del Servizio:** Sentinel Security Suite  
**Versione documento:** 1.0  
**Data:** 22 Maggio 2026  
**Classificazione:** Uso Pubblico  

---

## 1. PREMESSA E CONTESTO

### 1.1 Oggetto dell'Appalto

Il presente Capitolato Tecnico disciplina la fornitura, in modalità Software as a Service (SaaS), di una piattaforma integrata per la gestione operativa dei Comandi di Polizia Locale, denominata **Sentinel Security Suite**.

Il servizio comprende:
- Licenza d'uso della piattaforma in modalità cloud multi-tenant
- Installazione, configurazione e personalizzazione iniziale
- Formazione del personale (admin e agenti)
- Manutenzione correttiva, adeguativa ed evolutiva
- Assistenza e supporto tecnico per la durata contrattuale
- Migrazione dati da eventuali sistemi preesistenti

### 1.2 Riferimenti Normativi

| Normativa | Descrizione |
|-----------|-------------|
| D.Lgs. 82/2005 (CAD) | Codice dell'Amministrazione Digitale |
| Regolamento UE 2016/679 (GDPR) | Protezione dei dati personali |
| D.Lgs. 138/2024 (NIS2) | Sicurezza delle reti e dei sistemi informativi |
| Linee guida AgID | Sicurezza nel procurement ICT per la PA |
| D.Lgs. 33/2013 | Trasparenza e accesso civico |
| OWASP Top 10 2021 | Standard sicurezza applicazioni web |
| ISO/IEC 27001:2022 | Sistema di gestione della sicurezza delle informazioni |
| D.Lgs. 285/1992 (CDS) | Codice della Strada — Verbali e contravvenzioni |

### 1.3 Definizioni e Acronimi

| Termine | Definizione |
|---------|------------|
| **Tenant** | Istanza logica isolata per ogni Comando di PL |
| **Admin** | Comandante o responsabile con accesso completo |
| **Agente** | Operatore di Polizia Locale con accesso al profilo mobile |
| **OdS** | Ordine di Servizio giornaliero |
| **PWA** | Progressive Web App — applicazione web installabile |
| **TOTP** | Time-Based One-Time Password (autenticazione 2FA) |
| **SLA** | Service Level Agreement — livelli di servizio |

---

## 2. ARCHITETTURA DEL SISTEMA

### 2.1 Architettura Generale

La piattaforma è basata su architettura **3-tier** cloud-native:

```
┌─────────────────────────────────────────────────────────┐
│                   LIVELLO PRESENTAZIONE                  │
│  Progressive Web App (PWA) — Desktop e Mobile            │
│  Installabile su iOS/Android senza app store             │
├─────────────────────────────────────────────────────────┤
│                   LIVELLO APPLICATIVO                    │
│  Next.js 16 (App Router) — API RESTful                  │
│  Autenticazione NextAuth v5 — JWT con 2FA TOTP          │
│  Middleware RBAC — Rate Limiting distribuito             │
├─────────────────────────────────────────────────────────┤
│                    LIVELLO DATI                          │
│  PostgreSQL 15+ — ORM Prisma 6.x                        │
│  Crittografia AES-256-GCM — Soft-delete — Audit Trail  │
│  Multi-Tenant con isolamento logico per tenantId         │
├─────────────────────────────────────────────────────────┤
│                 SERVIZI ACCESSORI                        │
│  Redis (Rate Limiting) — Telegram Bot — Web Push        │
│  VAPID Keys — PEC (SMTP) — Cron Jobs                   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnologico

| Componente | Tecnologia | Versione | Licenza |
|-----------|-----------|----------|---------|
| Framework Full-Stack | Next.js (App Router) | 16.2 | MIT |
| UI Library | React | 19.x | MIT |
| Linguaggio | TypeScript | 5.x | Apache 2.0 |
| ORM | Prisma | 6.4 | Apache 2.0 |
| Database | PostgreSQL | 15+ | PostgreSQL License |
| Cache/Rate Limit | Upstash Redis | — | Servizio cloud |
| Autenticazione | NextAuth v5 | 5.x | ISC |
| PDF | jsPDF + jspdf-autotable | 4.x / 5.x | MIT |
| Mappe | Leaflet + OpenStreetMap | 1.9 | BSD-2 |
| Grafici | Recharts | 3.x | MIT |
| PWA | next-pwa | 10.x | MIT |
| CSS | Tailwind CSS | 4.x | MIT |
| Icone | Lucide React | — | ISC |

### 2.3 Multi-Tenancy

Il sistema implementa un'architettura **multi-tenant con isolamento logico**:
- Ogni Comando di PL opera come tenant indipendente
- I dati di un tenant non sono mai accessibili da un altro tenant
- Il middleware verifica la corrispondenza tra sessione utente e slug URL
- Ogni query al database include il filtro `tenantId`
- Test automatici E2E verificano l'isolamento ad ogni rilascio

### 2.4 Requisiti Infrastrutturali

| Requisito | Specifica |
|-----------|----------|
| Hosting | Cloud EU (requisito GDPR) — Vercel/AWS eu-west-1 |
| Database | PostgreSQL 15+ gestito (Supabase/Neon/RDS) |
| CDN | Distribuzione globale con edge caching |
| Backup | Giornaliero crittografato AES-256, retention 30 giorni |
| Disaster Recovery | Replica su regione geografica diversa |
| Uptime garantito | 99.5% (SLA, escl. manutenzione programmata) |

---

## 3. REQUISITI FUNZIONALI

### RF-01: Autenticazione e Sicurezza

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-01.1 | Login con tenant slug + matricola + password | Obbligatorio |
| RF-01.2 | Autenticazione a due fattori (TOTP) con Google Authenticator/Authy | Obbligatorio |
| RF-01.3 | 8 codici di backup monouso per recupero accesso 2FA | Obbligatorio |
| RF-01.4 | Lockout progressivo: 5 tentativi→15min, 10→24h, 20→permanente | Obbligatorio |
| RF-01.5 | CAPTCHA (hCaptcha) dopo 3 tentativi falliti | Obbligatorio |
| RF-01.6 | Cambio password obbligatorio al primo accesso | Obbligatorio |
| RF-01.7 | MFA obbligatoria per ruoli Admin e SuperAdmin | Obbligatorio |
| RF-01.8 | RBAC con 3 ruoli (SuperAdmin, Admin, Agente) e 4 permessi granulari | Obbligatorio |
| RF-01.9 | IP attendibili per bypass 2FA in sede | Opzionale |

### RF-02: Pianificazione Turni

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-02.1 | Griglia interattiva N agenti × 31 giorni con codici turno color-coded | Obbligatorio |
| RF-02.2 | Multi-select celle (Shift+Click) per assegnazione bulk | Obbligatorio |
| RF-02.3 | Generatore automatico turni basato su pattern ciclici configurabili | Obbligatorio |
| RF-02.4 | Undo/Redo delle modifiche ai turni | Obbligatorio |
| RF-02.5 | Copia turni da mese precedente | Obbligatorio |
| RF-02.6 | Import/export Excel dei turni | Obbligatorio |
| RF-02.7 | Validazione massimali (giornalieri, settimanali, mensili) | Obbligatorio |
| RF-02.8 | Pubblicazione e blocco del mese | Obbligatorio |
| RF-02.9 | Visualizzazione conflitti (doppio turno, massimale superato) | Obbligatorio |
| RF-02.10 | Legenda colori turni collassabile | Obbligatorio |

### RF-03: Ordine di Servizio (OdS)

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-03.1 | Drag & drop agenti nei servizi (Mattina/Pomeriggio) | Obbligatorio |
| RF-03.2 | Assegnazione veicolo, radio, arma per pattuglia | Obbligatorio |
| RF-03.3 | Generazione PDF professionale A4 con logo del Comune | Obbligatorio |
| RF-03.4 | Firma digitale con hash SHA-256 e QR Code di verifica | Obbligatorio |
| RF-03.5 | Pagina pubblica di verifica autenticità `/verify/:hash` | Obbligatorio |
| RF-03.6 | Watermark "BOZZA" su OdS non certificati | Obbligatorio |
| RF-03.7 | Template OdS riutilizzabili | Obbligatorio |
| RF-03.8 | Notifica automatica Telegram/push alla certificazione | Obbligatorio |
| RF-03.9 | Timestamp RFC 3161 opponibile a terzi | Opzionale |
| RF-03.10 | Stampa batch OdS settimanale (PDF multipagina) | Opzionale |

### RF-04: Presenze e Timbrature

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-04.1 | Clock-IN/OUT con coordinate GPS e accuratezza | Obbligatorio |
| RF-04.2 | Verifica raggio dalla sede (configurabile per tenant) | Obbligatorio |
| RF-04.3 | Timbratura NFC con tag programmabile | Obbligatorio |
| RF-04.4 | Rilevazione automatica straordinario/ritardo | Obbligatorio |
| RF-04.5 | Causale per straordinario (ordinario, elettorale, ordine pubblico) | Obbligatorio |
| RF-04.6 | Cartellino presenze mensile per agente | Obbligatorio |
| RF-04.7 | Export paghe per ragioneria (CSV/Excel) con buoni pasto | Obbligatorio |

### RF-05: Sicurezza Agenti e Centrale Operativa

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-05.1 | Pulsante SOS con attivazione long-press (2.5s) | Obbligatorio |
| RF-05.2 | Invio coordinate GPS + broadcast a centrale e ufficiali | Obbligatorio |
| RF-05.3 | Mappa in tempo reale con posizione pattuglie | Obbligatorio |
| RF-05.4 | Aggiornamento posizioni ogni 30 secondi (5s durante SOS) | Obbligatorio |
| RF-05.5 | Geofencing con zone configurabili e alert | Opzionale |
| RF-05.6 | Gestione interventi con ciclo di vita completo | Obbligatorio |

### RF-06: Gestione Ferie e Assenze

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-06.1 | Richiesta assenze multi-causale (ferie, malattia, L.104, studio) | Obbligatorio |
| RF-06.2 | Workflow approvativo a 2 livelli (Ufficiale → Admin) | Obbligatorio |
| RF-06.3 | Auto-escalation dopo 48h | Obbligatorio |
| RF-06.4 | Pianificazione ferie annuale per periodi (Estate, Inverno, Pasqua, Natale) | Obbligatorio |
| RF-06.5 | Rotazione ferie automatica pluriennale | Obbligatorio |
| RF-06.6 | Scambio ferie tra colleghi con approvazione admin | Obbligatorio |
| RF-06.7 | Saldi personali (ferie, permessi, L.104, 150h studio) | Obbligatorio |

### RF-07: Dashboard e Reportistica

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-07.1 | Dashboard Comandante con KPI strategici in tempo reale | Obbligatorio |
| RF-07.2 | Report mensile con grafici (Recharts) e export Excel | Obbligatorio |
| RF-07.3 | Statistiche comparabili multi-mese (ultimi 12 mesi) | Obbligatorio |
| RF-07.4 | Alert automatici: scadenze documenti, tasso assenze anomalo | Obbligatorio |
| RF-07.5 | Export PDF report mensile per il Sindaco | Opzionale |

### RF-08: Risorse e Inventario

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-08.1 | Gestione parco veicoli (targa, scadenze assicurazione/bollo/revisione) | Obbligatorio |
| RF-08.2 | Gestione armeria (armi, matricole, assegnatari) | Obbligatorio |
| RF-08.3 | Gestione giubbotti antiproiettile (scadenza Kevlar) | Obbligatorio |
| RF-08.4 | Gestione radio (modello, seriale, assegnatario) | Obbligatorio |
| RF-08.5 | Gestione formazione (corsi obbligatori, scadenze abilitazioni) | Obbligatorio |
| RF-08.6 | Alert automatici scadenze (30, 7, 1 giorno) | Obbligatorio |

### RF-09: Verbali e Contravvenzioni (CDS)

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-09.1 | Compilazione verbale da dispositivo mobile (PWA) | Obbligatorio |
| RF-09.2 | Campi: targa, tipo infrazione, articolo CDS, importo, luogo GPS, note | Obbligatorio |
| RF-09.3 | Acquisizione foto con geotag automatico | Obbligatorio |
| RF-09.4 | Generazione PDF verbale conforme CDS con QR verifica | Obbligatorio |
| RF-09.5 | Dashboard admin: lista, filtri, statistiche infrazioni | Obbligatorio |
| RF-09.6 | Heatmap infrazioni per zona | Obbligatorio |
| RF-09.7 | Tracciamento stato verbale (emesso → notificato → pagato/contestato) | Obbligatorio |
| RF-09.8 | Export CSV/PDF verbali per ufficio contravvenzioni | Obbligatorio |

### RF-10: Comunicazioni

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-10.1 | Bacheca annunci con priorità e lettura obbligatoria | Obbligatorio |
| RF-10.2 | Bot Telegram con notifiche e comandi rapidi | Obbligatorio |
| RF-10.3 | Notifiche push browser (Web Push API + VAPID) | Obbligatorio |
| RF-10.4 | Notifiche PEC per comunicazioni ufficiali | Opzionale |
| RF-10.5 | Chat di pattuglia tra membri dello stesso servizio | Opzionale |

### RF-11: Compliance e GDPR

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-11.1 | Audit trail immutabile (20+ azioni tracciate) | Obbligatorio |
| RF-11.2 | Consensi tracciati (privacy, GPS, Telegram) per ogni utente | Obbligatorio |
| RF-11.3 | Diritto all'oblio con pseudonimizzazione (art.17 GDPR) | Obbligatorio |
| RF-11.4 | Data portability — export dati in JSON (art.20 GDPR) | Obbligatorio |
| RF-11.5 | Data retention configurabile con cancellazione automatica | Obbligatorio |
| RF-11.6 | Soft-delete su tutti i modelli critici | Obbligatorio |
| RF-11.7 | Generazione PDF documenti legali (DPA, Registro, SLA) | Obbligatorio |
| RF-11.8 | Registro trattamenti dati consultabile (art.30 GDPR) | Obbligatorio |

### RF-12: Mobile e PWA

| ID | Requisito | Priorità |
|----|----------|----------|
| RF-12.1 | Progressive Web App installabile su iOS e Android | Obbligatorio |
| RF-12.2 | Funzionamento offline con sincronizzazione dati | Obbligatorio |
| RF-12.3 | Calendario personale con sincronizzazione iCal | Obbligatorio |
| RF-12.4 | Interfaccia mobile-first ottimizzata per uso in strada | Obbligatorio |
| RF-12.5 | Vibrazione differenziata per tipo notifica (SOS, avviso) | Obbligatorio |

---

## 4. REQUISITI NON FUNZIONALI

### RNF-01: Sicurezza

| ID | Requisito | Specifica |
|----|----------|----------|
| RNF-01.1 | Crittografia dati sensibili | AES-256-GCM |
| RNF-01.2 | Hashing password | bcrypt con salt |
| RNF-01.3 | Comunicazioni | HTTPS/TLS 1.3 obbligatorio |
| RNF-01.4 | Content Security Policy | Restrittiva su tutte le risposte |
| RNF-01.5 | Security Headers | HSTS, X-Frame-Options DENY, X-Content-Type-Options |
| RNF-01.6 | Rate Limiting | Distribuito su Redis, 4 livelli di protezione |
| RNF-01.7 | Dependency scanning | Automatico in CI/CD (npm audit + Snyk) |
| RNF-01.8 | Penetration test | OWASP ZAP ad ogni deploy su staging |

### RNF-02: Performance

| ID | Requisito | Specifica |
|----|----------|----------|
| RNF-02.1 | Tempo di caricamento pagina | < 3 secondi |
| RNF-02.2 | Tempo di risposta API | < 500ms (p95) |
| RNF-02.3 | Utenti simultanei | Minimo 500 per tenant |
| RNF-02.4 | Build time | < 2 minuti |
| RNF-02.5 | Startup container | < 5 secondi |

### RNF-03: Affidabilità

| ID | Requisito | Specifica |
|----|----------|----------|
| RNF-03.1 | Uptime | 99.5% (esclusa manutenzione programmata) |
| RNF-03.2 | RPO (Recovery Point Objective) | ≤ 1 ora |
| RNF-03.3 | RTO (Recovery Time Objective) | ≤ 4 ore |
| RNF-03.4 | Backup | Giornaliero crittografato, 30 giorni + mensili 1 anno |
| RNF-03.5 | Test ripristino | Mensile, documentato |

### RNF-04: Accessibilità

| ID | Requisito | Specifica |
|----|----------|----------|
| RNF-04.1 | Conformità WCAG | Livello AA (2.1) |
| RNF-04.2 | Supporto screen reader | Attributi ARIA completi |
| RNF-04.3 | Alto contrasto | Modalità dark mode ottimizzata |
| RNF-04.4 | Navigazione tastiera | Completa senza mouse |

---

## 5. LIVELLI DI SERVIZIO (SLA)

### 5.1 Classificazione Severity

| Severity | Descrizione | Tempo Risposta | Tempo Risoluzione |
|----------|------------|----------------|-------------------|
| **CRITICAL** | Sistema completamente non disponibile | 1 ora | 4 ore |
| **HIGH** | Funzionalità core non disponibile (turni, OdS, SOS) | 4 ore | 24 ore |
| **MEDIUM** | Funzionalità non critica degradata | 24 ore | 72 ore |
| **LOW** | Bug minore, miglioramento cosmetico | 48 ore | Release successiva |

### 5.2 Obblighi in caso di Data Breach

In conformità agli articoli 33 e 34 del GDPR:
- Notifica al Garante entro **72 ore** dalla scoperta
- Notifica agli interessati se rischio elevato per i diritti e le libertà
- Template di notifica breach pronto e approvato

### 5.3 Manutenzione Programmata

- Finestra di manutenzione: Domenica 02:00-06:00 CET
- Preavviso minimo: 72 ore via email e notifica in-app
- Massimo 4 ore/mese di manutenzione programmata

---

## 6. FORMAZIONE E SUPPORTO

### 6.1 Piano di Formazione

| Sessione | Durata | Destinatari | Modalità |
|----------|--------|-------------|----------|
| Formazione Admin | 4 ore | Comandante, Vice, Responsabili | On-site o videoconferenza |
| Formazione Agenti | 2 ore | Tutto il personale operativo | Videoconferenza + video tutorial |
| Formazione SuperAdmin | 2 ore | Referente IT del Comune | Videoconferenza |

### 6.2 Documentazione

Il fornitore consegna:
- Manuale operativo completo (admin + agente)
- Video tutorial per le funzionalità principali
- FAQ interattive integrate nell'applicazione
- Release notes ad ogni aggiornamento

---

## 7. PIANO DI MIGRAZIONE E ONBOARDING

### 7.1 Fasi di Attivazione

| Fase | Durata | Attività |
|------|--------|----------|
| 1. Setup | 1 giorno | Creazione tenant, configurazione sede, logo, parametri |
| 2. Import | 2-3 giorni | Migrazione anagrafica personale, veicoli, armi, formazione |
| 3. Formazione | 2 giorni | Sessioni formative per admin e agenti |
| 4. Pilota | 2 settimane | Utilizzo in parallelo con sistema esistente |
| 5. Go-live | 1 giorno | Passaggio definitivo al nuovo sistema |

**Tempo totale stimato: 3 settimane** dall'ordine al go-live.

---

## 8. REFERENZE

### 8.1 Piloti Attivi

| Ente | Periodo | Agenti | Stato |
|------|---------|--------|-------|
| Comando PL Comune di Altamura (BA) | Aprile 2026 — in corso | 30+ | Attivo in produzione |

---

## 9. OFFERTA ECONOMICA (Schema)

| Voce | Descrizione | Importo |
|------|-------------|---------|
| Canone mensile SaaS | Licenza per comando fino a 50 agenti | Da definire |
| Setup e configurazione | Una tantum per attivazione | Da definire |
| Formazione | Sessioni iniziali (incluse nel setup) | Incluso |
| Manutenzione | Correttiva e adeguativa | Incluso nel canone |
| Evolutiva | Nuove funzionalità su richiesta | Su preventivo |

---

*Documento generato il 22/05/2026 — Sentinel Security Suite v1.0*  
*Da allegare come documentazione tecnica a bandi MePA, CONSIP e gare PA.*
