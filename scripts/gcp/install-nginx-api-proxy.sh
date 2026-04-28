#!/usr/bin/env bash
# Install Nginx on the GCP VM and proxy https://api.hiremebharat.com → http://127.0.0.1:3001
# Run ON THE VM with sudo (after Docker stack is running).
#
# TLS default: generates a self-signed cert (SAN api.hiremebharat.com). In Cloudflare set
# SSL/TLS → Overview → Full (not Full Strict). For Full Strict, replace cert/key with a
# Cloudflare Origin Certificate or Let’s Encrypt and reload nginx.
#
# Optional env:
#   SKIP_SELF_SIGNED=1     Do not generate cert; you must place api.crt + api.key first.
#   CERT_DAYS=825          Self-signed validity (default 825).

set -euo pipefail

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx openssl

install -d -m 0755 /etc/ssl/hiremebharat
install -d -m 0755 /var/www/certbot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_SRC="${SCRIPT_DIR}/nginx-api-hiremebharat.conf"
if [[ ! -f "${CONF_SRC}" ]]; then
  echo "Missing ${CONF_SRC} (copy scripts/gcp/ onto the VM together)." >&2
  exit 1
fi

install -m 0644 "${CONF_SRC}" /etc/nginx/sites-available/hireme-api
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/hireme-api /etc/nginx/sites-enabled/hireme-api

CERT_DAYS="${CERT_DAYS:-825}"
if [[ "${SKIP_SELF_SIGNED:-}" != "1" ]]; then
  if [[ ! -f /etc/ssl/hiremebharat/api.crt ]] || [[ ! -f /etc/ssl/hiremebharat/api.key ]]; then
    TMPDIR="$(mktemp -d)"
    openssl genrsa -out "${TMPDIR}/api.key" 2048
    openssl req -new -key "${TMPDIR}/api.key" -out "${TMPDIR}/req.csr" \
      -subj "/CN=api.hiremebharat.com"
    cat > "${TMPDIR}/ext.cnf" <<'EOF'
basicConstraints = CA:FALSE
subjectAltName = @san
[san]
DNS.1 = api.hiremebharat.com
EOF
    openssl x509 -req -days "${CERT_DAYS}" \
      -in "${TMPDIR}/req.csr" \
      -signkey "${TMPDIR}/api.key" \
      -out "${TMPDIR}/api.crt" \
      -extfile "${TMPDIR}/ext.cnf"
    install -m 0644 "${TMPDIR}/api.crt" /etc/ssl/hiremebharat/api.crt
    install -m 0600 "${TMPDIR}/api.key" /etc/ssl/hiremebharat/api.key
    rm -rf "${TMPDIR}"
    echo "Installed self-signed TLS cert for api.hiremebharat.com → use Cloudflare SSL mode Full."
  fi
else
  if [[ ! -f /etc/ssl/hiremebharat/api.crt ]] || [[ ! -f /etc/ssl/hiremebharat/api.key ]]; then
    echo "SKIP_SELF_SIGNED=1 but /etc/ssl/hiremebharat/api.crt or .key missing." >&2
    exit 1
  fi
fi

nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

echo "Nginx listening on :80 (redirect) and :443 → 127.0.0.1:3001"
curl -sfS --max-time 5 http://127.0.0.1:3001/api/health >/dev/null && echo "Upstream gateway OK on :3001"
curl -skSf --max-time 5 https://127.0.0.1/api/health && echo ""
