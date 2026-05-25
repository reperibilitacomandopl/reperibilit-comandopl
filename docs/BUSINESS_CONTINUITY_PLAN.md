# BUSINESS CONTINUITY PLAN E DISASTER RECOVERY
## Sentinel Security Suite

**Versione:** 1.1  
**Data:** 24 Maggio 2026  
**Classificazione:** Riservato (Allegato Tecnico per Bandi PA)  
**Infrastruttura:** Oracle Cloud Infrastructure (regione UE) — Docker · Nginx · PostgreSQL 15

---

## 1. OBIETTIVO DEL DOCUMENTO

Il presente documento descrive le misure tecniche e organizzative adottate per garantire la continuità operativa (Business Continuity) e il ripristino in caso di disastro (Disaster Recovery) della piattaforma SaaS **Sentinel Security Suite**, ospitata su **Oracle Cloud nella regione dell'Unione Europea**.

Il piano è redatto in conformità con i requisiti del D.Lgs. 82/2005 (CAD), GDPR (UE 2016/679), e le linee guida AgID per i servizi cloud della Pubblica Amministrazione.

## 2. DEFINIZIONE DEI PARAMETRI DI RECUPERO

| Parametro | Obiettivo (configurazione attuale) | Obiettivo (con HA + backup off-server) |
|-----------|-----------------------------------|----------------------------------------|
| **RTO** | ≤ 8 ore | ≤ 4 ore |
| **RPO** | ≤ 24 ore (backup giornaliero) | ≤ 1 ora |

*Gli obietti in colonna destra richiedono backup automatici su OCI Object Storage e/o database su seconda istanza.*

## 3. ARCHITETTURA DI PRODUZIONE

```
Internet → Nginx (TLS Let's Encrypt) → 127.0.0.1:3000 → Container Next.js (standalone)
                                              ↘ PostgreSQL 15 (container o servizio locale)
```

### 3.1 Applicazione (Frontend/API)
- **Hosting:** VM Oracle Cloud EU (Ubuntu), container Docker `portale-caserma`
- **Reverse proxy:** Nginx con TLS 1.2/1.3, HSTS, security headers
- **Health check:** `GET /api/health` ogni 30s (Docker healthcheck)
- **Timezone:** Europe/Rome

### 3.2 Database
- **Motore:** PostgreSQL 15
- **Ubicazione:** stessa VM o rete privata OCI (porta 5432 non esposta pubblicamente)
- **Crittografia:** volumi OCI crittografati at rest; connessione `DATABASE_URL` via rete interna
- **Isolamento:** multi-tenant logico tramite `tenantId` su tutte le query

### 3.3 Storage documenti
- File system locale `/data/storage` (signed URL HMAC, scadenza 15 min)
- Backup volume incluso nel backup DB + filesystem (script `scripts/backup-db.sh`)

### 3.4 Servizi esterni (non Oracle)
| Servizio | Uso | Note GDPR |
|----------|-----|-----------|
| Telegram | Notifiche | Extra-UE, SCC |
| hCaptcha | Anti-bot login | Extra-UE, SCC |
| Upstash Redis | Rate limit (opzionale) | Configurare regione EU |

**Non si utilizzano** Vercel, Supabase, Neon o altri hosting applicativo/database di terze parti per la produzione.

## 4. PIANO DI BACKUP E RETENTION

| Tipo | Frequenza | Retention | Ubicazione |
|------|-----------|-----------|------------|
| Dump PostgreSQL (`pg_dump -Fc`) | Giornaliero (cron 02:00) | 30 giorni | `/home/ubuntu/backups` + copia OCI Object Storage (bucket EU) |
| Snapshot VM OCI | Settimanale (consigliato) | 4 settimane | OCI Block Volume backup |
| Log applicazione | Rotazione | 90 giorni | Docker logs / syslog |

**Verifica restore:** test mensile documentato su istanza di staging o DB temporaneo.

## 5. SCENARI DI DISASTRO E PROCEDURE

### 5.1 Guasto container applicazione
*Azione:* `docker compose up -d --build portale-caserma`  
*RTO stimato:* 15–30 minuti

### 5.2 Corruzione database / errore umano
*Azione:* `pg_restore` dall'ultimo dump `.dump.gz` valido  
*RTO stimato:* 1–3 ore

### 5.3 Guasto completo VM
*Azione:* Nuova VM OCI EU → restore backup → DNS invariato  
*RTO stimato:* 4–8 ore

### 5.4 Compromissione sicurezza
*Azione:* isolamento VM, rotazione segreti (`.env`), restore DB pre-incidente, invalidazione sessioni  
*Notifica:* DPO entro 72h se violazione dati personali (art. 33 GDPR)

## 6. COMUNICAZIONE E GESTIONE INCIDENTI

1. **Identificazione:** entro 15 minuti dal rilevamento (monitoring `/api/health`)
2. **Prima notifica:** entro 1 ora al referente del Comando PL (email/PEC)
3. **Aggiornamenti:** ogni ora durante il ripristino
4. **Report post-incidente (RCA):** entro 5 giorni lavorativi

## 7. TEST E AGGIORNAMENTI

- Test restore backup: **mensile**
- Revisione BCP: **annuale** o dopo modifiche infrastrutturali significative
- Deploy applicativo: solo dopo `npm run build` OK e smoke test documentati

---

*Documento allineato all'infrastruttura Oracle EU — non descrive più Vercel/Supabase.*
