#!/usr/bin/env bash
# Called from GitHub Actions after deploy. Requires PUBLIC_API_URL (repo variable or secret).
# Example: PUBLIC_API_URL=https://api.hiremebharat.com
set -euo pipefail
API="${PUBLIC_API_URL:-}"
if [[ -z "${API}" ]]; then
  echo "::notice::Set repository variable PUBLIC_API_URL (or secret) to your public API base, e.g. https://api.hiremebharat.com — skipping public HTTPS check."
  exit 0
fi
BASE="${API%/}"
echo "GET ${BASE}/api/health"
curl -sfS --max-time 30 "${BASE}/api/health"
echo ""
echo "OK: public API reachable at ${BASE}"
