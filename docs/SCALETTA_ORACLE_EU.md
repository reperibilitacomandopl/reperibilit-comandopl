# Scaletta operativa — Oracle EU → SaaS top (senza regressioni)

> **Obiettivo:** portare Sentinel Security Suite a livello vendibile PA + credibile per bandi UE,  
> mantenendo **100% delle funzionalità** già in produzione su `gestionepolizialocale.it`.

**Ultimo aggiornamento:** Maggio 2026  
**Ambiente target:** Oracle Cloud (regione EU) · Ubuntu · Nginx · Docker · PostgreSQL 15

---

## Regole d’oro (leggere prima di ogni task)

1. **Un task = una modifica logica** — non mescolare sicurezza + feature + refactor nello stesso deploy.
2. **Sempre prima del deploy:** `npm run build` in locale (obbligatorio per commit).
3. **Deploy produzione:** solo dopo build OK; su server: `git pull` → `docker compose up -d --build` (come in `CLAUDE.md`).
4. **Mai** `prisma migrate` distruttivo in produzione senza backup — usare `npx prisma db push` solo se lo schema cambia e hai fatto dump.
5. **Feature flag / guard produzione:** per route debug usare `if (process.env.NODE_ENV !== "production")` invece di cancellare subito (rollback facile).
6. **Test smoke post-deploy** (5 min, ogni volta):
   - Login admin + agente (`/login`)
   - Griglia turni: aprire un giorno, salvare una cella
   - OdS: aprire giornata corrente
   - Timbratura (o pagina clock) — solo lettura se non in servizio
   - `/api/health` → `200 healthy`
7. **Rollback:** tenere tag git `pre-task-XX` o commit atomici per `git revert` singolo.

---

## Legenda

| Campo | Significato |
|-------|-------------|
| **ID** | Codice task (es. `SEC-01`) |
| **P** | Priorità: P0 critico · P1 alto · P2 medio · P3 basso |
| **Rischio** | 🟢 basso · 🟡 medio · 🔴 alto |
| **Effort** | Stima: S (&lt;2h) · M (2–6h) · L (1–2 gg) · XL (3+ gg) |
| **Blocca** | Task che devono finire prima |
| **Verifica** | Come confermare che non hai rotto nulla |

---

# FASE 0 — Inventario e baseline (giorno 1)

> Nessuna modifica al codice. Solo foto dello stato attuale.

## TASK-00.1 — Snapshot produzione
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟢 |
| **Effort** | S |

**Azioni (SSH su Oracle):**
```bash
cd ~/app   # o path reale del progetto
git log -1 --oneline
docker ps
docker compose ps
ss -tlnp | grep -E '3000|5432|443|22'
curl -s http://127.0.0.1:3000/api/health | jq .
sudo crontab -l
```

**Salvare in un file privato (NON in git):**
- Versione commit deployata
- Elenco container e port binding
- Output health
- Crontab reale (confrontare con `scripts/crontab.txt`)

**Verifica:** documento baseline compilato.

---

## TASK-00.2 — Backup manuale “punto zero”
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟢 |
| **Effort** | S |
| **Blocca** | Tutte le fasi successive |

```bash
# Sul server, adatta user/db/host
docker exec app-db-1 pg_dump -U postgres -Fc postgres > ~/backups/pre-scaletta-$(date +%Y%m%d).dump
# oppure se DB è servizio separato:
pg_dump -h 127.0.0.1 -U postgres -Fc postgres > ~/backups/pre-scaletta-$(date +%Y%m%d).dump
```

**Verifica:** file dump &gt; 0 byte; annotare path e data.

---

## TASK-00.3 — Checklist smoke test manuale
| | |
|---|---|
| **P** | P0 |
| **Effort** | S |

Compilare tabella (OK/KO) per tenant pilota (es. Altamura):

| # | Flusso | URL / azione | Esito |
|---|--------|--------------|-------|
| 1 | Login admin | `/login` | |
| 2 | Pannello overview | `/{slug}/admin/pannello` | |
| 3 | Modifica turno | pianificazione → 1 cella | |
| 4 | OdS giornata | `/{slug}/admin/ods` | |
| 5 | Agente mobile | `/{slug}` vista agente | |
| 6 | Export paghe | admin export (solo download) | |
| 7 | iCal | link calendario agente (se usato) | |
| 8 | Telegram | messaggio test da bot (opz.) | |

