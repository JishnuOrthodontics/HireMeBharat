#!/usr/bin/env bash
# Decrypt GCP_VM_SSH_KEY for appleboy SSH/SCP actions. Writes .ci_deploy_key in GITHUB_WORKSPACE.
set -euo pipefail

KEYFILE="${GITHUB_WORKSPACE}/.ci_deploy_key"
umask 077
printf '%s\n' "${SSH_KEY}" > "${KEYFILE}"

if ssh-keygen -y -f "${KEYFILE}" -P '' >/dev/null 2>&1; then
  echo "SSH deploy key has no passphrase"
else
  if [ -z "${SSH_PASS:-}" ]; then
    echo "::error::GCP_VM_SSH_KEY is passphrase-protected. Add repository secret GCP_VM_SSH_KEY_PASSPHRASE, or replace GCP_VM_SSH_KEY with an unencrypted deploy key."
    exit 1
  fi
  if ! ssh-keygen -p -f "${KEYFILE}" -P "${SSH_PASS}" -N ''; then
    echo "::error::Could not unlock GCP_VM_SSH_KEY (wrong GCP_VM_SSH_KEY_PASSPHRASE?)"
    exit 1
  fi
fi
