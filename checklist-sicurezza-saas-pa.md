# Checklist Sicurezza SaaS — Pubblica Amministrazione

> Guida tecnica per rendere un prodotto SaaS conforme e inattaccabile per la vendita alle PA italiane.  
> Ogni punto include la descrizione del problema, l'implementazione consigliata e la priorità.

---

## 1. Isolamento Multi-Tenant

### 1.1 Slug check nel middleware ⚠ Critico

**Problema:** Un utente autenticato come Admin del Comune A può digitare manualmente `/comune-b/admin/...` e caricare l'interfaccia di un altro tenant.

**Soluzione:**
```ts
// middleware.ts (Next.js)
export function middleware(req: NextRequest) {
  const session = await getSession(req);
  const urlSlug = req.nextUrl.pathname.split('/')[1];

  if (session?.user?.tenantSlug !== urlSlug) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
```

**Regola:** Se `session.user.tenantSlug` non coincide con lo slug nell'URL → **403 immediato**, mai redirect silenzioso.

---

### 1.2 Filtro tenantId su ogni query Prisma ⚠ Critico

**Problema:** Un utente che manomette l'ID nella request body può accedere a dati di altri tenant se le query non sono vincolate.

**Soluzione:**
```ts
// Ogni query deve includere il filtro di sessione
const turn = await prisma.turn.findFirst({
  where: {
    id: requestedId,
    tenantId: session.user.tenantId, // ← MAI omettere
  },
});
```

---

### 1.3 Separazione storage file/allegati — Alta priorità

- I file caricati devono essere in bucket/cartelle isolate per tenant: `/tenants/{tenantId}/...`
- Usare **signed URL** con validità temporanea (es. 15 minuti), mai URL pubblici fissi
- Librerie: `@aws-sdk/s3-request-presigner` o equivalente Cloudflare R2

---

### 1.4 Audit log per accessi cross-tenant sospetti — Alta priorità

- Log immutabile ogni volta che viene rilevato un tentativo di accesso a slug diverso dalla sessione
- Alert automatico via email/webhook al superadmin
- Conservare: timestamp, userId, tenantSlug tentato, IP, user-agent

---

### 1.5 Test automatico di isolamento tenant — Media priorità

- Suite di test E2E (Playwright/Cypress) che verifica: utente del Comune A **non vede** dati del Comune B
- Eseguire ad ogni deploy in CI/CD
- Testare sia le API (`/api/...`) che le pagine renderizzate

---

## 2. Obbligatorietà MFA

### 2.1 Middleware sequestra sessione se MFA non verificata ⚠ Critico

**Problema:** Il modal di verifica MFA è solo lato client — un utente può aggirarlo chiamando le API direttamente.

**Soluzione:**
```ts
// middleware.ts
if (session?.user?.twoFactorEnabled && !session?.user?.twoFactorVerified) {
  return NextResponse.redirect(new URL('/verify-2fa', req.url));
}
```

**Regola:** Nessuna API deve rispondere a dati sensibili finché `twoFactorVerified !== true` nella sessione server-side.

---

### 2.2 Flag twoFactorVerified nella sessione server-side ⚠ Critico

- Il flag deve vivere nella sessione NextAuth/JWT **server-side**
- **Mai** nel localStorage o in cookie non-HttpOnly
- L'utente non deve poterlo manipolare lato client

```ts
// [...nextauth].ts — callbacks
callbacks: {
  jwt({ token, user }) {
    if (user) token.twoFactorVerified = false; // reset ad ogni login
    return token;
  }
}
```

---

### 2.3 TOTP + backup codes — Alta priorità

- Implementare TOTP compatibile con Google Authenticator / Authy (libreria: `otpauth` o `speakeasy`)
- Generare 8–10 backup codes one-time al momento dell'attivazione
- **Hashare i backup codes** in DB prima di salvarli (bcrypt, non SHA puro)
- Mostrare i backup codes una sola volta all'utente, con obbligo di conferma

---

### 2.4 MFA obbligatoria per ruoli Admin/Superadmin — Alta priorità

