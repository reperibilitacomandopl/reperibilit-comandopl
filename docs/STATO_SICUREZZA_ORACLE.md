# Stato interventi sicurezza Oracle EU

> **Ultimo aggiornamento:** 25 Maggio 2026  
> **Produzione** (`gestionepolizialocale.it`): deploy `fd56151` (push iPhone, KPI pannello, OdS push). SEC-01 rotazione: ancora manuale.

---

## In sintesi

| Dove | Stato |
|------|--------|
| Codice in locale (questo repo) | Modifiche applicate, `npm run build` OK |
| Server Oracle | Allineato a `fd56151` (maggio 2026) |
| Documentazione operativa completa | [`SCALETTA_ORACLE_EU.md`](./SCALETTA_ORACLE_EU.md) |

---

## Cosa è stato fatto (solo in locale)

### SEC-02 — Password fuori dal repository
- [x] `docker-compose.yml`: `POSTGRES_PASSWORD` letta da `.env`, non più in chiaro nel file
- [x] App Docker in ascolto solo su `127.0.0.1:3000` (non esposta su tutte le interfacce)
- [x] Creato `.env.example` con elenco variabili

### SEC-03 — Endpoint debug disabilitati in produzione
- [x] `src/lib/dev-only.ts` — helper `blockInProduction()` → 404
- [x] `src/app/api/test-db/route.ts` — bloccato in produzione
- [x] `src/app/api/debug/test-auth/route.ts` — bloccato in produzione
- [x] `src/app/api/debug/test-notify/route.ts` — bloccato in produzione
- [x] `src/middleware.ts` — rimossi `/api/debug` e `/api/test-db` dalla whitelist pubblica

### SEC-04 — Rate limiting riattivato
- [x] `src/lib/rate-limit.ts` — rimosso bypass “sempre OK”
- [x] Se `UPSTASH_REDIS_REST_*` è configurato → usa Upstash
- [x] Altrimenti → limiter **in-memory** (adatto a VM singola Oracle)

### SEC-05 — Chiave Verbatel dedicata
- [x] `src/lib/integration-api-key.ts` — verifica `VERBATEL_API_KEY`
- [x] `src/app/api/admin/verbatel-sync/route.ts` — non usa più solo `AUTH_SECRET`
- [x] `src/app/api/admin/verbatel-export/route.ts` — idem
- [x] `src/scripts/admin/verbatel-injector.js` — commenti aggiornati (URL + placeholder chiave)
- [x] Migrazione: se `VERBATEL_API_KEY` **non** è nel `.env`, accetta ancora `AUTH_SECRET` (con warning in log)

### SEC-06 — Template crontab con CRON_SECRET
- [x] `scripts/crontab.txt` — tutti i job con header `Authorization: Bearer $CRON_SECRET`

### SEC-07 — hCaptcha obbligatorio in produzione
- [x] `src/auth.ts` — senza `HCAPTCHA_SECRET_KEY` in produzione il login con captcha fallisce

### Altro
- [x] `docker-compose.prod.yml` — compose consigliato per produzione (solo localhost:3000)
- [x] `.github/workflows/ci.yml` — corretto typo URL ZAP (`gestionepolizialocale.it`)
- [x] `src/__tests__/security-guards.test.ts` — 4 test su chiave Verbatel e guard produzione
- [x] `src/app/api/cron/clock-reminder/route.ts` — richiede sempre `CRON_SECRET` (come gli altri cron)

### Verifiche eseguite in locale
- [x] `npm run build` — successo
- [x] `npx vitest run src/__tests__/security-guards.test.ts` — 4/4 passati

---

## Cosa NON è stato fatto (richiede te / server)

### Deploy produzione
- [x] `git commit` + `git push` (commit `4c0e2da` mobile/performance)
- [x] SSH Oracle: `git pull` + `docker compose up -d --build portale-caserma`

### SEC-01 — Rotazione segreti (sul server, non in git)
- [x] Script audit: `scripts/sec-01-check-env.sh`
- [x] Guida: `docs/SEC-01_ROTazione_Segreti.md`
- [ ] Eseguire rotazione reale su `~/app/.env` (operazione manuale)
- [ ] Aggiornare script Verbatel con `VERBATEL_API_KEY` dedicata

### SEC-06 — Crontab reale sul server
- [x] Template `scripts/crontab.txt` con `CRON_SECRET`
- [x] Script verifica: `scripts/verify-cron.sh`
- [x] Installazione: `scripts/install-sentinel-cron.sh`
- [x] Setup unificato: `scripts/server-setup-ops.sh`

