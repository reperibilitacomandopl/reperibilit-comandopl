# Programma completo — Sentinel Security Suite  
## Da prodotto operativo a SaaS top (Oracle EU · PA italiana · bandi europei)

> **Documento master** — riassume tutto quanto analizzato nel progetto: prodotto, gap, normative, infrastruttura, go-to-market e piano di lavoro.  
> **Ultimo aggiornamento:** 24 Maggio 2026

### Documenti collegati (dettaglio operativo)

| Documento | Contenuto |
|-----------|-----------|
| [`STATO_SICUREZZA_ORACLE.md`](./STATO_SICUREZZA_ORACLE.md) | Solo interventi sicurezza: **fatto in locale** / **da fare sul server** |
| [`SCALETTA_ORACLE_EU.md`](./SCALETTA_ORACLE_EU.md) | Task tecnici passo-passo, comandi, verifiche, rollback |
| [`ROADMAP_COMPLETA.md`](./ROADMAP_COMPLETA.md) | Roadmap 14 settimane sicurezza + PA (AgID, NIS2, UX) |
| [`ROADMAP.md`](./ROADMAP.md) | Feature prodotto v3 (turni, OdS, KPI — quasi tutte ✅) |
| [`AUDIT_MIGLIORAMENTI.md`](./AUDIT_MIGLIORAMENTI.md) | Miglioramenti UX per pagina |
| [`CAPITOLATO_TECNICO.md`](./CAPITOLATO_TECNICO.md) | Testo per gare / appalti PA |
| [`checklist-sicurezza-saas-pa.md`](../checklist-sicurezza-saas-pa.md) | Checklist sicurezza SaaS PA |
| [`tasks/prd-sentinel-security-suite.md`](../tasks/prd-sentinel-security-suite.md) | PRD commerciale e user stories |
| [`BUSINESS_CONTINUITY_PLAN.md`](./BUSINESS_CONTINUITY_PLAN.md) | BCP (da allineare a Oracle) |

---

## Parte 1 — Cos’è il progetto

### 1.1 Identità

| Elemento | Valore |
|----------|--------|
| **Nome commerciale** | Sentinel Security Suite |
| **Nome repository** | `portale-polizia-locale-altamura` / portale-caserma |
| **URL produzione** | `https://gestionepolizialocale.it` |
| **Target** | Comandi di Polizia Locale italiani (Comuni ~5.000–250.000 abitanti) |
| **Modello** | SaaS multi-tenant (un tenant = un Comando) |
| **Pilota** | Comune di Altamura |

### 1.2 Problema che risolve

I Comandi PL (~8.000 in Italia) usano spesso strumenti non integrati: Excel, registri cartacei, WhatsApp. Conseguenze:

- Errori pianificazione (doppi turni, massimali superati)
- Ore amministrative per OdS, cartellini, report
- Scarso audit trail e conformità GDPR
- Nessun SOS geolocalizzato integrato

### 1.3 Soluzione (flusso operativo)

```
Pianificazione turni → OdS giornaliero → Presenze GPS → Interventi / SOS
        → Rendicontazione (export paghe) → Audit / documenti certificati
```

### 1.4 Stack tecnico

| Layer | Tecnologia |
|-------|------------|
| Frontend | Next.js 16, React 19, PWA installabile |
| Backend | API Routes (~131 endpoint), middleware sicurezza |
| DB | PostgreSQL 15, Prisma, multi-tenant `tenantId` |
| Auth | NextAuth v5, JWT, 2FA TOTP, lockout, hCaptcha |
| Hosting **reale** | **Oracle Cloud EU** · Ubuntu · Nginx · Docker |
| Servizi | Telegram, Web Push, Upstash Redis (opz.), cron |

### 1.5 Cosa è già forte (non rifare)

- Multi-tenant con middleware + test E2E isolamento
- Pianificazione, reperibilità, OdS con firma/hash, export paghe
- PWA agente: timbrature, SOS, iCal, push, Telegram
- Audit log, GDPR export/delete, retention cron
- Centro compliance in-app (DPA, registro, SLA PDF)
- Roadmap funzionale v3 (fasi 6–8) in gran parte completata nel codice

---

## Parte 2 — Situazione attuale e criticità

### 2.1 Due livelli di maturità

