# PRD: Sentinel Security Suite

## Piattaforma SaaS per la Gestione Operativa dei Comandi di Polizia Locale Italiani

**Versione:** 1.0
**Data:** 20 Maggio 2026
**Tipo:** Master PRD — Commerciale + Guida Sviluppo
**Target:** Pubbliche Amministrazioni italiane (Comandi PL, Comuni 5.000-250.000 abitanti)

---

## 1. Introduzione / Overview

Sentinel Security Suite è una piattaforma SaaS multi-tenant che digitalizza l'intera gestione operativa di un Comando di Polizia Locale. Sostituisce i registri cartacei, i fogli Excel condivisi e i sistemi legacy con un'unica applicazione web/PWA accessibile da qualsiasi dispositivo.

### Il problema che risolve

I Comandi PL italiani (oltre 8.000 in Italia) gestiscono turni, ordini di servizio, presenze, ferie e interventi con strumenti non integrati: registri cartacei, fogli Excel, email, gruppi WhatsApp. Questo causa:
- **Errori** nella pianificazione turni (doppi turni, massimali superati)
- **Inefficienza**: ore di lavoro amministrativo per compilare OdS, cartellini, report
- **Non conformità**: mancanza di audit trail, firma digitale, tracciabilità GDPR
- **Rischio operativo**: nessun sistema di SOS geolocalizzato per agenti in strada

### La soluzione

Una piattaforma cloud unificata che copre l'intero flusso operativo: pianificazione → assegnazione → presenza → intervento → rendicontazione → audit.

---

## 2. Goals

- **G1**: Sostituire 100% dei registri cartacei di un Comando PL entro 30 giorni dall'onboarding
- **G2**: Ridurre del 70% il tempo amministrativo per la gestione turni e OdS
- **G3**: Raggiungere la conformità CAD, GDPR e linee guida AgID per SaaS PA
- **G4**: Ottenere 3 comandi pilota attivi entro Q3 2026, 20 entro Q2 2027
- **G5**: Superare penetration test OWASP con zero vulnerabilità critiche
- **G6**: Ottenere qualificazione AgID per SaaS entro Q4 2026

---

## 3. User Stories

### 🏗️ Infrastruttura Multi-Tenant

**US-001: Onboarding rapido di un nuovo Comando**
As a SuperAdmin, I want to create a new tenant in under 5 minuti so that posso attivare rapidamente nuovi comandi pilota.
- [ ] Form creazione tenant con: nome, slug, coordinate GPS sede, logo, piano (TRIAL/ACTIVE)
- [ ] Seed automatico utente ADMIN con credenziali temporanee
- [ ] Wizard onboarding primo accesso (configurazione massimali, sezioni, default)
- [ ] Invio automatico link accesso via email/PEC
- [ ] Verify in browser

**US-002: Isolamento dati tra Comandi**
As a Sistema, I must garantire che i dati del Comune A non siano mai accessibili al Comune B.
- [ ] Middleware verifica slug URL corrisponde al tenant della sessione JWT
- [ ] Ogni query Prisma include `tenantId` filter
- [ ] Test E2E automatico: utente Comune A non vede dati Comune B
- [ ] Audit log traccia ogni tentativo di accesso cross-tenant

**US-003: Piani di abbonamento**
As a SuperAdmin, I want to gestire piani (TRIAL 30gg → ACTIVE → ENTERPRISE) so that il modello SaaS è scalabile.
- [ ] Trial automatico 30 giorni con limiti (max 20 agenti, 1 comando)
- [ ] Upgrade a ACTIVE con pagamento
- [ ] ENTERPRISE per comandi >100 agenti (custom features, SLA premium)
- [ ] Notifica scadenza trial a 7, 3, 1 giorno

### 🔐 Autenticazione e Sicurezza

**US-010: Login sicuro multi-fattore**
As an Agente, I want to accedere con matricola + password + 2FA so that il mio account è protetto da accessi non autorizzati.
- [ ] Login con tenantSlug + matricola + password
- [ ] 2FA TOTP (Google Authenticator / Authy) con backup codes
- [ ] Lockout progressivo: 5→15min, 10→24h, 20→permanente
- [ ] hCaptcha dopo 3 tentativi falliti
- [ ] Cambio password obbligatorio al primo accesso
- [ ] Verifica password attuale per cambio password
- [ ] Verify in browser

