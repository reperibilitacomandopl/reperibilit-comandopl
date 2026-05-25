#!/usr/bin/env bash
# Verifica job cron Sentinel (eseguire sul server dopo source .env)
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/app}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[verify-cron] ERRORE: manca ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${ENV_FILE}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "[verify-cron] ERRORE: CRON_SECRET non impostato in .env" >&2
  exit 1
fi

check_endpoint() {
  local path="$1"
  local code
  code="$(curl -sf -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "${BASE_URL}${path}" || echo "000")"
  if [[ "${code}" == "200" ]]; then
    echo "[verify-cron] OK  ${path} → ${code}"
  else
    echo "[verify-cron] FAIL ${path} → ${code}" >&2
    return 1
  fi
}

echo "[verify-cron] Health..."
curl -sf "${BASE_URL}/api/health" >/dev/null && echo "[verify-cron] OK  /api/health"

check_endpoint "/api/cron/shift-reminder"
check_endpoint "/api/cron/clock-reminder"
check_endpoint "/api/cron/daily-reminder"

echo "[verify-cron] Tutti i controlli principali passati."