| Livello | Stato | Note |
|---------|--------|------|
| **Prodotto operativo** | Alto | Utilizzabile da un Comando reale |
| **SaaS vendibile PA** | Medio | Manca packaging legale, SLA misurati, billing |
| **Bandi europei** | Medio-basso | Serve consorzio, KPI, doc EN, interoperabilità |
| **Infrastruttura “enterprise”** | Medio-basso | VM singola; BCP documentato ≠ architettura reale |

### 2.2 Oracle EU — cosa hai vs cosa promette la doc

**Realtà tipica (da analisi repo + deploy):**

```
Internet → Nginx (TLS) → 127.0.0.1:3000 → Container Next.js
                              ↘ PostgreSQL (stesso host o container locale)
```

**Documentazione** (README, policy, FAQ, BCP, capitolato, landing) è stata **allineata a Oracle Cloud EU** — non si usa Vercel né Supabase in produzione.

| Promessa in documenti | Su 1 VM Oracle senza HA |
|------------------------|-------------------------|
| Uptime 99,5% | Realistico 95–98% senza ridondanza |
| RPO ≤ 1h | Serve backup continuo; altrimenti 24h (backup giornaliero) |
| RTO ≤ 4h | Possibile con runbook; non automatico |
| Failover DB automatico | Non presente su compose standard |

**Azione programma:** allineare **tutti** i documenti legali/tecnici a Oracle OCI (regione EU es. Milan/Frankfurt) **oppure** investire in infrastruttura a 2 nodi.

### 2.3 Cosa manca per essere “top”

Non servono 50 feature nuove; servono **coerenza**, **prove formali** e **packaging**:

1. Infrastruttura e BCP coerenti con Oracle  
2. Sicurezza dimostrata (pentest, CI che blocca, backup testati)  
3. Documentazione legale veritiera (sub-responsabili, DPIA)  
4. Interoperabilità (OpenAPI, API key) per comuni e UE  
5. Affinamenti UX che riducono lavoro quotidiano del comandante  
6. Modello commerciale (trial, contratto, fatturazione PA)

---

## Parte 3 — Programma per obiettivo

### Asse A — Sicurezza e fiducia (settimane 1–3)

**Obiettivo:** superare due diligence PA e audit tecnico.

| ID | Attività | Stato | Riferimento |
|----|----------|--------|-------------|
| A1 | Baseline server + backup punto zero | Da fare | SCALETTA Fase 0 |
| A2 | Deploy patch sicurezza (debug off, rate limit, Verbatel key, cron) | Codice ✅ / Server ☐ | `STATO_SICUREZZA_ORACLE.md` |
| A3 | Rotazione segreti su server | Da fare | SEC-01 |
| A4 | Pentest esterno + remediation | Da fare | CI-03 |
| A5 | CI che blocca su build + test tenant | Parziale | CI-01 |
| A6 | Allineare CSP Nginx ↔ app | Da fare | SEC-08 |
| A7 | MFA admin senza auto-trust IP | Da fare | SEC-09 |
| A8 | Rimozione dipendenza `AUTH_SECRET` per integrazioni | Parziale | VERBATEL_API_KEY |

**Definition of Done Asse A:**  
`/api/test-db` → 404 in prod; rate limit attivo; cron 200 con secret; pentest zero Critical aperti.

---

### Asse B — Affidabilità Oracle EU (settimane 2–4)

**Obiettivo:** RTO/RPO onesti e ripristino provato.

| ID | Attività | Priorità |
|----|----------|----------|
| B1 | `pg_dump` giornaliero → OCI Object Storage (bucket EU) | P0 |
| B2 | Test restore mensile documentato | P0 |
| B3 | `docker-compose.prod.yml` canonico (solo 127.0.0.1) | P1 |
| B4 | Separare DB su seconda VM (minimo HA) | P1 |
| B5 | Monitoring uptime + alert disco/RAM/Telegram | P2 |
| B6 | fail2ban SSH + hardening Nginx | P2 |
| B7 | Riscrivere `BUSINESS_CONTINUITY_PLAN.md` per Oracle | P1 |

**Parametri onesti (1 VM):** RPO 24h · RTO 4–8h · Uptime target 98%  
**Parametri target (2 VM + backup off-box):** RPO 1h · RTO 4h · Uptime 99,5%

---

### Asse C — Conformità PA italiana (settimane 3–6)

**Obiettivo:** vendibile a Comuni e in gare.

