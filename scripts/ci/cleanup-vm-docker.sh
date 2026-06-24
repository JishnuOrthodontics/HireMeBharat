#!/usr/bin/env bash
# Free disk on the GCP backend VM: Docker cache/images + old private-registry tags.
#
# Env:
#   CLEANUP_MODE=light|standard|aggressive  (default: standard)
#   KEEP_REGISTRY_TAGS=6
#   COMPOSE_DIR=/opt/hiremebharat
set -uo pipefail

CLEANUP_MODE="${CLEANUP_MODE:-standard}"
KEEP_REGISTRY_TAGS="${KEEP_REGISTRY_TAGS:-6}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/hiremebharat}"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.prod.yml"
REGISTRY="http://127.0.0.1:5000"
REGISTRY_DIR="${COMPOSE_DIR}/registry-data"

root_avail_kb() {
  df / 2>/dev/null | awk 'NR==2 {print $4}'
}

disk_critical() {
  local avail_kb
  avail_kb="$(root_avail_kb)"
  [ -n "${avail_kb}" ] && [ "${avail_kb}" -lt 512000 ]
}

report_disk() {
  echo "=== Disk usage ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ==="
  df -h / 2>/dev/null || df -h || true
  docker system df 2>/dev/null || true
  if [ -d "${REGISTRY_DIR}" ]; then
    du -sh "${REGISTRY_DIR}" 2>/dev/null || true
  fi
}

registry_auth() {
  local env_file="${COMPOSE_DIR}/.env"
  if [ ! -f "${env_file}" ]; then
    return 1
  fi
  REGISTRY_USER="$(grep -E '^REGISTRY_USER=' "${env_file}" | cut -d= -f2- || true)"
  REGISTRY_PASSWORD="$(grep -E '^REGISTRY_PASSWORD=' "${env_file}" | cut -d= -f2- || true)"
  [ -n "${REGISTRY_USER}" ] && [ -n "${REGISTRY_PASSWORD}" ]
}

manifest_last_modified() {
  local repo="$1"
  local tag="$2"
  curl -sfS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" -I \
    -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
    "${REGISTRY}/v2/${repo}/manifests/${tag}" 2>/dev/null \
    | awk -F': ' 'tolower($1)=="last-modified"{print $2}' | tr -d '\r'
}

delete_registry_tag() {
  local repo="$1"
  local tag="$2"
  local digest
  digest="$(curl -sfS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" -I \
    -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
    "${REGISTRY}/v2/${repo}/manifests/${tag}" 2>/dev/null \
    | awk -F': ' '/Docker-Content-Digest/{print $2}' | tr -d '\r')" || true
  if [ -n "${digest}" ]; then
    curl -sfS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" -X DELETE \
      "${REGISTRY}/v2/${repo}/manifests/${digest}" >/dev/null 2>&1 || true
    echo "  deleted ${repo}:${tag}"
  fi
}

json_tags() {
  python3 -c 'import json,sys; print("\n".join(json.load(sys.stdin).get("tags") or []))'
}

json_repos() {
  python3 -c 'import json,sys; print("\n".join(r for r in (json.load(sys.stdin).get("repositories") or []) if r.startswith("hiremebharat-")))'
}

is_protected_tag() {
  local repo="$1"
  local tag="$2"
  if [ "${tag}" = "latest" ]; then
    return 0
  fi
  if [ -f "${COMPOSE_FILE}" ] && grep -q "${repo}:${tag}" "${COMPOSE_FILE}"; then
    return 0
  fi
  return 1
}

