#!/usr/bin/env bash
# Emergency disk recovery on the GCP VM. Safe to run when root filesystem is 100% full.
set -u

COMPOSE_DIR="${COMPOSE_DIR:-/opt/hiremebharat}"
REGISTRY_DIR="${COMPOSE_DIR}/registry-data"

root_avail_kb() {
  df / 2>/dev/null | awk 'NR==2 {print $4}'
}

disk_critical() {
  local avail_kb
  avail_kb="$(root_avail_kb)"
  [ -z "${avail_kb}" ] && return 1
  [ "${avail_kb}" -lt 512000 ]
}

report_disk() {
  echo "=== Disk usage ==="
  df -h / 2>/dev/null || df -h || true
  docker system df 2>/dev/null || true
  if [ -d "${REGISTRY_DIR}" ]; then
    du -sh "${REGISTRY_DIR}" 2>/dev/null || true
  fi
}

truncate_docker_logs() {
  find /var/lib/docker/containers -name '*-json.log' -size +1M 2>/dev/null \
    | while read -r f; do truncate -s 0 "$f" 2>/dev/null || true; done
}

wipe_registry_storage() {
  echo "CRITICAL: wiping private registry storage (CI will re-push images on next deploy)..."
  if [ -f "${COMPOSE_DIR}/docker-compose.prod.yml" ]; then
    (cd "${COMPOSE_DIR}" && docker compose -f docker-compose.prod.yml stop registry) 2>/dev/null || true
  fi
  if [ -d "${REGISTRY_DIR}" ]; then
    du -sh "${REGISTRY_DIR}" 2>/dev/null || true
    find "${REGISTRY_DIR}" -mindepth 1 -delete 2>/dev/null \
      || rm -rf "${REGISTRY_DIR:?}"/* 2>/dev/null \
      || true
    mkdir -p "${REGISTRY_DIR}"
  fi
  docker volume prune -f 2>/dev/null || true
  if [ -f "${COMPOSE_DIR}/docker-compose.prod.yml" ]; then
    (cd "${COMPOSE_DIR}" && docker compose -f docker-compose.prod.yml up -d registry) 2>/dev/null || true
  fi
}

purge_registry_tag() {
  local repo="$1"
  local tag="$2"
  local digest
  digest="$(curl -fsS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" -I \
    -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
    "http://127.0.0.1:5000/v2/${repo}/manifests/${tag}" 2>/dev/null \
    | awk -F': ' '/Docker-Content-Digest/{print $2}' | tr -d '\r')" || true
  if [ -n "${digest}" ]; then
    curl -fsS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" -X DELETE \
      "http://127.0.0.1:5000/v2/${repo}/manifests/${digest}" >/dev/null 2>&1 || true
    echo "  purged ${repo}:${tag}"
  fi
}

purge_registry_cache_and_old_tags() {
  local env_file="${COMPOSE_DIR}/.env"
  curl -fsS --max-time 3 http://127.0.0.1:5000/v2/ >/dev/null 2>&1 || return 0
  [ -f "${env_file}" ] || return 0
  REGISTRY_USER="$(grep -E '^REGISTRY_USER=' "${env_file}" | cut -d= -f2- || true)"
  REGISTRY_PASSWORD="$(grep -E '^REGISTRY_PASSWORD=' "${env_file}" | cut -d= -f2- || true)"
  [ -n "${REGISTRY_USER}" ] && [ -n "${REGISTRY_PASSWORD}" ] || return 0

  echo "Purging registry cache tags and old deploy SHAs via API..."
  local catalog repos repo tags_json tag
  catalog="$(curl -fsS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
    "http://127.0.0.1:5000/v2/_catalog?n=1000" 2>/dev/null || echo '{}')"
  repos="$(printf '%s' "${catalog}" | python3 -c \
    'import json,sys; print(" ".join(r for r in (json.load(sys.stdin).get("repositories") or []) if r.startswith("hiremebharat-")))')" || true
  for repo in ${repos}; do
    tags_json="$(curl -fsS -u "${REGISTRY_USER}:${REGISTRY_PASSWORD}" \
      "http://127.0.0.1:5000/v2/${repo}/tags/list" 2>/dev/null || echo '{}')"
    while IFS= read -r tag; do
      [ -n "${tag}" ] || continue
      if [ "${tag}" = "cache" ]; then
        purge_registry_tag "${repo}" "${tag}"
        continue
      fi
      if [ "${tag}" != "latest" ] && [ ${#tag} -eq 40 ]; then
        if grep -q "${repo}:${tag}" "${COMPOSE_DIR}/docker-compose.prod.yml" 2>/dev/null; then
          continue
        fi
        purge_registry_tag "${repo}" "${tag}"
      fi
    done < <(printf '%s' "${tags_json}" | python3 -c \
      'import json,sys; print("\n".join(json.load(sys.stdin).get("tags") or []))')
  done

  if [ -f "${COMPOSE_DIR}/docker-compose.prod.yml" ]; then
    (cd "${COMPOSE_DIR}" && docker compose -f docker-compose.prod.yml exec -T registry \
      bin/registry garbage-collect /etc/docker/registry/config.yml) 2>/dev/null || true
  fi
}

echo "=== Emergency VM disk bootstrap ==="
report_disk

journalctl --vacuum-size=30M 2>/dev/null || true
apt-get clean 2>/dev/null || true
rm -rf /tmp/* /var/tmp/* 2>/dev/null || true
truncate_docker_logs

docker builder prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker system prune -af 2>/dev/null || true

purge_registry_cache_and_old_tags

docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true

if disk_critical; then
  wipe_registry_storage
fi

report_disk
echo "=== Emergency bootstrap complete (avail=$(root_avail_kb)KB) ==="
