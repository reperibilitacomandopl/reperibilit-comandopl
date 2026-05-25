#!/usr/bin/env bash
# Installa job cron Sentinel da scripts/crontab.txt in /etc/cron.d/sentinel
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/app}"
CRON_SRC="${APP_DIR}/scripts/crontab.txt"
CRON_DEST="/etc/cron.d/sentinel"

if [[ ! -f "${CRON_SRC}" ]]; then
  echo "[install-cron] File non trovato: ${CRON_SRC}" >&2
  exit 1
fi

mkdir -p /home/ubuntu/backups

{
  echo "SHELL=/bin/bash"
  echo "PATH=/usr/local/bin:/usr/bin:/bin"
  grep -E '^[0-9*]' "${CRON_SRC}"
} | sudo tee "${CRON_DEST}" >/dev/null

sudo chmod 644 "${CRON_DEST}"
echo "[install-cron] Installato ${CRON_DEST} ($(wc -l < "${CRON_DEST}") righe)"
