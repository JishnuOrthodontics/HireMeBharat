#!/usr/bin/env bash
# Broader GCP cleanup (same project): VMs, orphaned disks, unused static IPs.
# Requires: gcloud CLI authenticated (gcloud auth login && gcloud config set project PROJECT_ID)
#
# Usage:
#   export GCP_PROJECT_ID=your-project-id
#   ./teardown.sh              # dry-run: print what would be affected
#   ./teardown.sh --execute    # interactive deletes (you confirm each step)
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-}"
if [[ -z "$PROJECT" ]]; then
  echo "Set GCP_PROJECT_ID to your Google Cloud project ID." >&2
  exit 1
fi

gcloud config set project "$PROJECT" >/dev/null
EXECUTE=false
[[ "${1:-}" == "--execute" ]] && EXECUTE=true

echo "=== Project: $PROJECT (execute=$EXECUTE) ==="

echo "--- Compute Engine instances ---"
gcloud compute instances list --project="$PROJECT" --format='table(name,zone,status,networkInterfaces[0].accessConfigs[0].natIP:label=EXTERNAL_IP)' || true

echo "--- Disks (possibly orphaned if not attached) ---"
gcloud compute disks list --project="$PROJECT" --format='table(name,zone,sizeGb,users)' || true

echo "--- External IP addresses ---"
gcloud compute addresses list --project="$PROJECT" --format='table(name,region,address,status,users)' 2>/dev/null || \
  gcloud compute addresses list --global --project="$PROJECT" --format='table(name,address,status,users)' || true

if [[ "$EXECUTE" != true ]]; then
  echo ""
  echo "Dry-run only. To delete resources, review GCP Console or run:"
  echo "  gcloud compute instances delete INSTANCE --zone=ZONE --project=$PROJECT"
  echo "  gcloud compute disks delete DISK --zone=ZONE --project=$PROJECT"
  echo "  gcloud compute addresses delete NAME --region=REGION --project=$PROJECT"
  echo ""
  echo "Or re-run with --execute for guided prompts (instances only)."
  exit 0
fi

read -r -p "Delete ALL instances listed above? Type DELETE to confirm: " ans
if [[ "$ans" != "DELETE" ]]; then
  echo "Aborted."
  exit 1
fi

while IFS=, read -r name zone; do
  [[ -z "$name" ]] && continue
  zone_short=$(basename "$zone")
  echo "Deleting instance $name in $zone_short ..."
  gcloud compute instances delete "$name" --zone="$zone_short" --quiet --project="$PROJECT"
done < <(gcloud compute instances list --project="$PROJECT" --format='csv[no-heading](name,zone)')

echo "Done. Manually delete orphaned disks and release static IPs if needed (Console or gcloud)."

