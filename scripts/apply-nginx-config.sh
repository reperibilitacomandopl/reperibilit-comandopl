#!/usr/bin/env bash
# Applica nginx_config.conf dal repo (rimuove CSP permissiva duplicata)
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/app}"
SRC="${APP_DIR}/nginx_config.conf"

if [[ ! -f "${SRC}" ]]; then
  echo "[nginx] nginx_config.conf non trovato in ${APP_DIR}" >&2
  exit 1
fi

TARGET=""
for candidate in \
  "/etc/nginx/sites-available/gestionepolizialocale.it" \
  "/etc/nginx/sites-available/default" \
  "/etc/nginx/conf.d/gestionepolizialocale.conf"
do
  if [[ -f "${candidate}" ]]; then
    TARGET="${candidate}"
    break
  fi
done

if [[ -z "${TARGET}" ]]; then
  echo "[nginx] Nessun virtual host trovato. Copia manuale:" >&2
  echo "  sudo cp ${SRC} /etc/nginx/sites-available/gestionepolizialocale.it" >&2
  echo "  sudo ln -sf /etc/nginx/sites-available/gestionepolizialocale.it /etc/nginx/sites-enabled/" >&2
  exit 1
fi

sudo cp "${TARGET}" "${TARGET}.bak.$(date +%Y%m%d%H%M%S)"
sudo cp "${SRC}" "${TARGET}"
sudo nginx -t
sudo systemctl reload nginx
echo "[nginx] OK — applicato su ${TARGET}"