| Normativa | Cosa serve | Stato |
|-----------|------------|--------|
| **GDPR** art. 28–30 | DPA firmato, registro trattamenti per Comando | Parziale (generazione PDF ✅) |
| **GDPR** art. 35 | DPIA GPS/timbrature firmata con pilota | Pagina FAQ ✅, firma ☐ |
| **NIS2** (D.Lgs. 138/2024) | Registro incidenti, ruoli, formazione, supply chain | Documentale |
| **AgID / ACN** | Linee guida SaaS PA, catalogo cloud | Da qualificare |
| **CAD** | Accessibilità, conservazione, audit | Parziale |
| **eIDAS** | Valore legale OdS | Hash/timestamp ✅; firma qualificata ☐ |
| **WCAG 2.1 AA** | Dichiarazione ✅; audit reale ☐ | |
| **Accessibilità** D.Lgs. 106/2018 | Pagina `/accessibilita` ✅ | |

| ID | Attività |
|----|----------|
| C1 | Aggiornare `/policy` e `/faq`: sub-responsabili = **Oracle OCI EU** (+ Telegram, hCaptcha, Upstash EU se usato) |
| C2 | DPA + registro firmati con Altamura (pilota) |
| C3 | DPIA firmata (GPS, reperibilità, assenze) |
| C4 | SLA misurati (status page o report uptime mensile) |
| C5 | Pentest report allegabile al capitolato |
| C6 | Candidatura / scheda **Catalogo Cloud Italia** o marketplace AgID |
| C7 | Valutare firma OdS PAdES / certificato qualificato (roadmap legale) |

---

### Asse D — Utilità Polizia Locale (settimane 4–10)

**Obiettivo:** indispensabile nel lavoro quotidiano del Comando.

| Area | Già presente | Da migliorare |
|------|--------------|---------------|
| Pianificazione turni | Griglia, generatore, export | Undo, multi-select, copia mese, conflitti visivi |
| OdS | Drag-drop, certificazione, PDF | Template, certifica+stampa 1 click |
| Assenze | Richieste, approvazioni | Workflow **2 livelli** (flag disattivato default) |
| Ragioneria | Export paghe | Mapping software paghe comunali |
| Verbatel | Sync/export | Doc ufficiale + chiave dedicata |
| Agente PWA | SOS, GPS, turni | Offline coda timbrature |
| Formazione | Modulo training | Integrazione scadenze corsi |
| CCNL / indennità | Buoni pasto, export | Validazione consulente del lavoro |

| ID | Attività | Rischio regressione |
|----|----------|---------------------|
| D1 | Conflitti visivi griglia | 🟢 |
| D2 | Copia mese precedente (con conferma) | 🟡 |
| D3 | Workflow assenze 2 livelli (`twoLevelApproval: false` default) | 🟡 |
| D4 | Undo client-side (ultima azione) | 🔴 — ultima |
| D5 | Wizard onboarding primo accesso tenant | 🟢 |
| D6 | Video / guida in-app per agenti | 🟢 — solo contenuti |

Dettaglio UX: [`AUDIT_MIGLIORAMENTI.md`](./AUDIT_MIGLIORAMENTI.md)

---

### Asse E — SaaS commerciale (settimane 5–12)

**Obiettivo:** modello economico sostenibile.

| ID | Attività | Note |
|----|----------|------|
| E1 | Piani TRIAL / ACTIVE / ENTERPRISE enforced (blocco post-scadenza) | `trialEndsAt` esiste |
| E2 | Processo commerciale PA: ordine + fattura elettronica (anche senza Stripe) | |
| E3 | Stripe o pagamento manuale per comuni piccoli | Opzionale |
| E4 | Limiti trial (max agenti) automatici | |
| E5 | SuperAdmin: dashboard tenant, MRR, scadenze | |
| E6 | Case study Altamura con numeri (ore risparmiate) | Per vendita e bandi |
| E7 | Landing allineata a Oracle EU (no Vercel in hero) | ✅ |
| E8 | Manuale operativo aggiornato + formazione 2h admin + 1h agenti | `MANUALE_OPERATIVO.md` |

---

### Asse F — Bandi e progetti europei (settimane 6–16)

**Obiettivo:** credibilità in Horizon / Digital Europe / Interreg.

#### Prerequisiti “checklist bando”

