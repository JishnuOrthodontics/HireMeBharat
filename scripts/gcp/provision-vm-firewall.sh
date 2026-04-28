#!/usr/bin/env bash
# Provision firewall rules for HireMeBharat VM: SSH (22) and Docker registry push (5000).
# GitHub-hosted runners need HTTPS/registry push to VM:5000 from changing IPs — open 5000 with strong registry auth.
#
# Usage:
#   export GCP_PROJECT_ID=your-project-id
#   export GCP_NETWORK=default          # VPC name
#   ./provision-vm-firewall.sh
#
# Optional: tag-based targeting (replace --source-ranges with your bastion / IAP later):
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-}"
NETWORK="${GCP_NETWORK:-default}"

if [[ -z "$PROJECT" ]]; then
  echo "Set GCP_PROJECT_ID." >&2
  exit 1
fi

gcloud config set project "$PROJECT" >/dev/null

RULE_SSH="hiremebharat-allow-ssh"
RULE_REG="hiremebharat-allow-registry-5000"

if gcloud compute firewall-rules describe "$RULE_SSH" --project="$PROJECT" >/dev/null 2>&1; then
  echo "Firewall rule $RULE_SSH already exists."
else
  echo "Creating $RULE_SSH (tcp:22 from 0.0.0.0/0 — restrict in production if possible)..."
  gcloud compute firewall-rules create "$RULE_SSH" \
    --project="$PROJECT" \
    --network="$NETWORK" \
    --allow=tcp:22 \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=0.0.0.0/0 \
    --description="SSH for HireMeBharat VM / CI deploy"
fi

if gcloud compute firewall-rules describe "$RULE_REG" --project="$PROJECT" >/dev/null 2>&1; then
  echo "Firewall rule $RULE_REG already exists."
else
  echo "Creating $RULE_REG (tcp:5000 for Docker registry push from CI)..."
  gcloud compute firewall-rules create "$RULE_REG" \
    --project="$PROJECT" \
    --network="$NETWORK" \
    --allow=tcp:5000 \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges=0.0.0.0/0 \
    --description="Docker registry on VM :5000 for GitHub Actions push"
fi

echo ""
echo "Create the VM in Console or use gcloud compute instances create, then:"
echo "  1. Reserve or use ephemeral external IP → set GitHub secret GCP_VM_IP"
echo "  2. Add deploy SSH public key to ~/.ssh/authorized_keys on the VM"
echo "  3. Run scripts/vm-bootstrap.sh on the VM"
echo "  4. GitHub Actions → workflow_dispatch → Build and Deploy Backend (full-stack)"