**Questa tabella va ripetuta dopo OGNI deploy della Fase 1–2.**

---

# FASE 1 — Sicurezza emergenza (P0, settimana 1)

> Obiettivo: chiudere vulnerabilità **senza** cambiare UX per utenti normali.

---

## SEC-01 — Rotazione segreti (server, zero codice)
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟡 |
| **Effort** | M |
| **Blocca** | SEC-03, SEC-04 |

**Passi:**
1. Generare nuovi valori (openssl):
   ```bash
   openssl rand -base64 32   # AUTH_SECRET / NEXTAUTH_SECRET
   openssl rand -hex 32      # CRON_SECRET
   openssl rand -hex 32      # STORAGE_SIGNING_SECRET
   openssl rand -hex 24      # VERBATEL_API_KEY (nuovo, vedi SEC-05)
   ```
2. Aggiornare `.env` sul server (non committare).
3. Rotare password PostgreSQL se esposta in `docker-compose.yml` storico:
   ```sql
   ALTER USER postgres PASSWORD 'nuova-password-lunga';
   ```
   Aggiornare `DATABASE_URL` in `.env`.
4. `docker compose up -d --force-recreate portale-caserma` (e db se necessario).
5. **Tutti gli utenti:** dovranno rifare login (sessioni invalidate) — avvisare il Comando.

**Verifica:**
- Login admin e agente OK
- Cron con nuovo secret (dopo SEC-04)
- Verbatel: aggiornare chiave lato injector (dopo SEC-05)

**Rollback:** ripristinare `.env` precedente + recreate container.

---

## SEC-02 — Rimuovere password da repository ✅ (codice)
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟢 |
| **Effort** | S |
| **Blocca** | — |
| **Stato** | Completato in repo — **sul server**: ruotare `POSTGRES_PASSWORD` se era quella committata |

**File:** `docker-compose.yml`

**Modifica:**
- Sostituire `POSTGRES_PASSWORD: ...` con `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`
- Aggiungere `.env.example` (senza valori reali) con chiavi richieste.

**Non toccare:** `docker-compose_fixed.yml` se già usato in prod senza servizio `db` esposto.

**Verifica locale:** `npm run build`  
**Verifica prod:** compose up OK con `.env`

---

## SEC-03 — Disabilitare endpoint debug in produzione ✅
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟢 |
| **Effort** | S |
| **Stato** | Completato (`blockInProduction` + rimossi da whitelist middleware) |

**File coinvolti:**
- `src/middleware.ts` — rimuovere `/api/debug`, `/api/test-db` da `PUBLIC_PREFIXES`
- `src/app/api/test-db/route.ts`
- `src/app/api/debug/test-auth/route.ts`
- `src/app/api/debug/test-notify/route.ts`

**Pattern consigliato (non breaking in dev):**
```ts
// all'inizio di ogni route GET/POST
if (process.env.NODE_ENV === "production") {
  return NextResponse.json({ error: "Not Found" }, { status: 404 })
}
```

**Alternativa:** rimuovere whitelist in middleware **e** guard nelle route.

**Verifica:**
- `curl https://gestionepolizialocale.it/api/test-db` → 404 o 401
- In locale `NODE_ENV=development` → ancora raggiungibile se serve debug
- `npm run build`
- Smoke test TASK-00.3

---

## SEC-04 — Ripristinare rate limiting (Redis locale Oracle) ✅ (parziale)
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟡 |
| **Effort** | M |
| **Blocca** | — |
| **Stato** | Completato fallback in-memory + Upstash se configurato; opzionale Redis Docker su Oracle |

**Problema attuale:** `src/lib/rate-limit.ts` bypassa tutti i limiter.

**Passi:**

### 4a — Aggiungere Redis su Docker (stesso host, EU)
**File:** `docker-compose.yml` o compose di produzione sul server

```yaml
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
```

`.env`:
```
REDIS_URL=redis://127.0.0.1:6379
```

### 4b — Implementare limiter con `ioredis` o mantenere Upstash solo se region EU

**Opzione A (consigliata Oracle):** package `ioredis` + sliding window in `rate-limit.ts`  
**Opzione B:** Upstash con `UPSTASH_REDIS_REST_URL` in regione EU — rimuovere bypass dummy

**Regola:** se Redis non raggiungibile → **fail-open solo per GET**, **fail-closed per login e write** (più sicuro).