- Al primo accesso di un Admin senza MFA attiva → forzare il wizard di configurazione
- Non consentire di saltarlo o di accedere ad aree protette senza completarlo
- Considerare MFA obbligatoria per **tutti** gli utenti nelle installazioni PA

---

### 2.5 Invalidazione sessioni attive al cambio password — Media priorità

- Quando l'utente cambia password o disabilita MFA → revocare **tutti** i token di sessione attivi
- Non solo la sessione corrente, ma tutte le sessioni su altri dispositivi
- Implementare con tabella `sessions` in DB o con versioning del JWT secret per utente

---

### 2.6 Log eventi MFA — Media priorità

Tracciare nel log immutabile:
- Attivazione/disattivazione MFA
- Ogni verifica TOTP riuscita/fallita
- Uso di un backup code (con quale codice, oscurato)
- Tentativi falliti consecutivi

---

## 3. Soft Delete & GDPR

### 3.1 Campo deletedAt su tabelle critiche ⚠ Critico

**Aggiungere al `schema.prisma`:**
```prisma
model User {
  // ...
  deletedAt DateTime? // null = attivo, valorizzato = eliminato
}

model Turn {
  // ...
  deletedAt DateTime?
}

model ServiceRequest {
  // ...
  deletedAt DateTime?
}
```

**Tabelle da coprire:** User, Turn, ServiceRequest, Document, AuditLog, Agent

---

### 3.2 Middleware Prisma per soft delete globale — Alta priorità

```ts
// prisma/middleware.ts
prisma.$use(async (params, next) => {
  if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  return next(params);
});
```

Nessuno sviluppatore deve ricordare manualmente il filtro `deletedAt IS NULL`.

---

### 3.3 Periodo di retention configurabile — Alta priorità

- Il superadmin imposta il periodo di retention per tenant (default: **10 anni** per PA, come da CAD)
- Job schedulato (cron giornaliero) per hard delete dei record oltre il periodo
- Ogni hard delete genera una riga nel log immutabile: `{ action: 'hard_delete', table, recordId, reason: 'retention_expired', timestamp }`

---

### 3.4 Endpoint "Diritto alla cancellazione" GDPR art.17 — Alta priorità

**Attenzione:** Non è un hard delete — è una **pseudonimizzazione**.

```ts
// /api/gdpr/erase-user
await prisma.user.update({
  where: { id },
  data: {
    name: '[RIMOSSO]',
    email: `erased_${uuid}@erased.invalid`,
    phone: null,
    deletedAt: new Date(),
    gdprErasedAt: new Date(),
  }
});
// I record correlati (turni, richieste) rimangono per audit, ma senza PII
```

---

### 3.5 Registro trattamenti dati (art.30 GDPR) — Media priorità

Documentare e rendere consultabile:
- Quali dati personali si trattano
- Per quale finalità e base giuridica
- Per quanto tempo
- Chi ha accesso (inclusi subprocessor: hosting, email, log storage)
- Come viene garantita la sicurezza

---

### 3.6 Data Processing Agreement (DPA) — Media priorità

