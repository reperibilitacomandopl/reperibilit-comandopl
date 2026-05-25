# Backup e restore PostgreSQL — Sentinel Oracle

## Backup automatico

- Script: `scripts/backup-db.sh`
- Cron: `15 2 * * *` (02:15 UTC) — vedi `scripts/crontab.txt`
- Output: `/home/ubuntu/backups/sentinel_YYYYMMDD_HHMMSS.dump`
- Retention: 14 giorni (configurabile con `RETENTION_DAYS`)

Installazione cron sul server:

```bash
cd ~/app
bash scripts/install-sentinel-cron.sh
```

Test manuale:

```bash
bash ~/app/scripts/backup-db.sh
ls -lh ~/backups/
```

## Restore su istanza temporanea (test mensile)

```bash
DUMP="/home/ubuntu/backups/sentinel_ULTIMO.dump"
TEST_DB="sentinel_restore_test"

docker exec -i app-db-1 psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"
docker exec -i app-db-1 psql -U postgres -c "CREATE DATABASE ${TEST_DB};"
docker exec -i app-db-1 pg_restore -U postgres -d "${TEST_DB}" --no-owner < "${DUMP}"
docker exec -i app-db-1 psql -U postgres -d "${TEST_DB}" -c "SELECT COUNT(*) FROM \"User\";"
```

Se il conteggio utenti è coerente, documentare esito nel registro operativo del Comando.

## Restore in produzione (emergenza)

1. Fermare traffico: `sudo docker compose stop portale-caserma`
2. Backup pre-restore: `bash scripts/backup-db.sh`
3. Restore sul DB `postgres`:

```bash
DUMP="/home/ubuntu/backups/sentinel_YYYYMMDD_HHMMSS.dump"
docker exec -i app-db-1 pg_restore -U postgres -d postgres --clean --if-exists < "${DUMP}"
```

4. Riavviare: `sudo docker compose up -d portale-caserma`
5. Smoke test: login, `/api/health`, pianificazione mese corrente

**RPO:** fino all’ultimo dump giornaliero (max ~24h se il cron non è fallito).
