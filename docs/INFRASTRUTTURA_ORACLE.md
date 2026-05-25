# Infrastruttura di produzione — Oracle Cloud EU

> **Fonte unica di verità** per stack hosting Sentinel Security Suite.  
> **Non** usiamo Vercel, Supabase, Neon o Vercel Cron in produzione.

## Stack

| Componente | Tecnologia | Note |
|------------|------------|------|
| **Cloud** | Oracle Cloud Infrastructure (OCI) | Regione UE (es. `eu-milan-1`) |
| **OS** | Ubuntu LTS | VM dedicata |
| **TLS** | Nginx + Let's Encrypt | `gestionepolizialocale.it` |
| **App** | Docker · Next.js 16 standalone | Porta `127.0.0.1:3000` |
| **Database** | PostgreSQL 15 | Stesso host o rete privata OCI |
| **Cron** | `crontab` su VM | `Authorization: Bearer $CRON_SECRET` |
| **Backup** | `scripts/backup-db.sh` | Dump giornaliero |

## URL

- **Produzione:** https://gestionepolizialocale.it
- **Repository:** GitHub → deploy manuale su VM Oracle

## Sub-responsabili (extra-OCI)

Elencati in `/policy` e generati nei PDF compliance:

- Upstash (rate limit Redis, opzionale, regione EU)
- Telegram (notifiche)
- hCaptcha (login)
- Let's Encrypt (certificati TLS)

## Deploy

Vedi `CLAUDE.md` e `README.md` sezione Deploy Oracle.

## Documenti correlati

- [`BUSINESS_CONTINUITY_PLAN.md`](./BUSINESS_CONTINUITY_PLAN.md)
- [`STATO_SICUREZZA_ORACLE.md`](./STATO_SICUREZZA_ORACLE.md)
- [`PROGRAMMA_COMPLETO_SAAS_ORACLE_EU.md`](./PROGRAMMA_COMPLETO_SAAS_ORACLE_EU.md)