- Contratto DPA conforme GDPR **obbligatorio** prima dell'onboarding di ogni PA
- Includere clausole su subprocessors
- Template di riferimento: [EDPB Standard Contractual Clauses](https://edpb.europa.eu)

---

## 4. Protezione Brute Force & Rate Limiting

### 4.1 Rate limiting globale su POST/PUT/DELETE ⚠ Critico

```ts
// lib/rate-limit.ts con @upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/min per IP
});

// Nel middleware API
const { success } = await ratelimit.limit(ip);
if (!success) return res.status(429).json({ error: 'Too Many Requests' });
```

Limiti consigliati:
| Tipo operazione | Limite |
|---|---|
| Login | 5/min per IP |
| Write (POST/PUT/DELETE) | 60/min per IP |
| GET autenticati | 200/min per utente |
| Generazione OdS/PDF | 10/ora per tenant |

---

### 4.2 Rate limiting per-utente autenticato — Alta priorità

- Oltre all'IP, limitare per `userId`
- Un utente autenticato dietro proxy/VPN non deve poter abusare
- Usare chiave composta: `ratelimit:user:{userId}:write`

---

### 4.3 Account lockout progressivo — Alta priorità

| Tentativi falliti | Azione |
|---|---|
| 5 | Blocco 15 minuti + email notifica all'utente |
| 10 | Blocco 24 ore + notifica admin |
| 20+ | Blocco permanente fino a sblocco manuale admin |

Contatore in Redis con TTL. Reset automatico dopo login riuscito.

---

### 4.4 CAPTCHA dopo N tentativi falliti — Media priorità

- Integrare **hCaptcha** (privacy-friendly, conforme GDPR — alternativa a reCAPTCHA)
- Attivare dopo 3 tentativi falliti sullo stesso IP o account
- Package: `@hcaptcha/react-hcaptcha`

---

### 4.5 Protezione endpoint generazione OdS — Media priorità

- Rate limiting severo: **10 generazioni/ora per tenant**
- La generazione di PDF + hash è CPU-intensive: prevenire DoS applicativo
- Considerare job queue asincrona (BullMQ + Redis) per la generazione

---

### 4.6 Monitoraggio anomalie — Media priorità

- Alert automatico se un tenant supera 3× il suo consumo medio in 10 minuti
- Integrare con Upstash, Datadog, o semplice cron su contatori Redis
- Notifica al superadmin con dettaglio: tenant, tipo operazione, volume

---

## 5. Certificazione PDF con QR Code

### 5.1 Generazione QR Code dinamico nell'OdS ⚠ Critico

```ts
import QRCode from 'qrcode';

const verifyUrl = `https://app.tuodominio.it/verify/${documentHash}`;
const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
  errorCorrectionLevel: 'H', // alta correzione errori per stampa
  width: 200,
});
// Embed nel PDF come immagine PNG base64
```

Il QR punta a un URL **pubblico**, senza autenticazione richiesta.

---

### 5.2 Pagina di verifica pubblica `/verify/:hash` ⚠ Critico

La pagina deve mostrare, anche senza account:

| Campo | Valore esempio |
|---|---|
| Stato | ✅ VALIDO / ❌ REVOCATO / ⚠ NON TROVATO |
| Hash SHA-256 | `a3f8c2d1...` |
| Data emissione | 12/05/2025 ore 14:32 |
| Emesso da | Comune di Altamura |
| Numero OdS | ODS-2025-00142 |

**Questa pagina deve funzionare anche se il SaaS principale è in manutenzione.**  
Considerare un microservizio separato o CDN edge per la verifica.

---

### 5.3 Firma digitale PDF con certificato X.509 — Alta priorità

```ts
import { PDFDocument } from 'pdf-lib';
import forge from 'node-forge';

// Firmare il PDF con certificato X.509
// In MVP: certificato self-signed
// In produzione: CA accreditata AgID (es. Infocert, Aruba)
```

Il certificato digitale rende il PDF **legalmente opponibile** in caso di contestazione.

---

### 5.4 Timestamp opponibile a terzi (RFC 3161) — Alta priorità

```ts
// Richiesta timestamp a TSA gratuita (Freetsa)
const tsaUrl = 'https://freetsa.org/tsr';
// Il timestamp prova che il documento esisteva in quel preciso momento
// Anche in caso di modifica dell'orologio del server
```

Servizi gratuiti: **FreeTSA**, **DigiCert TSA**. Necessario per le PA più esigenti.

---

### 5.5 Revoca OdS: aggiornamento stato in tempo reale — Media priorità

- Quando un OdS viene revocato → aggiornare `status: 'REVOCATO'` nel DB
- La pagina `/verify/:hash` deve mostrare "REVOCATO" immediatamente
- **Mai** modificare o eliminare il PDF già emesso — è un documento storico
- Conservare motivo revoca, chi ha revocato, timestamp

---

### 5.6 Watermark su copie non ufficiali — Media priorità

- Il **primo download** è il documento ufficiale (nessun watermark)
- Download successivi o link condivisi → versione con watermark leggero "COPIA — NON VALIDA AI FINI UFFICIALI"
- Tracciare ogni download nel log con userId, timestamp, IP

---

## 6. Gap Aggiuntivi (non menzionati originariamente)

### 6.1 Content Security Policy (CSP) headers — Alta priorità

```js
// next.config.js
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; frame-ancestors 'none';" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

