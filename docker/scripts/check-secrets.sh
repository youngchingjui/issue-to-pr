#!/bin/sh

set -e

SECRETS_FILE="/etc/letsencrypt/secrets/porkbun.ini"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "[ERROR] Missing secret: $SECRETS_FILE"
  echo "Fix: copy secrets/porkbun.ini.example from the repo and place the real values into $SECRETS_FILE on the server."
  echo "Ensure the directory exists: sudo mkdir -p /etc/letsencrypt/secrets"
  echo "Permissions: sudo chmod 700 /etc/letsencrypt/secrets && sudo chmod 600 $SECRETS_FILE"
  exit 1
fi

if [ ! -r "$SECRETS_FILE" ]; then
  echo "[ERROR] Secret file is not readable: $SECRETS_FILE"
  echo "Fix: sudo chmod 600 $SECRETS_FILE (on host)."
  exit 1
fi

API_KEY=$(awk -F'=' '/^\s*dns_porkbun_key\s*=/{gsub(/^\s+|\s+$/, "", $2); print $2}' "$SECRETS_FILE")
SECRET_KEY=$(awk -F'=' '/^\s*dns_porkbun_secret\s*=/{gsub(/^\s+|\s+$/, "", $2); print $2}' "$SECRETS_FILE")

if [ -z "$API_KEY" ] || [ -z "$SECRET_KEY" ]; then
  echo "[ERROR] Missing required keys in $SECRETS_FILE"
  echo "Expected lines:"
  echo "  dns_porkbun_key = <PORKBUN_API_KEY>"
  echo "  dns_porkbun_secret = <PORKBUN_SECRET_API_KEY>"
  exit 1
fi

echo "[OK] Porkbun secrets found and look valid."

# If args are passed, run certbot with them; otherwise print help
if [ "$#" -gt 0 ]; then
  exec certbot "$@"
else
  echo "Provide certbot args, e.g.:"
  echo "  docker compose run --rm certbot certonly --agree-tos -m support@youngandai.com --no-eff-email \\\n  --dns-porkbun --dns-porkbun-credentials /etc/letsencrypt/secrets/porkbun.ini -d youngandai.com -d '*.youngandai.com'"
fi