**File:** `src/lib/rate-limit.ts`, eventuale `package.json`

**Verifica:**
- Login: al 6° tentativo errato → blocco (già in auth) **e** rate limit IP
- 70 richieste write/min da stesso IP → 429
- Smoke: uso normale admin **non** deve vedere 429 in navigazione standard
- `npm run build`

**Rollback:** ripristinare `rate-limit.ts` precedente (git revert).

---

## SEC-05 — Chiave dedicata Verbatel (non AUTH_SECRET) ✅ (codice)
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟡 |
| **Effort** | S |
| **Stato** | Completato — **sul server**: aggiungere `VERBATEL_API_KEY` in `.env` e aggiornare script Verbatel |

**File:**
- `src/app/api/admin/verbatel-sync/route.ts` — rimuovere branch `providedKey === process.env.AUTH_SECRET`
- `src/scripts/admin/verbatel-injector.js` — usare `VERBATEL_API_KEY` o token HMAC già in `verbatel-token.ts`
- `.env.example` — documentare `VERBATEL_API_KEY`

**Mantenere:** auth session admin + `verifyVerbatelToken(tenantId, token)` come oggi.

**Verifica:**
- Sync Verbatel da pannello admin (se usato ad Altamura)
- Injector script con nuova chiave
- `npm run build`

---

## SEC-06 — Crontab produzione con CRON_SECRET ✅ (template)
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟢 |
| **Effort** | S |
| **Blocca** | SEC-01 |
| **Stato** | `scripts/crontab.txt` aggiornato — **sul server**: installare in crontab reale |

**File:** `scripts/crontab.txt` (documentazione) + `sudo crontab -e` sul server

**Template:**
```cron
CRON_SECRET=<valore-da-env>

*/5 * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/shift-reminder >/dev/null
*/15 * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/clock-reminder >/dev/null
0 8 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/daily-reminder >/dev/null
0 7 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/expiry-alerts >/dev/null
0 3 * * 0 curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/data-retention >/dev/null
0 6 * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/tenant-check >/dev/null
0 * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/anomaly-check >/dev/null
```

**Verifica:**
```bash
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" \
  http://127.0.0.1:3000/api/cron/shift-reminder
# Atteso: 200
```
- Controllare log container: notifiche reminder tornano operative
- **Non** rompe UI: solo job background

---

## SEC-07 — HCaptcha obbligatorio in produzione ✅
| | |
|---|---|
| **P** | P1 |
| **Rischio** | 🟢 |
| **Effort** | S |
| **Stato** | Completato in `auth.ts` |

**File:** `src/auth.ts`

Cambiare:
```ts
if (!HCAPTCHA_SECRET) return true
```
in:
```ts
if (!HCAPTCHA_SECRET) {
  if (process.env.NODE_ENV === "production") return false
  return true // solo dev
}
```

**Verifica:** login in prod con captcha configurato; build OK.

---

## SEC-08 — Allineare CSP Nginx con app
| | |
|---|---|
| **P** | P1 |
| **Rischio** | 🟡 |
| **Effort** | M |

**File:** `nginx_config.conf`

**Problema:** CSP Nginx permissiva (`http: https: unsafe-eval`) vanifica middleware.

**Passi:**
1. Rimuovere header `Content-Security-Policy` da Nginx (lasciare che risponda Next/middleware).
2. Oppure copiare CSP da `src/middleware.ts` → `add_header` identico.
3. `sudo nginx -t && sudo systemctl reload nginx`

**Verifica:**
- Mappa sala operativa (Leaflet)
- Login + hCaptcha
- PDF / stampa OdS
- Console browser: zero errori CSP bloccanti

---

## SEC-09 — MFA admin: non auto-trust IP silenzioso
| | |
|---|---|
| **P** | P1 |
| **Rischio** | 🟡 |
| **Effort** | M |

**File:** `src/middleware.ts` (blocco righe 139–147)

**Comportamento attuale:** admin senza 2FA → IP aggiunto a `trustedIps` automaticamente.

**Comportamento target (senza rompere chi ha già 2FA):**
- Rimuovere auto-aggiunta IP
- Redirect esplicito a `/{slug}/admin/sicurezza` con banner “Configura 2FA entro X giorni”
- Opzione: grace period 30 gg solo per tenant esistenti (env `MFA_GRACE_DAYS=30`)