### INFRA — Backup automatico
- [x] Script `scripts/backup-db.sh`
- [x] Voce cron in `scripts/crontab.txt` (02:15 UTC)
- [x] Procedura restore: `docs/BACKUP_RESTORE.md`

### SEC-08 — CSP Nginx
- [x] `nginx_config.conf`: rimossa CSP permissiva (gestita da Next middleware)
- [x] Script deploy: `scripts/apply-nginx-config.sh`

### Documentazione legale / CI
- [x] Template DPA: `docs/DPA_TEMPLATE.md`
- [x] CI: `security-guards` + `tenant-filter` obbligatori
- [x] E2E isolamento tenant su push master (opzionale su PR)

### UX pianificazione admin
- [x] Toolbar sticky + griglia scrollabile (`AdminDashboard`)
- [x] Barra operativa collassabile su mobile (`AdminToolbar`)
- [x] Evidenziazione celle REP oltre massimale (bordo rosso)

### Push iPhone / PWA
- [x] `NotificationManager` su mobile + riconnessione dopo aggiornamento
- [x] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` iniettata al **build** Docker (`Dockerfile` + `docker-compose` build args)
- [x] Service worker semplificato per compatibilità iOS
- [ ] Ogni agente deve toccare **Riconnetti notifiche** una volta dopo il deploy

### Pannello Overview
- [x] KPI **Approvazioni pendenti** (assenze + scambi turno)

### Documentazione legale
- [x] Allineare `src/app/policy/page.tsx`, FAQ, README, BCP, capitolato (Oracle EU — no Vercel/Supabase)
- [ ] Aggiornare `docs/BUSINESS_CONTINUITY_PLAN.md` per architettura Oracle reale

### Scaletta completa (fasi successive)
Vedi checklist e fasi 2–6 in [`SCALETTA_ORACLE_EU.md`](./SCALETTA_ORACLE_EU.md).

---

## File modificati o creati (riferimento git)

```
Creati:
  .env.example
  docker-compose.prod.yml
  docs/STATO_SICUREZZA_ORACLE.md          ← questo file
  src/lib/dev-only.ts
  src/lib/integration-api-key.ts
  src/__tests__/security-guards.test.ts

Modificati:
  docker-compose.yml
  scripts/crontab.txt
  src/middleware.ts
  src/auth.ts
  src/lib/rate-limit.ts
  src/app/api/test-db/route.ts
  src/app/api/debug/test-auth/route.ts
  src/app/api/debug/test-notify/route.ts
  src/app/api/admin/verbatel-sync/route.ts
  src/app/api/admin/verbatel-export/route.ts
  src/app/api/cron/clock-reminder/route.ts
  src/scripts/admin/verbatel-injector.js
  .github/workflows/ci.yml
  docs/SCALETTA_ORACLE_EU.md              (spunte su task completati in codice)
```

---

## Deploy rapido sul server Oracle

```bash
# 1. Backup DB
docker exec <nome_container_db> pg_dump -U postgres -Fc postgres > ~/backups/pre-$(date +%Y%m%d).dump

# 2. Aggiorna codice
cd ~/app
git pull origin master

# 3. .env — aggiungi almeno:
# VERBATEL_API_KEY=<chiave-dedicata>
# CRON_SECRET=<già-presente-o-nuovo>
# HCAPTCHA_SECRET_KEY=<obbligatorio-in-produzione>

# 4. Build e restart
docker compose -f docker-compose.prod.yml up -d --build
# oppure il compose che usi già, se equivalente

# 5. Health
curl -s http://127.0.0.1:3000/api/health

# 6. Sicurezza: debug spento
curl -s -o /dev/null -w "%{http_code}\n" https://gestionepolizialocale.it/api/test-db
# Atteso: 404

# 7. Cron
source ~/app/.env
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CRON_SECRET" \
  http://127.0.0.1:3000/api/cron/shift-reminder
# Atteso: 200
```

---

## Smoke test dopo deploy (5 minuti)

| # | Controllo | OK? |
|---|-----------|-----|
| 1 | Login admin | ☐ |
| 2 | Login agente | ☐ |
| 3 | Salva una cella in pianificazione | ☐ |
| 4 | Apri OdS giornata corrente | ☐ |
| 5 | `/api/health` → healthy | ☐ |
| 6 | `/api/test-db` → 404 | ☐ |
| 7 | Reminder cron (log o notifica entro 5 min se in fascia) | ☐ |

---

## Prossimo passo consigliato

1. **Commit** delle modifiche locali  
2. **Deploy** seguendo la sezione sopra  
3. Poi: **INFRA-01** (backup automatico) e **SEC-08** (Nginx CSP)

Per l’intero piano: [`SCALETTA_ORACLE_EU.md`](./SCALETTA_ORACLE_EU.md).