**US-011: RBAC granulare**
As an Admin, I want to assegnare permessi specifici so that posso delegare senza dare accesso completo.
- [ ] Ruoli: SUPER_ADMIN, ADMIN, AGENTE
- [ ] Permessi granulari: canManageShifts, canManageUsers, canVerifyClockIns, canConfigureSystem
- [ ] Ufficiale di turno con permessi temporanei per approvazione richieste
- [ ] Impersonation SuperAdmin per supporto

**US-012: Audit trail immutabile**
As a Revisore, I need tracciare ogni azione amministrativa so that il comando è conforme a CAD e GDPR.
- [ ] 20+ azioni tracciate: LOGIN, LOGIN_FAILED, CRUD turni/utenti, GDPR export/delete, etc.
- [ ] Ogni log include: userId, tenantId, IP, user-agent, requestId, timestamp
- [ ] Log immutabile (nessuna modifica o cancellazione possibile)
- [ ] Esportazione audit in CSV/PDF per ispezioni
- [ ] Retention configurabile (default 10 anni per PA)

### 📅 Pianificazione Turni

**US-020: Griglia turni mensile interattiva**
As an Admin, I want to visualizzare e modificare i turni di tutti gli agenti in una griglia mensile so that posso pianificare rapidamente.
- [ ] Griglia N agenti × 31 giorni con codici turno (M7, M8, P12, P14, P15, P16, R, RR, FERIE, etc.)
- [ ] Click su cella → popup selezione codice turno (select + pulsanti rapidi)
- [ ] Cell color-coded per tipo turno con legenda
- [ ] Sticky header con giorni e nomi agenti
- [ ] Multi-select celle (Shift+Click) per assegnazione bulk
- [ ] Undo/Redo modifiche
- [ ] Conflitti visivi: bordo rosso su celle con doppio turno o massimale superato
- [ ] Filtro per squadra/sezione
- [ ] Verify in browser

**US-021: Generatore automatico turni ciclico**
As an Admin, I want to generare automaticamente i turni del mese basati su pattern predefiniti so that risparmio ore di lavoro manuale.
- [ ] Pattern configurabili per gruppo di rotazione
- [ ] Generazione automatica rispettando massimali e riposi obbligatori
- [ ] AI Resolver per buchi turno
- [ ] Copia turni da mese precedente
- [ ] Import/esportazione Excel
- [ ] Pubblicazione mese (lock delle modifiche)
- [ ] Verify in browser

**US-022: Ordine di Servizio digitale con firma**
As an Admin, I want to generare l'OdS giornaliero in PDF con firma digitale SHA-256 e QR code so that è legalmente valido e verificabile.
- [ ] Drag & drop agenti nei servizi (Mattina/Pomeriggio)
- [ ] Assegnazione veicolo, radio, arma per pattuglia
- [ ] Stampa OdS con layout professionale (A4, logo comando, firma)
- [ ] Certificazione digitale con hash SHA-256
- [ ] QR code puntante a URL pubblico di verifica (`/verify/:hash`)
- [ ] Watermark "BOZZA" su mesi non pubblicati
- [ ] Invio automatico Telegram agli agenti del giorno
- [ ] Revoca certificazione con tracciamento
- [ ] Timestamp RFC 3161 (FreeTSA) per opponibilità a terzi
- [ ] Verify in browser

### 🛰️ Tracciamento e Interventi

**US-030: Timbratura GPS**
As an Agente, I want to timbrare entrata/uscita con GPS so that il comando ha tracciamento preciso delle presenze.
- [ ] Clock-IN / Clock-OUT con coordinate GPS
- [ ] Verifica raggio dalla sede (configurabile)
- [ ] Rilevazione automatica straordinario o uscita anticipata
- [ ] Causale per straordinario (ordinario, elettorale, ordine pubblico, etc.)
- [ ] Timbratura offline con sincronizzazione quando torna la connessione
- [ ] Verify in browser (mobile)

**US-031: SOS emergenza geolocalizzato**
As an Agente in pericolo, I want to attivare un SOS immediato so that la centrale operativa riceve la mia posizione in tempo reale.
- [ ] Pulsante SOS flottante con attivazione long-press 2.5s
- [ ] Invio coordinate GPS + nota vocale alla centrale
- [ ] Broadcast Telegram a tutti gli admin e ufficiali
- [ ] Mappa centrale operativa con marker SOS lampeggiante
- [ ] Notifica push a tutti i dispositivi del comando
- [ ] Registrazione nota vocale per descrizione emergenza
- [ ] Verify in browser (mobile)