**Verifica:**
- Admin con 2FA già attivo → nessun cambiamento
- Admin senza 2FA → vede pagina sicurezza, **ma** API già protette da RBAC
- Smoke login

---

# FASE 2 — Affidabilità Oracle EU (settimana 2)

---

## INFRA-01 — Script backup PostgreSQL → OCI Object Storage
| | |
|---|---|
| **P** | P0 |
| **Rischio** | 🟢 |
| **Effort** | M |

**Nuovo file:** `scripts/backup-db.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
DUMP="/tmp/sentinel-$STAMP.dump"
docker exec <container_db> pg_dump -U postgres -Fc postgres > "$DUMP"
# oci os object put --bucket sentinel-backups-eu --file "$DUMP"
gzip -f "$DUMP"
# retention: cancellare backup > 30 giorni
```

**Cron server:** `0 2 * * * /home/ubuntu/app/scripts/backup-db.sh`

**Verifica:** restore su DB di test (INFRA-02).

---

## INFRA-02 — Test ripristino documentato
| | |
|---|---|
| **P** | P1 |
| **Rischio** | 🟡 |
| **Effort** | M |
| **Blocca** | INFRA-01 |

1. Creare DB temporaneo `postgres_restore_test`
2. `pg_restore -d postgres_restore_test backup.dump`
3. Contare `User`, `Shift` — confrontare con prod
4. Screenshot + data in `docs/BACKUP_TEST_LOG.md` (privato, opz.)

**Non toccare** DB produzione durante test.

---

## INFRA-03 — Compose produzione “sicuro”
| | |
|---|---|
| **P** | P1 |
| **Rischio** | 🟡 |
| **Effort** | S |

**Obiettivo:** un solo file canonico `docker-compose.prod.yml`:

| Servizio | Porta |
|----------|-------|
| `portale-caserma` | `127.0.0.1:3000:3000` |
| `db` | `127.0.0.1:5432:5432` |
| `redis` | `127.0.0.1:6379:6379` |

**Verifica:** `ss -tlnp` — nessuna porta 3000/5432 su `0.0.0.0`.

---

## INFRA-04 — Monitoring e alert
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟢 |
| **Effort** | M |

**Minimo:**
- UptimeRobot / Better Stack → GET `https://gestionepolizialocale.it/api/health` ogni 5 min
- Script locale `scripts/check-disk.sh` + cron → Telegram admin se disco &gt; 85%

**Verifica:** alert di test ricevuto.

---

## INFRA-05 — fail2ban SSH + Nginx
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟡 |
| **Effort** | S |

**Non tocca l’app.** Configurare jail `sshd` e opzionale `nginx-limit-req`.

**Verifica:** login SSH da IP abituale OK.

---

# FASE 3 — Documentazione e compliance (settimana 3)

> Solo testi e PDF — **zero rischio** per funzionalità se non si cambiano logiche legali in codice.

---

## DOC-01 — Allineare privacy policy al stack Oracle EU ✅
| | |
|---|---|
| **P** | P1 |
| **Effort** | M |
| **Stato** | Completato — policy, FAQ, README, BCP, capitolato, landing, compliance PDF |

**File:**
- `src/app/policy/page.tsx`
- `src/app/faq/page.tsx`
- `docs/BUSINESS_CONTINUITY_PLAN.md`
- `README.md` (sezione deploy)

**Sostituire:** Supabase/Vercel → **Oracle Cloud Infrastructure (regione EU, es. Milan/Frankfurt)**

**Sub-responsabili tabella aggiornata:**

| Sub-responsabile | Ruolo | Ubicazione |
|------------------|-------|------------|
| Oracle OCI | Hosting VM + DB | UE |
| Upstash *se usato* | Rate limit | UE (specificare region) |
| Telegram | Notifiche | Extra-UE + SCC |
| hCaptcha | Anti-bot login | Extra-UE + SCC |
| Let's Encrypt | TLS | — |

**Verifica:** lettura coerente; link pagine `/policy` `/faq` OK.

---

## DOC-02 — BCP versione Oracle (realistico)
| | |
|---|---|
| **P** | P1 |
| **Effort** | M |

**File:** `docs/BUSINESS_CONTINUITY_PLAN.md`

**RTO/RPO onesti (1 VM):**
- RPO: 24h (backup giornaliero) o 1h se WAL abilitato in futuro
- RTO: 4–8h (restore manuale + DNS)