| Criterio | Pronto? |
|----------|---------|
| Prodotto in produzione | ✅ |
| Caso pilota con impatto misurabile | ✅ Altamura |
| Hosting 100% UE documentato | ⚠️ da documentare regione OCI |
| BCP/DR coerente | ☐ |
| Pentest | ☐ |
| API standard | Parziale |
| Partner UE nel consorzio | ☐ da costruire |
| Documentazione tecnica inglese | ☐ |
| DPIA / DPA | Parziale |

#### Programmi UE da valutare

| Programma | Angolo Sentinel |
|-----------|-----------------|
| **Horizon Europe** | Govtech, sicurezza pubblica, AI trustworthy (analytics copertura) |
| **Digital Europe** | Cybersecurity, cloud, interoperabilità |
| **Interreg** (Adriatico/MED) | Partner PL/comuni oltre confine |
| **CEF Digital** | Se integrazioni eID/notifiche digitali in futuro |

#### Attività programma

| ID | Attività |
|----|----------|
| F1 | `docs/TECHNICAL_OVERVIEW_EN.md` (architettura, security, GDPR, TRL 7–8) |
| F2 | OpenAPI 3.0 + Swagger UI (`API-01`) |
| F3 | API key per tenant su `/api/v1/*` — **senza** cambiare API esistenti |
| F4 | KPI pilota: ore admin, errori pianificazione, tempi OdS, adozione PWA |
| F5 | Consorzio: università + 1 comune IT + 1 partner UE (PL locale) |
| F6 | Allineamento **EIF** (European Interoperability Framework) in doc |
| F7 | Trasparenza **AI Act** se si promuovono “AI Insights” (no decisioni automatiche su persone) |
| F8 | Deploy IaC (Terraform/Ansible) per replicabilità su Oracle EU |

---

## Parte 4 — Calendario master (16 settimane)

| Settimana | Assi | Focus principale |
|-----------|------|------------------|
| 1 | A | Deploy sicurezza su server + baseline + backup manuale |
| 2 | A, B | Rate limit prod, Nginx CSP, script backup automatico |
| 3 | B, C | Test restore, policy Oracle, DPA pilota |
| 4 | A, C | Pentest, CI bloccante, SLA/uptime report |
| 5 | D | UX pianificazione (conflitti, copia mese) |
| 6 | E, F | OpenAPI, doc EN bozza, case study numeri |
| 7 | D, E | Workflow assenze 2 livelli (flag), trial enforcement |
| 8 | C | Catalogo AgID / scheda prodotto PA |
| 9–10 | D, E | Onboarding wizard, formazione clienti |
| 11–12 | F | Bozza progetto UE + partner |
| 13–16 | B, D | HA DB opzionale, undo, API v1 |

> Le settimane sono indicative; in parallelo puoi vendere al 2°–3° Comando dopo settimana 4–5.

---

## Parte 5 — Matrice gap (tutto in una tabella)

| # | Area | Gap | Priorità | Task ID |
|---|------|-----|----------|---------|
| 1 | Sicurezza | Endpoint debug esposti | P0 | SEC-03 — codice ✅ |
| 2 | Sicurezza | Rate limit disattivato | P0 | SEC-04 — codice ✅ |
| 3 | Sicurezza | Password in git storico | P0 | SEC-02 + rotazione server |
| 4 | Sicurezza | Cron senza Bearer | P0 | SEC-06 template ✅, server ☐ |
| 5 | Sicurezza | Verbatel = AUTH_SECRET | P0 | SEC-05 — codice ✅ |
| 6 | Sicurezza | Pentest assente | P1 | CI-03 |
| 7 | Infra | Backup non automatizzato | P0 | INFRA-01 |
| 8 | Infra | Single VM SPOF | P1 | INFRA-03, B4 |
| 9 | Infra | BCP non realistico | P1 | B7, DOC-02 |
| 10 | Legale | Policy dice Supabase/Vercel | P1 | DOC-01 ✅ (testi aggiornati) |
| 11 | Legale | DPIA non firmata | P1 | C3 |
| 12 | Legale | eIDAS firma qualificata OdS | P2 | C7 |
| 13 | Prodotto | Pianificazione densa / undo | P2 | D1–D4 |
| 14 | Prodotto | API pubblica documentata | P2 | F2, API-01 |
| 15 | SaaS | Billing / upgrade trial | P2 | E1–E4 |
| 16 | UE | Doc inglese + consorzio | P2 | F1, F5 |
| 17 | UX | Accessibilità audit WCAG | P2 | C6 |
| 18 | CI | Test non bloccanti | P1 | CI-01 |