**US-032: Centrale operativa GPS**
As an Ufficiale in centrale, I want to vedere su mappa tutti gli agenti in servizio so that posso coordinare gli interventi.
- [ ] Mappa Leaflet/OpenStreetMap con marker per ogni pattuglia
- [ ] Colore marker per tipo servizio (blu=ordinario, verde=scuole, rosso=emergenza)
- [ ] Popup con dettagli pattuglia (agenti, veicolo, contatto)
- [ ] Aggiornamento posizioni ogni 30 secondi
- [ ] Visualizzazione interventi attivi con priorità
- [ ] Zone di geofencing configurabili con alert uscita zona
- [ ] Integrazione meteo sulla mappa
- [ ] Polling adattivo: 5s con SOS, 30s normale
- [ ] Verify in browser

**US-033: Gestione interventi sul campo**
As an Agente, I want to registrare interventi dal mio dispositivo so that la centrale ha visibilità in tempo reale.
- [ ] Creazione intervento: tipo, priorità, indirizzo, descrizione
- [ ] Stati intervento: PENDING → DISPATCHED → ACCEPTED → ON_SITE → COMPLETED
- [ ] Outcome: POSITIVO, NEGATIVO, INFONDATO
- [ ] Foto allegato intervento con geotag
- [ ] Firma digitale del cittadino su schermo
- [ ] Note vocali per relazione intervento
- [ ] Storico interventi personale
- [ ] Verify in browser (mobile)

### 🏖️ Gestione Ferie e Assenze

**US-040: Richiesta assenze con workflow approvativo**
As an Agente, I want to inviare richieste di ferie/permesso so that il comando può approvarle o rifiutarle.
- [ ] Form richiesta: data inizio/fine, causale (ferie, malattia, L.104, congedo, studio)
- [ ] Validazione saldi disponibili (ferie, permessi, 104h, 150h studio)
- [ ] Workflow a 2 livelli: Agente → Ufficiale di turno → Admin
- [ ] Timeout 48h: auto-escalation se ufficiale non risponde
- [ ] Notifica Telegram/email a ogni passaggio
- [ ] Stato visibile nell'app (in attesa ufficiale / in attesa admin / approvata)
- [ ] Approvazione/rifiuto con motivazione
- [ ] Sincronizzazione automatica con griglia turni (blocco giorni)
- [ ] Verify in browser

**US-041: Pianificazione ferie annuale**
As an Admin, I want to assegnare i periodi di ferie annuali per stagione so that evito conflitti e garantisco copertura.
- [ ] 4 periodi: Estate, Inverno, Pasqua, Natale
- [ ] Agente può esprimere preferenza (PREFERENCE)
- [ ] Admin assegna (ASSIGNED) o conferma (CONFIRMED)
- [ ] Vista annuale con conflitti evidenziati
- [ ] Calcolo automatico giorni residui
- [ ] Sincronizzazione automatica turni: giorni ferie → tipo "FERIE" nella griglia
- [ ] Notifica push/Telegram all'agente su assegnazione
- [ ] Verify in browser

**US-042: Rotazione ferie automatica**
As an Admin, I want to configurare gruppi di rotazione ferie pluriennali so that gli agenti ruotano equamente nei periodi.
- [ ] Definizione periodi di rotazione (es. Estate 1-15 Giu, 16-30 Giu, etc.)
- [ ] Gruppi di rotazione con membri assegnati
- [ ] Calcolo automatico anno corrente basato su anno base + offset
- [ ] Pubblicazione rotazione: genera automaticamente i VacationPlan
- [ ] Simulatore "dove sarò tra N anni"
- [ ] Gestione festivi infrasettimanali con assegnazione personale dedicato
- [ ] Verify in browser

**US-043: Scambio ferie tra colleghi**
As an Agente, I want to proporre uno scambio del mio periodo di ferie con un collega so that possiamo accordarci per esigenze personali.
- [ ] Proposta scambio: seleziono mio periodo, seleziono collega, invio proposta
- [ ] Regola termine 1 mese prima dell'inizio ferie
- [ ] Il collega riceve notifica e può accettare/rifiutare
- [ ] Se accettato, notifica all'admin per visto finale
- [ ] Admin approva: scambio effettivo nei VacationPlan e turni Shift
- [ ] Bacheca scambi ferie visibile a tutti gli agenti
- [ ] Verify in browser

### 📊 Dashboard e Reportistica

