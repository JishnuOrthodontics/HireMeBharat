#!/usr/bin/env bash
# After workflow_dispatch "Build and Deploy Backend" completes, verify from your machine.
# Usage: API_URL=https://api.example.com ./verify-deployment.sh
set -euo pipefail
API_URL="${API_URL:-}"
if [[ -z "$API_URL" ]]; then
  echo "Set API_URL to your public API base, e.g.:" >&2
  echo "  API_URL=https://api.hiremebharat.com bash scripts/verify-deployment.sh" >&2
  exit 1
fi

curl -sfS --max-time 15 "${API_URL%/}/api/health" && echo "" && echo "OK: gateway health"