prune_registry_repo() {
  local repo="$1"
  local tags_json
  tags_json="$(curl -sfS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
    "${REGISTRY}/v2/${repo}/tags/list" 2>/dev/null || echo '{}')"

  mapfile -t all_tags < <(printf '%s' "${tags_json}" | json_tags)
  if [ "${#all_tags[@]}" -eq 0 ]; then
    return 0
  fi

  local candidates=()
  local tag
  for tag in "${all_tags[@]}"; do
    if ! is_protected_tag "${repo}" "${tag}"; then
      candidates+=("${tag}")
    fi
  done

  local count="${#candidates[@]}"
  if [ "${count}" -eq 0 ]; then
    return 0
  fi

  # On a full disk, skip sorting/temp files and delete all non-protected tags.
  if disk_critical || [ "${count}" -le "${KEEP_REGISTRY_TAGS}" ]; then
    if disk_critical; then
      echo "Disk critical: purging all ${count} non-protected tag(s) from ${repo}..."
      for tag in "${candidates[@]}"; do
        delete_registry_tag "${repo}" "${tag}"
      done
    fi
    return 0
  fi

  local to_delete=$((count - KEEP_REGISTRY_TAGS))
  echo "Pruning ${to_delete} old tag(s) from ${repo} (keeping ${KEEP_REGISTRY_TAGS} + protected)..."

  local tmp_base="/dev/shm"
  [ -w "${tmp_base}" ] || tmp_base="${TMPDIR:-/tmp}"
  local sorted_file=""
  if sorted_file="$(mktemp "${tmp_base}/cleanup.XXXXXX" 2>/dev/null)" && : >"${sorted_file}" 2>/dev/null; then
    for tag in "${candidates[@]}"; do
      local ts
      ts="$(manifest_last_modified "${repo}" "${tag}" || true)"
      [ -n "${ts}" ] || ts="1970-01-01T00:00:00Z"
      printf '%s\t%s\n' "${ts}" "${tag}" >> "${sorted_file}" 2>/dev/null || sorted_file=""
      if [ -z "${sorted_file}" ] || [ ! -s "${sorted_file}" ]; then
        break
      fi
    done
  else
    sorted_file=""
  fi

  if [ -n "${sorted_file}" ] && [ -s "${sorted_file}" ]; then
    sort -k1,1 "${sorted_file}" 2>/dev/null | head -n "${to_delete}" | cut -f2 | while IFS= read -r tag; do
      [ -n "${tag}" ] && delete_registry_tag "${repo}" "${tag}"
    done
    rm -f "${sorted_file}" 2>/dev/null || true
  else
    echo "  temp sort unavailable; deleting oldest candidates without ordering..."
    local i=0
    for tag in "${candidates[@]}"; do
      [ "${i}" -ge "${to_delete}" ] && break
      delete_registry_tag "${repo}" "${tag}"
      i=$((i + 1))
    done
  fi
}

wipe_registry_storage() {
  echo "CRITICAL: wiping private registry storage at ${REGISTRY_DIR}..."
  if [ -f "${COMPOSE_FILE}" ]; then
    (cd "${COMPOSE_DIR}" && docker compose -f docker-compose.prod.yml stop registry) 2>/dev/null || true
  fi
  if [ -d "${REGISTRY_DIR}" ]; then
    find "${REGISTRY_DIR}" -mindepth 1 -delete 2>/dev/null \
      || rm -rf "${REGISTRY_DIR:?}"/* 2>/dev/null \
      || true
    mkdir -p "${REGISTRY_DIR}"
  fi
  docker volume prune -f 2>/dev/null || true
  if [ -f "${COMPOSE_FILE}" ]; then
    (cd "${COMPOSE_DIR}" && docker compose -f docker-compose.prod.yml up -d registry) 2>/dev/null || true
  fi
}

prune_private_registry() {
  if disk_critical && [ -d "${REGISTRY_DIR}" ]; then
    wipe_registry_storage
    return 0
  fi

  if ! curl -sfS --max-time 3 "${REGISTRY}/v2/" >/dev/null 2>&1; then
    echo "Private registry not reachable; skipping registry tag prune."
    return 0
  fi
  if ! registry_auth; then
    echo "Registry credentials missing in ${COMPOSE_DIR}/.env; skipping registry tag prune."
    return 0
  fi

  local catalog
  catalog="$(curl -sfS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" "${REGISTRY}/v2/_catalog?n=1000" 2>/dev/null || echo '{}')"
  mapfile -t repos < <(printf '%s' "${catalog}" | json_repos)
  if [ "${#repos[@]}" -eq 0 ]; then
    echo "No hiremebharat repositories in registry catalog."
    return 0
  fi

  echo "Pruning old private-registry tags (keep ${KEEP_REGISTRY_TAGS} per repo)..."
  local repo
  for repo in "${repos[@]}"; do
    [ -n "${repo}" ] && prune_registry_repo "${repo}" || true
  done

  if [ -f "${COMPOSE_FILE}" ]; then
    echo "Running registry garbage-collect..."
    (cd "${COMPOSE_DIR}" && docker compose -f docker-compose.prod.yml exec -T registry \
      bin/registry garbage-collect /etc/docker/registry/config.yml) 2>/dev/null || true
  fi

  if disk_critical; then
    wipe_registry_storage
  fi
}

docker_cleanup() {
  echo "Docker cleanup (mode=${CLEANUP_MODE})..."
  docker builder prune -af 2>/dev/null || true
  docker container prune -f 2>/dev/null || true

  case "${CLEANUP_MODE}" in
    light)
      docker image prune -f 2>/dev/null || true
      ;;
    aggressive)
      docker image prune -af 2>/dev/null || true
      docker system prune -af 2>/dev/null || true
      ;;
    *)
      docker image prune -af 2>/dev/null || true
      docker volume prune -f 2>/dev/null || true
      ;;
  esac
}

echo "Starting VM disk cleanup (mode=${CLEANUP_MODE})..."
report_disk
docker_cleanup

if [ "${CLEANUP_MODE}" != "light" ]; then
  prune_private_registry || true
  docker image prune -af 2>/dev/null || true
fi

report_disk
echo "VM disk cleanup complete (avail=$(root_avail_kb)KB)."
