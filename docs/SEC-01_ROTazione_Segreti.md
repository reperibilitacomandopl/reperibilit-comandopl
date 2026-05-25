# SEC-01 — Rotazione segreti (server Oracle)

Eseguire **solo sul server**, mai committare valori reali.

## Ordine consigliato

1. Backup DB: `bash scripts/backup-db.sh`
2. Generare nuovi valori:
   ```bash
   openssl rand -base64 32   # AUTH_SECRET / NEXTAUTH_SECRET
   openssl rand -hex 32      # CRON_SECRET, VERBATEL_API_KEY, STORAGE_SIGNING_SECRET
   ```
3. Aggiornare `~/app/.env` (e `POSTGRES_PASSWORD` solo se necessario — richiede `ALTER USER` su Postgres).
4. Aggiornare script Verbatel in console con `VERBATEL_API_KEY`.
5. Aggiornare crontab se il path `.env` è cambiato.
6. `cd ~/app && sudo docker compose up -d --build portale-caserma`
7. `bash scripts/verify-cron.sh`
8. `bash scripts/sec-01-check-env.sh`

## Effetti

| Segreto | Effetto rotazione |
|---------|-------------------|
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Tutti gli utenti devono rifare login |
| `CRON_SECRET` | Aggiornare crontab + verificare con `verify-cron.sh` |
| `VERBATEL_API_KEY` | Aggiornare injector Verbatel |
| `POSTGRES_PASSWORD` | Aggiornare `DATABASE_URL`, `.env`, restart DB |

## Audit senza rotazione

```bash
bash scripts/sec-01-check-env.sh /home/ubuntu/app/.env
```
