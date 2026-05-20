# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev          # Avvia server Next.js in modalità sviluppo
npm run build        # Prisma generate + Next.js build (verifica sempre prima di committare)
npm start            # Avvia server produzione
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright in UI mode
npm run lint         # ESLint
```

**Prima di ogni commit:** `npm run build` deve passare. Il build fallisce = non committare.

**Deploy produzione:** Push su GitHub, poi SSH al server Oracle ed esegui:
```bash
ssh -i ssh-key-clean.key ubuntu@gestionepolizialocale.it
cd ~/app && git pull origin master && sudo docker compose up -d --build portale-caserma
```

**Sincronizzazione schema DB** (se modifichi `prisma/schema.prisma`):
```bash
# In locale
npx prisma db push

# Su server Oracle (dopo il deploy)
sudo docker exec app-portale-caserma-1 npx prisma@6.4.1 db push --skip-generate
```

**Attenzione:** Il server usa Prisma 6.4.1. NON eseguire `npx prisma` senza versione sul server — installerebbe Prisma 7.x che ha breaking changes.

---

## Struttura e Pattern

### Routing Multi-Tenant
Tutte le pagine vivono sotto `/[tenantSlug]/`. Lo slug nell'URL deve corrispondere al tenant della sessione JWT. Il middleware (`middleware.ts`) forza questa corrispondenza e reindirizza se non matcha. Ogni query Prisma DEVE includere `tenantId` per l'isolamento. La route `src/app/api/` è pubblica (non tenant-scoped).

### API Routes (131 endpoint)
- `api/auth/*` — NextAuth, 2FA setup/verify, cambio password
- `api/admin/*` — CRUD turni, utenti, OdS, veicoli, armeria, ferie, rotazioni, export, audit
- `api/agent/*` — Timbrature, bilanci, interventi, chat, SOS, rotazione ferie
- `api/cron/*` — Job schedulati (reminder, scadenze, retention, anomalie, escalation)
- `api/telegram/*` — Webhook bot, publish, link account
- `api/superadmin/*` — CRUD tenant, impersonation, export
- `api/user/*` — GDPR export/delete, consensi, bilanci
- `api/shifts/*` — Scambi turno, vacation swap
- `api/officer/*` — Approvazione ufficiale, duty team
- `api/requests/*` — Richieste assenze
- `api/notifications/*` — Push subscription e invio
- `api/storage` — Signed URL file serving
- `api/demo-request` — Form landing page (pubblico con rate limit)
- `api/weather` — Proxy meteo (autenticato)

### Autenticazione (`src/auth.ts`)
NextAuth v5 con Credentials provider. JWT session (maxAge 8h). 2FA TOTP con backup codes bcrypt-ati. Lockout progressivo (5→15min, 10→24h, 20→permanente). hCaptcha dopo 3 tentativi (client-gated, server-validated). HKDF per derivazione chiavi. La funzione `generate2FAProof()` firma lato server un token HMAC per prevenire bypass 2FA client-side.

### Middleware di Sicurezza (`src/middleware.ts`)
Protegge automaticamente tutte le route tranne whitelist pubbliche. Sequenza: rate limiting globale → auth check → MFA enforcement → tenant isolation → RBAC admin → security headers (CSP, HSTS, X-Frame-Options, etc.). Genera requestId UUID per ogni richiesta.

### Modelli Prisma (42 modelli)
I principali: Tenant, User, Shift, Absence, AgentRequest, AgentBalance, VacationPlan, VacationRotationGroup, VacationRotationPeriod, VacationSwapRequest, Intervention, ClockRecord, EmergencyAlert, CertifiedDocument, AuditLog, Notification, PushSubscription, Announcement, ChatMessage, Vehicle, Weapon, Armor, Radio, TrainingRecord, CustomHoliday, GlobalSettings, MonthStatus, PecSettings, School, PatrolTemplate, ShiftRule, GeofenceZone, UserDocument, DailyOdsNote, LocationHistory.

**Soft-delete** su 10 modelli (User, Shift, Absence, AgentRequest, CertifiedDocument, AuditLog, ClockRecord, AgentBalance, Announcement, Notification) gestito automaticamente dal client Prisma esteso in `src/lib/prisma.ts`.

### Librerie core (`src/lib/`)
- `prisma.ts` — Singleton client con estensione soft-delete + `findManyForTenant`
- `audit.ts` — 20 azioni tracciate con IP, user-agent, requestId
- `rate-limit.ts` — Rate limiting distribuito Upstash Redis (4 livelli) + anomaly detection
- `crypto.ts` — AES-256-GCM con HKDF per derivazione chiavi
- `telegram.ts` — Wrapper API Telegram (messaggi HTML, voce, broadcast emergenza, notifyAdmin)
- `push-notifications.ts` — Web Push VAPID con cleanup token scaduti
- `storage.ts` — Signed URL HMAC-SHA256 con protezione path traversal
- `timestamp.ts` — RFC 3161 timestamp via FreeTSA
- `certificate.ts` — Firma X.509, verifica, generazione self-signed
- `calendar-token.ts` — HMAC anti-IDOR per feed iCal
- `tenant.ts` — Helper filtro tenant per query Prisma
- `entitlements.ts` — Calcolo saldi L.104, studio, congedi
- `anomaly-detector.ts` — Alert consumo anomalo per tenant
- `verbatel-token.ts` — Token HMAC per sync Verbatel (sostituisce vecchio pattern indovinabile)

### Hooks principali
- `useAdminData.ts` — Stato centralizzato admin (shifts, users, operazioni CRUD, audit, verbatel)
- `useAgentData.tsx` — Stato centralizzato agente (clock, swaps, agenda, bilanci, Telegram, SOS)
- `useGpsTracking.ts` — Tracking GPS background con watchPosition
- `useServiceMode.ts` — Rilevazione stato "In Servizio" e pattern vibrazione
- `useKeyboardShortcuts.ts` — Shortcut tastiera globali (Ctrl+K, 1-9, ?)
- `useTheme.tsx` — Dark/Light mode con persistenza localStorage

### Anti-pattern da evitare
- **Mai** usare `$queryRawUnsafe` — sostituire con `prisma.shift.findFirst({ where: { tenantId, userId, date } })`
- **Mai** hardcodare password — usare `crypto.randomBytes(12).toString('hex')`
- **Mai** esporre `secret` TOTP nella risposta API — solo QR code
- **Mai** fidarsi di dati client per decisioni di sicurezza (es. `twoFactorVerified`)
- **Mai** rimuovere il controllo `tenantId` da una query Prisma — rompe l'isolamento multi-tenant
- **Mai** usare `prisma@7.x` — il progetto è bloccato a Prisma 6.4.1
- Non duplicare `getMidweekHolidays` — usare l'export da `src/utils/holidays.ts`
- Non duplicare `isAssenzaProtetta` — usare l'export da `src/utils/shift-logic.ts`

### Note sulle dipendenze
Il progetto è bloccato a Prisma 6.4.1 e Next.js 16.2. Aggiornamenti major vanno testati attentamente. Il server Oracle esegue `node:20-alpine` in Docker con TZ Europe/Rome.