**US-050: Dashboard del Comandante**
As a Comandante, I want to vedere una panoramica strategica del comando so that posso prendere decisioni informate.
- [ ] KPI: organico, copertura turni, tasso assenteismo, straordinari
- [ ] Interventi ultimi 30 giorni (totali, completati, media/giorno)
- [ ] Richieste pendenti di approvazione
- [ ] Scadenze documentali entro 30 giorni (patenti, porto d'armi)
- [ ] Pianificazione ferie annuale riepilogativa
- [ ] Alert automatici: alto tasso assenze, scadenze imminenti
- [ ] Export PDF report mensile per il Sindaco
- [ ] Verify in browser

**US-051: Report mensile con grafici**
As an Admin, I want to generare un report mensile dettagliato so that posso inviarlo all'ufficio personale.
- [ ] KPI cards: organico, ore lavorate, straordinario, tasso assenza
- [ ] Grafico a barre Recharts: top 10 agenti per ore lavorate
- [ ] Tabella dettaglio agenti con tutte le metriche (mattine, pomeriggi, ferie, malattia, etc.)
- [ ] Ordinamento per qualsiasi colonna
- [ ] Export Excel one-click
- [ ] Navigazione tra mesi
- [ ] Verify in browser

**US-052: Cartellino presenze digitale**
As an Admin, I want to visualizzare il cartellino mensile di ogni agente so that verifico presenze, straordinari e assenze.
- [ ] Vista giornaliera con turno assegnato, timbrature, giustificativi
- [ ] Calcolo automatico delta orario (straordinario/ritardo/uscita anticipata)
- [ ] Badge visivo per giorni certificati (OdS firmato)
- [ ] Gestione giustificativi post-certificazione (con lucchetto visivo)
- [ ] Export mensile per ragioneria
- [ ] Verify in browser

### 🚗 Risorse e Inventario

**US-060: Gestione parco auto**
As an Admin, I want to gestire il parco veicoli so che tengo traccia di scadenze e assegnazioni.
- [ ] CRUD veicoli: targa, modello, tipo
- [ ] Scadenze tracciate: assicurazione, bollo, revisione
- [ ] Alert 30 giorni prima della scadenza
- [ ] Assegnazione veicolo a turno/agente
- [ ] Storico assegnazioni
- [ ] Verify in browser

**US-061: Gestione armeria**
As an Admin, I want to gestire armi e giubbotti so che traccio dotazioni e scadenze.
- [ ] CRUD armi: modello, matricola, assegnatario
- [ ] CRUD giubbotti antiproiettile: modello, seriale, scadenza Kevlar
- [ ] CRUD radio: modello, seriale, assegnatario
- [ ] Alert scadenze Kevlar
- [ ] Assegnazione fissa o a turno
- [ ] Verify in browser

**US-062: Gestione formazione**
As an Admin, I want to tracciare i corsi di formazione degli agenti so che verifico abilitazioni e scadenze.
- [ ] CRUD corsi: nome, categoria, ente, data, scadenza
- [ ] Associazione agente-corso con stato (completato, in corso, scaduto)
- [ ] Alert scadenza abilitazioni
- [ ] Export elenco formazioni per agente
- [ ] Verify in browser

### 📱 Mobile e PWA

**US-070: Dashboard agente mobile-first**
As an Agente, I want to vedere il mio turno di oggi e le informazioni essenziali sul telefono so che posso lavorare senza PC.
- [ ] Widget servizio del giorno (orario, veicolo, colleghi, zona)
- [ ] Countdown prossimo turno
- [ ] Calendario personale (3 viste: calendario, griglia, annuale)
- [ ] Bacheca annunci del comando con tracking lettura
- [ ] Saldi personali (ferie, permessi, L.104, studio)
- [ ] Sincronizzazione iCal con calendario telefono
- [ ] Modalità "In Servizio": interfaccia scura essenziale dopo timbratura
- [ ] Verify in browser (mobile viewport)

**US-071: PWA installabile offline-ready**
As an Agente, I want to usare l'app anche senza connessione so che posso timbrare in zone senza segnale.
- [ ] Service Worker con cache dati (turni, OdS, agenda)
- [ ] Timbratura offline con sync automatico quando torna la rete
- [ ] Icona installabile su home screen (iOS + Android)
- [ ] Badge contatore notifiche non lette
- [ ] Vibrazione differenziata (SOS lungo, notifica breve, allarme burst)
- [ ] Pull-to-refresh sulle liste
- [ ] Verify in browser (mobile)

**US-072: Bot Telegram integrato**
As an Agente, I want to ricevere notifiche via Telegram so that sono sempre aggiornato anche senza aprire l'app.
- [ ] Collegamento account via codice 6 cifre (validità 15 min)
- [ ] Notifiche: turno assegnato, cambio turno, OdS pubblicato, richiesta approvata
- [ ] Promemoria quotidiano turno (8:00)
- [ ] Comando `/mieturni` per vedere i prossimi turni
- [ ] Comando `/saldi` per vedere saldi ferie/permessi
- [ ] Verify in browser

### 🛡️ Compliance e Documentazione

**US-080: Centro conformità PA**
As an Admin, I want to generare la documentazione legale obbligatoria so that il comando è conforme a GDPR e CAD.
- [ ] Generazione PDF DPA (Data Processing Agreement, art.28 GDPR)
- [ ] Generazione PDF Registro Trattamenti (art.30 GDPR)
- [ ] Generazione PDF Nomina DPO
- [ ] Generazione PDF SLA con livelli di servizio
- [ ] Dashboard scadenze documentali agenti (patenti, porto d'armi)
- [ ] Tracciamento consensi (privacy, GPS, Telegram) per ogni agente
- [ ] Verify in browser

**US-081: GDPR diritto all'oblio e portabilità**
As an Agente, I want to esercitare i miei diritti GDPR so that posso richiedere export o cancellazione dei miei dati.
- [ ] Export dati personali in formato JSON (art.20 GDPR)
- [ ] Pseudonimizzazione dati su richiesta (art.17 GDPR)
- [ ] Data retention automatica con cancellazione dopo periodo configurabile
- [ ] Soft-delete su 10 modelli (User, Shift, Absence, AgentRequest, etc.)
- [ ] Log immutabile di ogni operazione GDPR
- [ ] Verify in browser

### 🎨 Esperienza Utente

**US-090: Dark mode**
As an Operatore in centrale, I want to attivare la dark mode so che lavoro meglio in condizioni di scarsa illuminazione.
- [ ] Toggle Dark/Light nella sidebar
- [ ] Rispetto preferenza sistema (`prefers-color-scheme`)
- [ ] Persistenza scelta in localStorage
- [ ] Tema scuro ottimizzato per centrale operativa (sfondo scuro, testo ambra/verde)
- [ ] Tutte le pagine supportano dark mode
- [ ] Verify in browser

**US-091: Scorciatoie da tastiera**
As an Admin esperto, I want to usare shortcut da tastiera so that opero più velocemente.
- [ ] `Ctrl+K`: ricerca globale (agente, pagina, funzione)
- [ ] `1-9`: navigazione rapida tra le pagine principali
- [ ] `?`: overlay help con tutti gli shortcut
- [ ] Shortcut non attivi quando si scrive in input
- [ ] Verify in browser

---

## 4. Functional Requirements

### FR-1: Autenticazione e Autorizzazione
- FR-1.1: Login con tenantSlug + matricola + password + 2FA opzionale
- FR-1.2: JWT session con maxAge 8 ore (turno lavorativo)
- FR-1.3: Rate limiting login: 5 tentativi/min per coppia tenant+matricola
- FR-1.4: Lockout account progressivo a 3 livelli
- FR-1.5: hCaptcha dopo 3 tentativi falliti
- FR-1.6: RBAC con 3 ruoli + 4 permessi granulari
- FR-1.7: 2FA TOTP con 8 backup codes (bcrypt-ati, mostrati una volta sola)
- FR-1.8: Trusted IPs per bypass 2FA in sede
- FR-1.9: Cambio password richiede password attuale
- FR-1.10: Impersonation SuperAdmin con HMAC-SHA256

### FR-2: Multi-Tenant
- FR-2.1: Slug routing: ogni tenant ha il proprio URL (`/[tenantSlug]/admin/...`)
- FR-2.2: Isolamento dati: ogni query Prisma filtrata per tenantId
- FR-2.3: SuperAdmin può impersonare qualsiasi tenant
- FR-2.4: Trial 30 giorni, poi ACTIVE a pagamento
- FR-2.5: Rate limiting e anomaly detection per-tenant

### FR-3: Pianificazione Turni
- FR-3.1: Griglia turni mensile con editing click-to-edit
- FR-3.2: Generatore ciclico automatico basato su pattern di rotazione
- FR-3.3: Copia turni da mese precedente
- FR-3.4: Import/export Excel
- FR-3.5: Validazione massimali per agente (giornalieri, settimanali, mensili)
- FR-3.6: Pubblicazione/blocco mese
- FR-3.7: OdS giornaliero con PDF + firma digitale + QR code
- FR-3.8: Certificazione con hash SHA-256 e timestamp RFC 3161

### FR-4: Presenze e Timbrature
- FR-4.1: Clock-IN/OUT con coordinate GPS e accuratezza
- FR-4.2: Verifica raggio dalla sede
- FR-4.3: Rilevazione straordinario/ritardo/uscita anticipata
- FR-4.4: Giustificativi automatici per ritardo entrata
- FR-4.5: Cartellino mensile per agente

### FR-5: Interventi e Sicurezza Agenti
- FR-5.1: SOS geolocalizzato con long-press 2.5s
- FR-5.2: Mappa centrale operativa in tempo reale
- FR-5.3: Geofencing con zone configurabili
- FR-5.4: Gestione interventi con ciclo di vita completo
- FR-5.5: Notifiche push, Telegram e email per SOS e allerte

### FR-6: Ferie e Assenze
- FR-6.1: Richiesta assenze multi-causale con validazione saldi
- FR-6.2: Workflow approvativo a 2 livelli (Ufficiale → Admin)
- FR-6.3: Auto-escalation dopo 48h
- FR-6.4: Pianificazione ferie annuale per periodi
- FR-6.5: Rotazione ferie automatica pluriennale
- FR-6.6: Scambio ferie tra colleghi con approvazione admin
- FR-6.7: Sincronizzazione automatica con griglia turni

### FR-7: Dashboard e Report
- FR-7.1: Dashboard comandante con KPI strategici
- FR-7.2: Report mensile con grafici e export Excel
- FR-7.3: Cartellino presenze mensile per agente
- FR-7.4: Esportazione paghe per ragioneria

### FR-8: Risorse e Inventario
- FR-8.1: CRUD veicoli con scadenze (assicurazione, bollo, revisione)
- FR-8.2: CRUD armi con matricola e assegnatario
- FR-8.3: CRUD giubbotti antiproiettile con scadenza Kevlar
- FR-8.4: CRUD radio con modello e seriale
- FR-8.5: CRUD corsi formazione con scadenze abilitazioni
- FR-8.6: Alert automatici scadenze (7:00 ogni giorno)

### FR-9: Comunicazioni
- FR-9.1: Bacheca annunci con priorità e lettura obbligatoria
- FR-9.2: Chat di pattuglia tra membri stesso servizio
- FR-9.3: Bot Telegram per notifiche e comandi rapidi
- FR-9.4: Notifiche push browser (Web Push API + VAPID)
- FR-9.5: Notifiche email/PEC per comunicazioni ufficiali

### FR-10: GDPR e Compliance
- FR-10.1: Consensi tracciati (privacy, GPS, Telegram)
- FR-10.2: Diritto all'oblio (pseudonimizzazione)
- FR-10.3: Data portability (export JSON)
- FR-10.4: Data retention configurabile con cancellazione automatica
- FR-10.5: Soft-delete su 10 modelli
- FR-10.6: Audit trail immutabile con 20+ azioni tracciate
- FR-10.7: Generazione PDF documenti legali (DPA, Registro, DPO, SLA)

### FR-11: Sicurezza
- FR-11.1: Rate limiting distribuito (Upstash Redis) a 4 livelli
- FR-11.2: Anomaly detection con alert automatici
- FR-11.3: Content Security Policy restrittiva
- FR-11.4: Security headers su tutte le risposte (HSTS, X-Frame-Options, etc.)
- FR-11.5: Crittografia AES-256-GCM per dati sensibili (2FA secrets, PEC)
- FR-11.6: Signed URL per file storage con scadenza 15 minuti
- FR-11.7: Penetration test OWASP ZAP in CI/CD
- FR-11.8: Test E2E isolamento tenant automatici
- FR-11.9: Dipendenze vulnerability scanning automatico (npm audit + Snyk)

### FR-12: Mobile
- FR-12.1: PWA installabile (iOS + Android) con manifest
- FR-12.2: Service Worker per cache offline
- FR-12.3: Timbratura offline con sync
- FR-12.4: Modalità una mano (pulsanti in basso)
- FR-12.5: Vibrazione differenziata per tipo notifica

---

## 5. Roadmap — Moduli Futuri (FR-13 a FR-18)

I seguenti moduli sono pianificati per la Fase 2 e 3 del prodotto.

### FR-13: Modulo Verbali e Contravvenzioni (Q4 2026)
- FR-13.1: Compilazione verbale da mobile (Android/iOS)
- FR-13.2: Stampa termica Bluetooth portatile
- FR-13.3: Integrazione con sistema centrale MCTC (Ministero)
- FR-13.4: Statistiche contravvenzioni per zona/tipo/agente
- FR-13.5: Notifica pagamento e stato verbale

### FR-14: Modulo Permessi ZTL e Varchi (Q1 2027)
- FR-14.1: Gestione permessi ZTL temporanei e permanenti
- FR-14.2: Portale self-service cittadino per richiesta permesso
- FR-14.3: Verifica targa in tempo reale su strada
- FR-14.4: OCR lettura targhe da mobile

### FR-15: Portale del Cittadino (Q1 2027)
- FR-15.1: Richiesta online permessi ZTL
- FR-15.2: Consultazione stato verbali
- FR-15.3: Pagamento online contravvenzioni (PagoPA)
- FR-15.4: Segnalazione cittadino (buche, lampioni, rifiuti)
- FR-15.5: Autenticazione SPID/CIE

### FR-16: Integrazione SPID/CIE (Q2 2027)
- FR-16.1: Login agente con SPID (già predisposto)
- FR-16.2: Login cittadino con SPID/CIE per portale pubblico
- FR-16.3: Firma digitale documenti via SPID

### FR-17: Business Intelligence Avanzata (Q2 2027)
- FR-17.1: Dashboard predittiva (machine learning per turni)
- FR-17.2: Heatmap geografica incidenti e contravvenzioni
- FR-17.3: Report comparativi anno su anno
- FR-17.4: Alert predittivi su picchi di lavoro stagionali

### FR-18: App Native iOS/Android (Q3 2027)
- FR-18.1: App nativa React Native/Flutter
- FR-18.2: NFC lettura badge per timbratura
- FR-18.3: Face ID / Touch ID per login
- FR-18.4: Widget schermata home (turno oggi, prossimo servizio)
- FR-18.5: Pubblicazione su App Store e Google Play Store

---

## 6. Non-Goals (Out of Scope attuale)

- Gestione stipendi e buste paga (esiste export per ragioneria, ma non il calcolo)
- Contabilità e fatturazione del comando
- Gestione del personale civile (solo agenti PL)
- Integrazione con centrali operative 112/118 (fase futura)
- Riconoscimento facciale o biometria avanzata
- Videosorveglianza e controllo targhe in tempo reale via telecamere
- App nativa (fase PWA first, app nativa in roadmap Fase 3)

---

## 7. Design Considerations

### UI/UX
- **Design system**: Tailwind CSS 4 con palette professionale (slate/indigo)
- **Tema chiaro/scuro**: supporto completo dark mode con persistenza
- **Responsive**: mobile-first per agenti (PWA), desktop-ottimizzato per admin (griglie, mappe)
- **Accessibilità**: WCAG 2.1 AA, skip-to-content, alto contrasto, riduzione movimento
- **Glassmorphism**: effetto vetro per landing page e dashboard (opzionale)
- **Iconografia**: Lucide React (oltre 800 icone)

### Stack Tecnologico
| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| Frontend | Next.js (App Router) + React | 16.2 / 19.2 |
| Styling | Tailwind CSS | 4.x |
| Backend | Next.js API Routes | 16.2 |
| ORM | Prisma | 6.4.1 |
| Database | PostgreSQL 15 (Oracle Cloud EU) | 15+ |
| Cache/Rate Limit | Upstash Redis | - |
| Auth | NextAuth v5 (JWT) | 5.0-beta |
| 2FA | otplib + QR Code | 13.x / 1.5 |
| PDF | jsPDF + jspdf-autotable | 4.x / 5.x |
| Mappe | Leaflet + OpenStreetMap | 1.9 |
| Grafici | Recharts | 3.x |
| PWA | @ducanh2912/next-pwa | 10.x |
| Email | nodemailer | 6.x |
| Push | web-push (VAPID) | 3.x |
| Test | Vitest + Playwright | 4.x / latest |
| CI/CD | GitHub Actions | - |
| Deploy | Oracle Cloud EU + Docker + Nginx | - |

---

## 8. Technical Considerations

### Performance
- Edge runtime non supportato per auth (bcrypt, Prisma) — usare Node.js runtime
- Rate limiting distribuito su Redis per scalare orizzontalmente
- Polling adattivo: 5s con SOS, 15-30s normale, pausa su tab in background
- Lazy loading componenti pesanti (mappe, grafici)
- Caching Service Worker per PWA (turni, OdS)

### Sicurezza
- AUTH_SECRET unico per JWT + crittografia: da ruotare ogni 90 giorni
- CSP restrittiva con validator automatico in CI
- OWASP ZAP scan ad ogni deploy
- Penetration test professionale richiesto prima del go-live PA
- Hardcoded secrets già eliminati (password123, default-secret)

### GDPR
- Data retention configurabile per tenant (default 10 anni CAD)
- Soft-delete con hard-delete automatico dopo retention
- Pseudonimizzazione per diritto all'oblio
- Audit trail immutabile per ogni operazione GDPR

---

## 9. Success Metrics

### Prodotto
- **M1**: 0 vulnerabilità critiche al penetration test OWASP ZAP
- **M2**: Build time < 2 minuti, startup container < 5 secondi
- **M3**: 99.5% uptime (SLA Critical: risposta 1h, risoluzione 4h)
- **M4**: 100% test E2E isolamento tenant passati

### Onboarding
- **M5**: Nuovo comando attivo in < 30 minuti dal form di richiesta
- **M6**: Admin operativo dopo wizard onboarding di 10 minuti
- **M7**: 90% agenti installano PWA entro la prima settimana

### Business
- **M8**: 3 comandi pilota attivi entro Q3 2026
- **M9**: 20 comandi attivi entro Q2 2027
- **M10**: Tasso conversione TRIAL → ACTIVE > 60%

---

## 10. Roadmap Go-To-Market per Startup PA

### Fase Pre-Societaria (Maggio-Giugno 2026)
1. **Validazione tecnica**: penetration test OWASP, audit sicurezza, test carico
2. **PRD e documentazione**: questo documento come base per business plan
3. **Costituzione società**: SRL innovativa (agevolazioni per startup PA)
4. **Qualificazione AgID**: avvio procedura per SaaS qualificato PA
5. **Privacy legale**: DPA, registro trattamenti, nomina DPO

### Fase Pilota (Luglio-Settembre 2026)
6. **3 comandi pilota gratuiti** (Altamura già attivo + 2 da acquisire)
7. **Testimonianze e case study** dai piloti
8. **Account Manager dedicato** per onboarding e supporto
9. **Sito web commerciale** con pricing, demo, case study

### Fase Commerciale (Ottobre 2026+)
10. **Listino prezzi**: TRIAL gratuito 30gg, ACTIVE 199€/mese (fino a 50 agenti), ENTERPRISE custom
11. **Canali vendita**: fiere PA (FORUM PA, ANCI), LinkedIn, passaparola tra comandanti
12. **Referral program**: sconto 20% per ogni comando portato da un cliente esistente
13. **Certificazione AgID completa** per partecipare a bandi CONSIP/MePA

---

## 11. Open Questions

- **OQ1**: Qual è il prezzo corretto per il piano ACTIVE? (ricerca competitor: Civile, Sicurvia, TimePol)
- **OQ2**: Serve integrazione con il sistema MCTC per i verbali? Quali sono i costi?
- **OQ3**: Quanto costa un penetration test professionale certificato OSCP/CEH?
- **OQ4**: Quali sono i requisiti esatti AgID per la qualificazione SaaS? (in evoluzione con NIS2)
- **OQ5**: Il portale cittadino va sviluppato come modulo separato o come parte della stessa app?

---

## Appendice: Competitor e Differenziatori

| Feature | Sentinel | Civile | Sicurvia | TimePol |
|---------|----------|--------|----------|---------|
| OdS con firma digitale SHA-256 | ✅ | ❌ | ❌ | ❌ |
| Timestamp RFC 3161 | ✅ | ❌ | ❌ | ❌ |
| Rotazione ferie automatica pluriennale | ✅ | ❌ | ✅ limitato | ❌ |
| Workflow 2 livelli (uff.+admin) | ✅ | ✅ | ❌ | ✅ |
| SOS geolocalizzato con nota vocale | ✅ | ❌ | ✅ | ❌ |
| PWA offline-ready | ✅ | ❌ | ✅ | ❌ |
| Multi-tenant nativo | ✅ | ❌ | ✅ | ✅ |
| Audit trail GDPR | ✅ | ✅ | ✅ | ✅ |
| Dark mode | ✅ | ❌ | ❌ | ❌ |
| Open source parziale | ❌ | ❌ | ❌ | ❌ |

---

*Documento generato il 20/05/2026. Revisione 1.0.*
*Da aggiornare a ogni major release del prodotto.*
