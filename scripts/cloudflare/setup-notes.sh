#!/usr/bin/env bash
# Cloudflare + GCP VM API (Nginx reverse proxy to Docker gateway on :3001).
# Run: bash setup-notes.sh
set -euo pipefail
cat <<'EOF'
Cloudflare checklist (API on GCP VM)

1) DNS (zone hiremebharat.com)
   - api → A record to your VM public IP, Proxied (orange cloud).

2) SSL/TLS → Overview
   - Use Full with the self-signed cert from scripts/gcp/install-nginx-api-proxy.sh,
     or Full (strict) if you install a Cloudflare Origin Certificate / Let’s Encrypt on Nginx.

3) Nginx on the VM (public HTTPS → http://127.0.0.1:3001)
   - See scripts/gcp/install-nginx-api-proxy.sh and nginx-api-hiremebharat.conf.

4) Pages (frontend CI uses cloudflare/pages-action)
   - Secrets: CLOUDFLARE_API_TOKEN (Pages:Edit), CLOUDFLARE_ACCOUNT_ID
   - VITE_API_URL must match the public API URL (https://api...).

5) Firebase authorized domains
   - Add your Pages domain and API hostname as needed.

EOF
