# 🛡️ Sentinel Security Suite

> **La Sala Operativa Digitale per la Polizia Locale** — Piattaforma SaaS cloud per la gestione completa dei Comandi di Polizia Locale italiani.

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://portale-polizia-locale.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?logo=prisma)](https://prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)

---

## 📋 Sommario

- [Panoramica](#-panoramica)
- [Architettura](#-architettura)
- [Funzionalità](#-funzionalità-principali)
- [Struttura del Progetto](#-struttura-del-progetto)
- [Setup Locale](#-setup-locale)
- [Variabili d'Ambiente](#-variabili-dambiente)
- [Deploy](#-deploy)
- [Ruoli e Permessi](#-ruoli-e-permessi)
- [API Endpoints](#-api-endpoints)
- [Sicurezza](#-sicurezza)

---

## 🏗️ Panoramica

Sentinel Security Suite è un portale SaaS **multi-tenant** progettato per digitalizzare completamente le operazioni di un Comando di Polizia Locale. Il sistema gestisce:

- **Pianificazione turni** mensile con generatore ciclico automatico
- **Ordini di Servizio (OdS)** con firma digitale SHA-256 e QR Code di verifica
- **Reperibilità** con sincronizzazione calendario (iCal) e notifiche Telegram
- **Timbrature geolocalizzate** (clock-in/out con verifica GPS)
- **SOS GPS** in tempo reale con allarme a tutta la centrale
- **Export paghe** personalizzabile per la Ragioneria comunale

L'applicazione è costruita come **Progressive Web App (PWA)** ed è installabile su iPhone e Android senza passare dagli store.

---

## 🧱 Architettura

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)              │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Landing  │  │  Admin   │  │  Agent Dashboard   │  │
│  │  Page    │  │Dashboard │  │  (PWA Mobile)      │  │
│  └─────────┘  └──────────┘  └────────────────────┘  │
├──────────────────────────────────────────────────────┤
│                   API ROUTES (Next.js)                │
│  /api/admin/*  /api/agent/*  /api/cron/*  /api/auth  │
├──────────────────────────────────────────────────────┤
│                 MIDDLEWARE (Auth + Security)          │
│  NextAuth.js · RBAC · CSP Headers · Rate Limiting    │
├──────────────────────────────────────────────────────┤
│                  DATABASE (PostgreSQL)                │
│  Prisma ORM · Multi-Tenant · Neon/Supabase           │
├──────────────────────────────────────────────────────┤
│               SERVIZI ESTERNI                        │
│  Telegram Bot · Web Push · Vercel Cron · VAPID Keys  │
└──────────────────────────────────────────────────────┘
```

### Stack Tecnologico

| Tecnologia | Versione | Utilizzo |
|-----------|---------|----------|
| **Next.js** | 16.2 | Framework full-stack con App Router |
| **React** | 19.x | UI Components |
| **TypeScript** | 5.x | Type Safety |
| **Prisma** | 6.4 | ORM e migrazioni database |
| **PostgreSQL** | 15+ | Database relazionale |
| **NextAuth.js** | 5.x | Autenticazione e sessioni |
| **jsPDF** | 2.x | Generazione PDF client-side |
| **Leaflet** | 1.9 | Mappe GPS in tempo reale |
| **Web Push** | - | Notifiche push browser |
| **Tailwind CSS** | 3.x | Styling utility-first |

---

## ✨ Funzionalità Principali

### 👮 Lato Admin (Comandante / Responsabile)

| Modulo | Descrizione |
|--------|-------------|
| **Pannello Overview** | Dashboard con KPI in tempo reale: copertura, assenze, ufficiali, autoparco |
| **Pianificazione Mensile** | Griglia interattiva 31 giorni × N agenti. Assegnazione turni, reperibilità, riposi |
| **Generatore Ciclico** | Auto-compilazione turni in base a pattern configurabili (cicli 7/14/28 giorni) |
| **Ordine di Servizio** | Drag & drop per assegnare agenti ai servizi giornalieri con veicoli e radio |
| **Stampa OdS** | Anteprima PDF professionale con firma digitale e QR Code di autenticità |
| **Centrale Operativa** | Mappa GPS live con posizione degli agenti in servizio |
| **Gestione Personale** | Anagrafica completa, qualifiche, scadenze documenti, L.104, permessi studio |
| **Export Paghe** | Generazione file Excel/CSV per la Ragioneria con calcolo automatico buoni pasto |
| **Bacheca Comando** | Pubblicazione OdS e comunicazioni visibili dagli agenti |
| **Auto-Scuole** | Assegnazione automatica servizi scolastici in base ai plessi configurati |

### 📱 Lato Agente (PWA Mobile)

| Modulo | Descrizione |
|--------|-------------|
| **I Miei Turni** | Calendario personale con vista mensile, griglia e annuale |
| **Timbratura GPS** | Clock-in/out geolocalizzato con validazione raggio |
| **SOS Emergenza** | Pulsante rosso con invio coordinate GPS alla Centrale |
| **Sincronizza Calendario** | Abbonamento iCal per iPhone/Google Calendar con promemoria automatici |
| **Richiesta Congedi** | Form per ferie, malattia, permessi L.104, studio |
| **Scambi Turno** | Bacheca per proporre/accettare scambi tra colleghi |
| **Agenda Personale** | Note private per ogni giorno del mese |
| **Notifiche Push** | Avvisi in tempo reale per pubblicazioni, emergenze, variazioni |
| **Telegram** | Collegamento al bot per ricevere notifiche anche ad app chiusa |

### ⚡ Automazioni

- **Cron Daily Reminder** — Ogni mattina alle 08:00, notifica Telegram agli agenti in reperibilità
- **Cron Expiry Alerts** — Alert automatici per documenti in scadenza (patente, porto d'armi)
- **Cron Data Retention** — Pulizia automatica dati obsoleti secondo policy GDPR
- **Auto-Pubblicazione OdS** — Notifica automatica al personale quando l'OdS viene certificato

---

## 📁 Struttura del Progetto

```
src/
├── app/                          # Next.js App Router
│   ├── [tenantSlug]/             # Route multi-tenant dinamiche
│   │   ├── admin/                # Tutte le pagine admin
│   │   │   ├── pannello/         # Dashboard Overview
│   │   │   ├── pianificazione/   # Griglia turni mensile
│   │   │   ├── ods/              # Ordine di Servizio
│   │   │   ├── sala-operativa/   # Mappa GPS
│   │   │   ├── stampa-ods/       # Anteprima PDF OdS
│   │   │   ├── risorse/          # Gestione Personale
│   │   │   ├── impostazioni/     # Configurazione sistema
│   │   │   ├── buoni-pasto/      # Modulo buoni pasto
│   │   │   ├── export-paghe/     # Export Ragioneria
│   │   │   ├── audit-logs/       # Log attività
│   │   │   └── ...               # (radio, armeria, parco-auto, etc.)
│   │   └── page.tsx              # Landing agente/admin
│   ├── api/                      # API Routes
│   │   ├── admin/                # Endpoint amministrativi
│   │   ├── agent/                # Endpoint agente
│   │   ├── calendar/[userId]/    # Feed iCal pubblico
│   │   ├── cron/                 # Task schedulati
│   │   ├── notifications/        # Push & Telegram
│   │   └── ...
│   ├── login/                    # Pagina di login
│   └── superadmin/               # Gestione multi-tenant
│
├── components/                   # Componenti React
│   ├── admin/                    # Componenti admin-specifici
│   ├── agent/                    # Componenti agente-specifici
│   ├── ui/                       # Componenti UI riutilizzabili
│   ├── AdminDashboard.tsx        # Shell admin
│   ├── AgentDashboard.tsx        # Shell agente
│   ├── LandingPage.tsx           # Homepage pubblica
│   └── ...
│
├── hooks/                        # Custom React Hooks
│   ├── useAdminData.ts           # Stato admin centralizzato
│   ├── useAgentData.ts           # Stato agente centralizzato
│   └── useGpsTracking.ts         # Tracking GPS in background
│
├── lib/                          # Librerie e utility
│   ├── prisma.ts                 # Client Prisma singleton
│   ├── telegram.ts               # Wrapper API Telegram Bot
│   └── offline-sync.ts           # Sync offline PWA
│
├── utils/                        # Funzioni di utilità
│   ├── pdf-generator.ts          # Generazione PDF (jsPDF)
│   ├── holidays.ts               # Calendario festività italiane
│   ├── shift-logic.ts            # Logica turni e assenze
│   ├── agenda-codes.ts           # Codici assenza/turno
│   └── constants.ts              # Costanti e colori
│
├── middleware.ts                  # Auth + Security middleware
└── auth.ts                       # Configurazione NextAuth
```

---

## 🚀 Setup Locale

### Prerequisiti

- **Node.js** 18+ (LTS consigliato)
- **PostgreSQL** 15+ (o account Neon/Supabase)
- **npm** 9+

### Installazione

```bash
# 1. Clona il repository
git clone https://github.com/reperibilitacomandopl/reperibilit-comandopl.git
cd reperibilit-comandopl

# 2. Installa le dipendenze
npm install

# 3. Configura il file .env (vedi sezione successiva)
cp .env.example .env

# 4. Genera il client Prisma
npx prisma generate

# 5. Esegui le migrazioni del database
npx prisma db push

# 6. (Opzionale) Popola con dati di test
npx prisma db seed

# 7. Avvia in modalità sviluppo
npm run dev
```

L'app sarà disponibile su `http://localhost:3000`.

---

## 🔐 Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
# DATABASE
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# AUTH
AUTH_SECRET="una-chiave-segreta-molto-lunga-e-casuale"
NEXTAUTH_URL="http://localhost:3000"

# TELEGRAM BOT
TELEGRAM_BOT_TOKEN="123456:ABCdefGHIjklMNOpqrSTUvwxyz"

# PUSH NOTIFICATIONS (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BDxxxxxx..."
VAPID_PRIVATE_KEY="xxxxxxxx..."

# (Opzionale) Email PEC
SMTP_HOST="smtp.pec.provider.it"
SMTP_PORT=465
SMTP_USER="comando@pec.comune.it"
SMTP_PASS="password"
```

---

## 🌐 Deploy

### Vercel (Consigliato)

```bash
# Deploy in produzione
vercel --prod

# Le variabili d'ambiente devono essere configurate su Vercel Dashboard
```

### Build manuale

```bash
# Build di produzione
npm run build

# Avvia il server di produzione
npm start
```

---

## 👥 Ruoli e Permessi

Il sistema utilizza un modello RBAC (Role-Based Access Control) con permessi granulari:

| Ruolo | Descrizione | Permessi |
|-------|------------|----------|
| **ADMIN** | Comandante / Vice | Accesso completo a tutte le funzionalità |
| **AGENTE** | Agente operativo | Dashboard personale, richieste assenze, scambi |
| **SUPER_ADMIN** | Amministratore SaaS | Gestione multi-tenant, creazione nuovi comandi |

### Permessi Granulari (per ruoli intermedi)

| Permesso | Descrizione |
|----------|-------------|
| `canManageShifts` | Può modificare turni e OdS |
| `canManageUsers` | Può gestire anagrafica personale |
| `canVerifyClockIns` | Può validare le timbrature |
| `canConfigureSystem` | Può accedere alle impostazioni di sistema |

---

## 🔌 API Endpoints Principali

### Pubbliche (senza autenticazione)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/calendar/[userId]` | Feed iCal reperibilità |
| GET | `/api/cron/daily-reminder` | Cron promemoria mattutini |
| POST | `/api/telegram/webhook` | Webhook bot Telegram |

### Protette (autenticazione richiesta)
| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET/POST | `/api/admin/shifts` | CRUD turni mensili |
| GET/POST | `/api/admin/ods` | Gestione OdS giornaliero |
| POST | `/api/admin/alert-emergency` | Invio allarme SOS |
| GET/POST | `/api/agent/clockin` | Timbratura GPS |
| GET/POST | `/api/notifications` | Gestione notifiche |
| GET/POST | `/api/requests` | Richieste assenze |
| GET/POST | `/api/swaps` | Scambi turno |

---

## 🔒 Sicurezza

Il sistema implementa i seguenti standard di sicurezza:

- **Autenticazione**: NextAuth.js con hashing bcrypt delle password
- **2FA**: Supporto TOTP (Google Authenticator) opzionale per ogni utente
- **CSP**: Content Security Policy restrittiva su tutte le risposte
- **CORS**: Protezione cross-origin con whitelist
- **Middleware**: Protezione automatica di tutte le route non pubbliche
- **Firma digitale**: Hash SHA-256 su ogni OdS certificato con QR Code di verifica
- **GDPR**: Consenso privacy esplicito, data retention automatica, diritto all'oblio
- **Geolocalizzazione**: Consenso GPS esplicito prima dell'attivazione del tracking

---

## 📄 Licenza

Proprietà intellettuale riservata. Tutti i diritti sono riservati.

---

> **Sentinel Security Suite** — *La tecnologia al servizio della sicurezza pubblica.*  
> Sviluppato con ❤️ per la Polizia Locale italiana.
