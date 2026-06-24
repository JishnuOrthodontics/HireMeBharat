#!/usr/bin/env bash
# Write base64-encoded cleanup-vm-docker.sh to GITHUB_OUTPUT (payload).
set -euo pipefail

SCRIPT_PATH="${1:-scripts/ci/cleanup-vm-docker.sh}"
{
  echo 'payload<<EOF'
  base64 -w0 "${SCRIPT_PATH}"
  echo
  echo 'EOF'
} >> "${GITHUB_OUTPUT}"