---

## Parte 6 — Cosa è già stato fatto in locale (riepilogo)

> Dettaglio file-per-file: [`STATO_SICUREZZA_ORACLE.md`](./STATO_SICUREZZA_ORACLE.md)

- [x] SEC-02, SEC-03, SEC-04, SEC-05, SEC-06 (template), SEC-07  
- [x] `.env.example`, `docker-compose.prod.yml`, test sicurezza, fix CI ZAP  
- [ ] **Nessun deploy su Oracle** finché non esegui pull + build + restart  
- [ ] SEC-01 rotazione segreti (solo server)  
- [ ] INFRA, DOC, UX, EU — tutto il resto del programma  

---

## Parte 7 — Definition of Done globale (“SaaS top”)

### Prodotto
- [ ] Smoke test 8 flussi OK dopo ogni release  
- [ ] Zero regressioni su Altamura per 30 giorni post-major deploy  

### Sicurezza
- [ ] Pentest senza Critical  
- [ ] Isolamento tenant in CI obbligatorio  
- [ ] Nessun segreto in repository  

### Infrastruttura Oracle EU
- [ ] Regione OCI documentata in contratto/DPA  
- [ ] Backup giornaliero + restore testato (log datato)  
- [ ] Uptime monitorato e reportato  

### PA / legale
- [ ] DPA + DPIA firmati con almeno 1 Comune  
- [ ] Policy allineata allo stack reale  
- [ ] SLA pubblicato  

### Commerciale
- [ ] 2 Comuni paganti o in contratto oltre al pilota  
- [ ] Case study con KPI numerici  

### Europa
- [ ] Technical overview EN  
- [ ] OpenAPI pubblicata  
- [ ] Almeno 1 partner UE in accordo per bando  

---

## Parte 8 — Ordine di esecuzione consigliato (non rompere produzione)

```
1. TASK-00.2  Backup DB
2. Deploy     Patch sicurezza (STATO_SICUREZZA)
3. Smoke test 8 punti
4. INFRA-01   Backup automatico
5. DOC-01     Policy Oracle
6. CI-01      Pipeline strict
7. Pentest
8. DOC-03     DPA/DPIA firmati
9. D1–D3      UX ad alto impatto
10. F1–F2     Doc UE + OpenAPI
11. E1–E6     SaaS commerciale
```

### Mai in produzione senza

- `npm run build` OK  
- Backup del giorno  
- Smoke test  
- Orario: preferibile fascia 06:00–07:00 o weekend  

---

## Parte 9 — Ruoli e responsabilità (se lavori in team)

| Ruolo | Responsabilità nel programma |
|-------|------------------------------|
| **Sviluppo** | Assi A, D, F2; deploy; CI |
| **DevOps / Oracle** | Assi B; crontab; backup; Nginx |
| **Legale / DPO** | Asse C; DPA; DPIA; contratti |
| **Commerciale** | Asse E; case study; gare |
| **Comando pilota** | Feedback UX; firma documenti; KPI |

---

## Parte 10 — Metriche di successo (12 mesi)

| Metrica | Target indicativo |
|---------|-------------------|
| Comuni attivi paganti | 3 → 10 |
| Uptime misurato | ≥ 98% (poi 99,5% con HA) |
| Tempo medio gestione turni/mese | −50% vs Excel |
| Agenti con PWA + push | ≥ 80% organico |
| Incidenti sicurezza Critical | 0 |
| Progetti UE presentati | 1–2 |
| Qualificazione AgID / catalogo | 1 scheda pubblicata |

---

## Parte 11 — Prossima azione immediata

1. Leggi [`STATO_SICUREZZA_ORACLE.md`](./STATO_SICUREZZA_ORACLE.md)  
2. Esegui deploy sul server Oracle (sezione “Deploy rapido”)  
3. Spunta Fase 0 in [`SCALETTA_ORACLE_EU.md`](./SCALETTA_ORACLE_EU.md)  
4. Pianifica settimana 2: backup automatico + policy Oracle  

---

*Questo programma va aggiornato a ogni milestone. Per task tecnici granulari usare sempre `SCALETTA_ORACLE_EU.md`; per lo stato sicurezza `STATO_SICUREZZA_ORACLE.md`.*