**Rimuovere:** riferimenti a “serverless edge”, “failover automatico DB” se non implementati.

---

## DOC-03 — Registro trattamenti + DPA pilota
| | |
|---|---|
| **P** | P1 |
| **Effort** | L |

**Azioni organizzative (non codice):**
1. Generare DPA da `/{slug}/admin/compliance` per Comune pilota
2. Firmare con responsabile trattamento
3. Archiviare DPIA (pagina `/faq`) firmata

**Verifica:** PDF in archivio Comando + copia fornitore.

---

## DOC-04 — Aggiornare `.env.example`
| | |
|---|---|
| **P** | P2 |
| **Effort** | S |

Elenco completo variabili con descrizione (senza valori):

`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET`, `REDIS_URL`, `UPSTASH_*`, `TELEGRAM_*`, `VAPID_*`, `HCAPTCHA_*`, `STORAGE_PATH`, `STORAGE_SIGNING_SECRET`, `VERBATEL_API_KEY`, `OCI_*` (backup)

---

# FASE 4 — CI/CD e qualità (settimana 3–4)

---

## CI-01 — Pipeline che blocca su errori critici
| | |
|---|---|
| **P** | P1 |
| **Rischio** | 🟢 |
| **Effort** | S |

**File:** `.github/workflows/ci.yml`

| Step | Prima | Dopo |
|------|-------|------|
| `npm audit` | continue-on-error | **fail** su high/critical (o warn iniziale 2 settimane) |
| `npm test` | continue-on-error | **fail** |
| e2e tenant isolation | continue-on-error | **fail** su PR verso master |
| OWASP ZAP | continue-on-error | warn + report artifact; fail solo su High |

**Correggere typo URL ZAP:** `gestionepolizialocale.it`

**Verifica:** PR di prova → pipeline rossa se test rotto.

---

## CI-02 — Test unitari rate-limit e auth guard
| | |
|---|---|
| **P** | P2 |
| **Effort** | M |

**Nuovi test Vitest:**
- `rate-limit.test.ts` — con Redis mock o container test
- Route debug ritorna 404 in `NODE_ENV=production`

**Non modificare** test holidays/shift-logic esistenti.

---

## CI-03 — Pentest leggero documentato
| | |
|---|---|
| **P** | P1 |
| **Effort** | L (esterno) |

Ordinare vulnerability assessment (anche freelance OSCP) su staging o prod con scope definito.

**Output:** report PDF da allegare a gare — **non richiede modifiche codice** se findings già chiusi in Fase 1.

---

# FASE 5 — Interoperabilità e bandi UE (settimana 5–8)

> Feature additive — non modificare flussi esistenti.

---

## API-01 — OpenAPI 3.0 read-only
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟢 |
| **Effort** | L |

**Nuovi file:**
- `docs/openapi.yaml` — subset: shifts read, export paghe, health
- `src/app/api/openapi/route.ts` — serve YAML
- Estendere `ApiDocsPanel.tsx` con link Swagger UI statico

**Non cambiare** signature API esistenti.

---

## API-02 — API key per tenant (server-to-server)
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟡 |
| **Effort** | L |

**Schema Prisma (additivo):**
```prisma
model TenantApiKey {
  id        String   @id @default(uuid())
  tenantId  String
  name      String
  keyHash   String   // bcrypt hash, mai plain
  scopes    String[] // es. ["read:shifts"]
  expiresAt DateTime?
  createdAt DateTime @default(now())
  tenant    Tenant   @relation(...)
}
```

**Middleware:** accettare `x-api-key` **solo** su route `/api/v1/*` nuove — le vecchie `/api/admin/*` restano session-based.

**Verifica:** vecchie integrazioni Verbatel/sessione immutate.

---

## EU-01 — Documentazione tecnica inglese (12 pagine)
| | |
|---|---|
| **P** | P2 |
| **Effort** | L |

**File:** `docs/TECHNICAL_OVERVIEW_EN.md`

Contenuti: architecture Oracle EU, security controls, GDPR, KPI pilota, TRL 7–8, roadmap.

---

## EU-02 — KPI impatto pilota Altamura
| | |
|---|---|
| **P** | P2 |
| **Effort** | M |

Misurare **prima/dopo** (questionario + log audit):

| KPI | Come misurare |
|-----|----------------|
| Ore/settimana compilazione turni | Intervista comandante |
| Errori doppio turno / mese | Query `Shift` conflitti |
| Tempo emissione OdS | `AuditLog` certify |
| Adozione PWA agenti | % utenti con `PushSubscription` |

