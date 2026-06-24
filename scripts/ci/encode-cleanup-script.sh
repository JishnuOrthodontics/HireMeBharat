#!/usr/bin/env bash
# Encode scripts for SSH delivery to a full VM (no SCP). Writes GITHUB_OUTPUT keys:
#   bootstrap_b64, cleanup_b64
set -euo pipefail

write_b64_output() {
  local key="$1"
  local file="$2"
  {
    echo "${key}<<EOF"
    base64 -w0 "${file}"
    echo
    echo 'EOF'
  } >> "${GITHUB_OUTPUT}"
}

write_b64_output bootstrap_b64 scripts/ci/vm-emergency-disk-bootstrap.sh
write_b64_output cleanup_b64 scripts/ci/cleanup-vm-docker.sh
