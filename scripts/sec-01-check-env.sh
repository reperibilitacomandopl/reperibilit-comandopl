#!/usr/bin/env bash
# SEC-01: verifica presenza segreti obbligatori (NON ruota — solo audit)
set -euo pipefail

ENV_FILE="${1:-/home/ubuntu/app/.env}"
MISSING=0

require_var() {
  local name="$1"
  if ! grep -q "^${name}=" "${ENV_FILE}" 2>/dev/null; then
    echo "[SEC-01] MANCA: ${name}" >&2
    MISSING=1
    return
  fi
  local val
  val="$(grep "^${name}=" "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"
  if [[ -z "${val}" || "${val}" == *"CHANGE_ME"* || "${val}" == *"genera-"* ]]; then
    echo "[SEC-01] PLACEHOLDER: ${name} — impostare valore reale" >&2
    MISSING=1
  else
    echo "[SEC-01] OK ${name}"
  fi
}

[[ -f "${ENV_FILE}" ]] || { echo "[SEC-01] File non trovato: ${ENV_FILE}" >&2; exit 1; }

require_var "AUTH_SECRET"
require_var "NEXTAUTH_SECRET"
require_var "CRON_SECRET"
require_var "HCAPTCHA_SECRET_KEY"
require_var "NEXT_PUBLIC_HCAPTCHA_SITE_KEY"
require_var "VERBATEL_API_KEY"
require_var "STORAGE_SIGNING_SECRET"
require_var "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
require_var "VAPID_PRIVATE_KEY"
require_var "POSTGRES_PASSWORD"

if [[ "${MISSING}" -eq 1 ]]; then
  echo "[SEC-01] Correggere .env prima del go-live. Vedi docs/SEC-01_ROTazione_Segreti.md" >&2
  exit 1
fi

echo "[SEC-01] Tutti i segreti obbligatori sono presenti."