---

# FASE 6 — Miglioramenti prodotto (solo se Fase 1–4 OK)

> Da `docs/AUDIT_MIGLIORAMENTI.md` e `docs/SCALETTA_OPERATIVA.md` — **rischio medio/alto**, un pezzo alla volta.

---

## UX-01 — Toolbar pianificazione (già fatto?)
| | |
|---|---|
| **P** | P2 |
| **Verifica prima** | Se già deployato, segnare ✅ e saltare |

**File:** `AdminShiftGrid.tsx` — dropdown Export/Strumenti/Gestione.

**Smoke:** ogni voce menu ancora raggiungibile.

---

## UX-02 — Conflitti visivi in griglia
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟡 |
| **Effort** | M |

**Solo CSS/logica visual** — non cambiare salvataggio turni.

**File:** `AdminShiftGrid.tsx`, `shift-logic.ts`

**Verifica:** salvataggio cella identico a prima; bordo rosso su conflitti.

---

## UX-03 — Copia mese precedente
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟡 |
| **Effort** | L |

**Nuova API:** `POST /api/admin/shifts/copy-month` con conferma esplicita UI.

**Regola:** mai sovrascrivere senza modal “Sei sicuro?”.

---

## UX-04 — Undo singolo (stack locale)
| | |
|---|---|
| **P** | P3 |
| **Rischio** | 🔴 |
| **Effort** | XL |

**Solo client-side** per ultima operazione (5 min) — non toccare DB history.

**Blocca:** fino a UX-02 stabile.

---

## UX-05 — Workflow assenze 2 livelli
| | |
|---|---|
| **P** | P2 |
| **Rischio** | 🟡 |
| **Effort** | L |

**Prisma:** campo `approvalStage` su `AgentRequest` (default comportamento attuale = 1 livello).

**Feature flag tenant:** `twoLevelApproval: false` default → **nessun cambiamento** per comuni esistenti.

---

# Calendario consigliato (8 settimane)

| Settimana | Focus | Task ID |
|-----------|-------|---------|
| 1 | Baseline + sicurezza P0 | 00.x, SEC-01–06 |
| 2 | Rate limit + Nginx + MFA + backup | SEC-04,07–09, INFRA-01–03 |
| 3 | Documentazione + CI | DOC-01–04, CI-01 |
| 4 | Monitoring + pentest | INFRA-04–05, CI-03 |
| 5–6 | API + doc EN | API-01–02, EU-01 |
| 7–8 | UX additive (opz.) | UX-02–05 |

---

# Definition of Done — “SaaS top Oracle EU”

- [ ] Zero endpoint debug pubblici in produzione
- [ ] Rate limiting attivo e testato
- [ ] Backup giornaliero + restore testato entro 30 gg
- [ ] Crontab allineato con `CRON_SECRET` e job GDPR attivi
- [ ] Policy/BCP coerenti con Oracle EU
- [ ] CI blocca su build + test isolamento tenant
- [ ] Smoke test TASK-00.3 OK dopo ogni release
- [ ] DPA firmato con almeno 1 Comune
- [ ] Pentest report con zero Critical aperti

---

# Ordine deploy sicuro (checklist rapida)

```
□ TASK-00.2 backup
□ npm run build (locale)
□ git commit atomico (un SEC/INFRA per commit)
□ git pull sul server
□ docker compose -f docker-compose.prod.yml up -d --build
□ curl health 200
□ Smoke test 8 punti
□ Monitor log 15 min: docker logs -f app-portale-caserma-1
```

---

# Cosa NON fare (per non rompere produzione)

| Azione | Perché |
|--------|--------|
| Refactor massivo `useAdminData` / `useAgentData` | Alto rischio regressioni |
| Cambiare schema `Shift` senza migrazione pianificata | Rompe pianificazione |
| Aggiornare Prisma 5→7 in produzione | Breaking changes |
| Rimuovere `trustedIps` da tutti gli utenti in un colpo | Lockout massiccio |
| Deploy venerdì sera | — |
| `prisma db push --force-reset` | Cancella dati |

---

*Questa scaletta va aggiornata spuntando i task in fondo a ogni sezione. Per ogni commit usare messaggi tipo: `fix(security): disable test-db in production (SEC-03)`.*
