#!/usr/bin/env bash
# SEC-01: genera valori casuali per .env (NON scrive automaticamente sul server)
set -euo pipefail

echo "# Valori generati $(date -Iseconds) — copiare in ~/app/.env"
echo "# ATTENZIONE: ruotare AUTH_SECRET invalida tutte le sessioni attive"
echo ""
echo "AUTH_SECRET=$(openssl rand -base64 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "CRON_SECRET=$(openssl rand -hex 32)"
echo "VERBATEL_API_KEY=$(openssl rand -hex 32)"
echo "STORAGE_SIGNING_SECRET=$(openssl rand -hex 32)"
echo ""
echo "# POSTGRES_PASSWORD: ruotare solo con ALTER USER + aggiornamento DATABASE_URL"
echo "# HCAPTCHA_SECRET_KEY: dalla dashboard hCaptcha"
echo "# NEXT_PUBLIC_HCAPTCHA_SITE_KEY: site key pubblica"