Tool di verifica: [https://csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com)

---

### 6.2 Dependency scanning automatico (CVE) — Alta priorità

Aggiungere al CI/CD (GitHub Actions):
```yaml
- name: Security audit
  run: npm audit --audit-level=high
- name: Snyk scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

Alternativa gratuita: **Dependabot** nativo di GitHub (attivare in Settings → Security).

---

### 6.3 Secrets management — Alta priorità

- **Mai** committare `.env` in git (verificare con `git-secrets` o `.gitignore` rigoroso)
- In produzione usare: file `.env` sul server Oracle (permessi 600), **OCI Vault**, o Doppler — mai in git
- Ruotare le chiavi API/DB almeno ogni **90 giorni**
- Separare secrets per ambiente: `development`, `staging`, `production`

---

### 6.4 Backup database crittografato e testato — Alta priorità

- Backup giornaliero automatico con crittografia **AES-256 at rest**
- Retention backup: 30 giorni rolling + snapshot mensili per 1 anno
- **Test di ripristino mensile** — un backup non testato non è un backup
- Backup su regione geografica diversa dal DB principale (requisito GDPR per continuità)

---

### 6.5 Logging strutturato con correlazione request ID — Media priorità

```ts
// Ogni request genera un ID univoco propagato in tutti i log
import { v4 as uuid } from 'uuid';

export function middleware(req: NextRequest) {
  const requestId = uuid();
  req.headers.set('x-request-id', requestId);
  // Tutti i log successivi includeranno questo ID
  logger.info({ requestId, path: req.url, method: req.method });
}
```

Fondamentale per correlare eventi durante un audit o incident response.

---

### 6.6 Penetration test prima del go-live — Media priorità

**OWASP ZAP in CI/CD (gratuito):**
```yaml
# .github/workflows/security.yml
- name: OWASP ZAP Full Scan
  uses: zaproxy/action-full-scan@v0.10.0
  with:
    target: 'https://staging.tuodominio.it'
```

Per PA di grandi dimensioni richiedono spesso un pentest con report firmato da un professionista certificato (OSCP/CEH).

---

### 6.7 SLA e Incident Response documentati — Media priorità

Documentare e allegare al contratto PA:

| Severity | Tempo risposta | Tempo risoluzione |
|---|---|---|
| Critical (down totale) | 1 ora | 4 ore |
| High (funzione core non disponibile) | 4 ore | 24 ore |
| Medium (funzione non critica) | 24 ore | 72 ore |

**Obblighi GDPR breach:**
- Notifica al Garante entro **72 ore** dalla scoperta (art.33 GDPR)
- Notifica agli interessati se rischio elevato (art.34 GDPR)
- Template di notifica breach pronto e approvato legalmente

---

## Riepilogo priorità

| # | Area | Checkpoint critici | Priorità |
|---|---|---|---|
| 1 | Multi-Tenant | Slug check middleware, filtro tenantId | ⚠ Critico |
| 2 | MFA | Middleware sequestro sessione, flag server-side | ⚠ Critico |
| 3 | Soft Delete / GDPR | Campo deletedAt, endpoint erasure | ⚠ Critico + Alto |
| 4 | Brute Force | Rate limiting globale, lockout progressivo | ⚠ Critico + Alto |
| 5 | PDF / QR Code | QR dinamico, pagina verifica pubblica | ⚠ Critico + Alto |
| 6 | Gap aggiuntivi | CSP, dependency scan, backup testato | Alto |

---

## Riferimenti normativi

- **CAD** (Codice Amministrazione Digitale) — D.Lgs. 82/2005
- **GDPR** — Regolamento UE 2016/679
- **Linee guida AgID** — Sicurezza nel procurement ICT PA
- **OWASP Top 10** — [https://owasp.org/Top10/](https://owasp.org/Top10/)
- **ISO/IEC 27001** — Standard sicurezza informazioni
- **NIS2 Directive** — Recepita in Italia con D.Lgs. 138/2024

---

*Documento generato il 12/05/2026 — aggiornare ad ogni major release del prodotto.*
