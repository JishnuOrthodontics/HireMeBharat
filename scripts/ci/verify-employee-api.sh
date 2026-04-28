#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-}"
ID_TOKEN="${ID_TOKEN:-}"

if [[ -z "$API_URL" || -z "$ID_TOKEN" ]]; then
  echo "Usage: API_URL=https://api.hiremebharat.com ID_TOKEN=<firebase-id-token> bash scripts/ci/verify-employee-api.sh" >&2
  exit 1
fi

AUTH_HEADER="Authorization: Bearer ${ID_TOKEN}"
ALT_AUTH_HEADER="X-Firebase-Authorization: Bearer ${ID_TOKEN}"

echo "Checking /api/employee/profile..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employee/profile" >/tmp/employee_profile.json

echo "Checking /api/employee/matches..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employee/matches?status=ALL&limit=5" >/tmp/employee_matches.json

echo "Checking /api/employee/concierge/messages..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employee/concierge/messages" >/tmp/employee_messages.json

echo "Checking /api/employee/notifications..."
curl -sfS --max-time 15 \
  -H "$AUTH_HEADER" -H "$ALT_AUTH_HEADER" \
  "${API_URL%/}/api/employee/notifications" >/tmp/employee_notifications.json

echo "OK: employee APIs reachable and authenticated."

