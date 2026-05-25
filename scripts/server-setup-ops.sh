#!/usr/bin/env bash
# Setup operativo completo sul server Oracle (cron, nginx, verify, backup test)
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/app}"
cd "${APP_DIR}"

echo "=== Sentinel server-setup-ops ==="

chmod +x scripts/*.sh 2>/dev/null || true

echo "--- SEC-01 audit (.env) ---"
bash scripts/sec-01-check-env.sh "${APP_DIR}/.env" || true

echo "--- Install cron ---"
bash scripts/install-sentinel-cron.sh

echo "--- Verify cron endpoints ---"
bash scripts/verify-cron.sh

echo "--- Test backup DB ---"
bash scripts/backup-db.sh

echo "--- Nginx (se permessi sudo) ---"
if bash scripts/apply-nginx-config.sh; then
  echo "[nginx] CSP allineata"
else
  echo "[nginx] Salta o configura manualmente — vedi scripts/apply-nginx-config.sh"
fi

echo "=== Completato ==="
echo "Prossimi passi manuali:"
echo "  1. bash scripts/generate-secrets.sh  → aggiorna .env (VERBATEL_API_KEY, HCAPTCHA)"
echo "  2. docker compose up -d --build portale-caserma"
echo "  3. Test restore: docs/BACKUP_RESTORE.md"
