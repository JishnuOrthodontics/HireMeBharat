#!/bin/bash
# Deploy all backend images with a single tag and start the full compose stack.
# Usage: ./deploy-full-stack.sh <image-tag>   (e.g. git SHA from CI)
set -euo pipefail

TAG="${1:?Usage: deploy-full-stack.sh <image-tag>}"
REG="localhost:5000"
DIR="/opt/hiremebharat"

cd "$DIR"

# Release port 5000 from any old one-off registry container so compose can bind it.
for id in $(docker ps -aq --filter "publish=5000" 2>/dev/null || true); do
  docker stop "$id" 2>/dev/null || true
  docker rm "$id" 2>/dev/null || true
done

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

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f

echo "Full stack deployed with tag ${TAG}."
