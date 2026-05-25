# Accordo sul trattamento dei dati (DPA) — Template Sentinel

> Modello per Comune / Ente titolare. Adattare con legale prima della firma.

## Parti

- **Titolare:** [Comune di ___], P.IVA/C.F. ___
- **Responsabile (sub-responsabile art. 28 GDPR):** [Ragione sociale fornitore Sentinel], sede ___

## Oggetto

Trattamento dati personali degli operatori di Polizia Locale tramite piattaforma **Sentinel** (turni, reperibilità, timbrature GPS volontarie, OdS, verbali operativi).

## Dati trattati

- Anagrafica operatore (nome, matricola, qualifica, contatti)
- Dati di servizio (turni, assenze, richieste)
- Dati di geolocalizzazione **solo** al momento di timbratura/SOS (non tracking continuo)
- Log di audit operativi

## Finalità e base giuridica

| Finalità | Base |
|----------|------|
| Gestione turni e reperibilità | Obbligo legale / interesse pubblico |
| Timbrature GPS | Consenso esplicito operatore |
| Sicurezza e audit | Legittimo interesse / obbligo di legge |

## Localizzazione

Hosting **UE** — VM Oracle Cloud `[regione]`, dati e backup in `[path backup]`.

## Misure tecniche (allegato tecnico)

- Isolamento multi-tenant (`tenantId` su ogni query)
- Crittografia in transito (TLS 1.2+)
- Backup giornaliero DB (`scripts/backup-db.sh`)
- Retention GPS/timbrature 6 mesi (cron `data-retention`)
- Accesso admin con RBAC e audit log

## Sub-responsabili

| Fornitore | Servizio | Sede |
|-----------|----------|------|
| Oracle Cloud | IaaS VM | UE |
| [Upstash se attivo] | Rate limit Redis | UE |

## Diritti interessati

Richieste ARS via referente Comune → export/cancellazione tramite funzioni GDPR in app (`/api/user/gdpr/*`).

## Durata

Durata contratto SaaS + 30 giorni per cancellazione dati su richiesta di cessazione.

---

**Firme**

Titolare: _______________  Data: _______

Responsabile: _______________  Data: _______
