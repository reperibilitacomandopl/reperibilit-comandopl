#!/usr/bin/env bash
# Backup PostgreSQL Sentinel — eseguire sul server Oracle (cron notturno)
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/app}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${BACKUP_DIR}/sentinel_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Container DB del compose in ~/app
DB_CONTAINER="${DB_CONTAINER:-app-db-1}"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "[backup-db] ERRORE: container ${DB_CONTAINER} non in esecuzione" >&2
  exit 1
fi

docker exec "${DB_CONTAINER}" pg_dump -U postgres -Fc postgres > "${DUMP_FILE}"
chmod 600 "${DUMP_FILE}"

find "${BACKUP_DIR}" -name 'sentinel_*.dump' -type f -mtime +"${RETENTION_DAYS}" -delete

echo "[backup-db] OK ${DUMP_FILE} ($(du -h "${DUMP_FILE}" | cut -f1))"
