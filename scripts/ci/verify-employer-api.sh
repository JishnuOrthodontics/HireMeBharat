#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-}"
ID_TOKEN="${ID_TOKEN:-}"

if [[ -z "$API_URL" || -z "$ID_TOKEN" ]]; then
  echo "Usage: API_URL=https://api.hiremebharat.com ID_TOKEN=<firebase-id-token> bash scripts/ci/verify-employer-api.sh" >&2
  exit 1
fi

AUTH_HEADER="Authorization: Bearer ${ID_TOKEN}"
ALT_AUTH_HEADER="X-Firebase-Authorization: Bearer ${ID_TOKEN}"

echo "Checking /api/employer/profile..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employer/profile" >/tmp/employer_profile.json

echo "Checking /api/employer/requisitions..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employer/requisitions?status=ALL&limit=5" >/tmp/employer_requisitions.json

echo "Checking /api/employer/candidates..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employer/candidates?stage=ALL&limit=5" >/tmp/employer_candidates.json

echo "Checking /api/employer/matches..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employer/matches" >/tmp/employer_matches.json

echo "Checking /api/employer/dashboard-summary..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employer/dashboard-summary" >/tmp/employer_summary.json

echo "OK: employer APIs reachable and authenticated."
