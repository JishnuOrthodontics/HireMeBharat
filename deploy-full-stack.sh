#!/bin/bash
# Deploy all backend images with a single tag and start the full compose stack.
# Usage: ./deploy-full-stack.sh <image-tag>   (e.g. git SHA from CI)
set -euo pipefail

TAG="${1:?Usage: deploy-full-stack.sh <image-tag>}"
REG="localhost:5000"
DIR="/opt/hiremebharat"

cd "$DIR"

# If a registry is already serving :5000, keep it (images were pushed there from CI).
# Replacing it with a new compose-bound volume would lose those layers.
APP_SERVICES="api-gateway api-auth api-employee api-employer api-admin"
if curl -sfS --max-time 3 "http://127.0.0.1:5000/v2/" >/dev/null 2>&1; then
  COMPOSE_TARGETS="${APP_SERVICES}"
else
  COMPOSE_TARGETS=""
fi

for svc in api-gateway api-auth api-employee api-employer api-admin; do
  sed -i "s|image: .*hiremebharat-${svc}:.*|image: ${REG}/hiremebharat-${svc}:${TAG}|g" docker-compose.prod.yml
done

# Authenticate to local registry when compose uses htpasswd (values come from .env).
if [ -f .env ]; then
  RU=$(grep -E '^REGISTRY_USER=' .env | cut -d= -f2- || true)
  RP=$(grep -E '^REGISTRY_PASSWORD=' .env | cut -d= -f2- || true)
  if [ -n "${RU}" ] && [ -n "${RP}" ]; then
    echo "${RP}" | docker login "${REG}" -u "${RU}" --password-stdin
  fi
fi

# Free space before pulling large layers (BuildKit cache can exhaust small VM disks).
echo "Pre-deploy disk usage:"
df -h || true
docker builder prune -af || true
docker image prune -af || true
docker container prune -f || true
docker volume prune -f || true

if [ -n "${COMPOSE_TARGETS}" ]; then
  # shellcheck disable=SC2086
  docker compose -f docker-compose.prod.yml pull ${COMPOSE_TARGETS}
  # shellcheck disable=SC2086
  docker compose -f docker-compose.prod.yml up -d ${COMPOSE_TARGETS}
else
  docker compose -f docker-compose.prod.yml pull
  docker compose -f docker-compose.prod.yml up -d
fi

# Post-deploy cleanup
docker image prune -af || true
docker builder prune -af || true

echo "Post-deploy disk usage:"
df -h || true

echo "Full stack deployed with tag ${TAG}."


