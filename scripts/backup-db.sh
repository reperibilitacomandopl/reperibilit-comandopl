#!/usr/bin/env bash
# Backup PostgreSQL Sentinel — eseguire sul server Oracle (cron notturno)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Rileva container DB (nome tipico docker compose)
DB_CONTAINER="${DB_CONTAINER:-}"
if [ -z "$DB_CONTAINER" ]; then
  DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'db|postgres' | head -1 || true)
fi

OUT="$BACKUP_DIR/sentinel-${STAMP}.dump"

if [ -n "$DB_CONTAINER" ]; then
  echo "[backup] Dump da container: $DB_CONTAINER"
  docker exec "$DB_CONTAINER" pg_dump -U postgres -Fc postgres > "$OUT"
else
  echo "[backup] Dump via pg_dump locale"
  pg_dump -h 127.0.0.1 -U postgres -Fc postgres > "$OUT"
fi

gzip -f "$OUT"
echo "[backup] OK: ${OUT}.gz ($(du -h "${OUT}.gz" | cut -f1))"

find "$BACKUP_DIR" -name 'sentinel-*.dump.gz' -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
