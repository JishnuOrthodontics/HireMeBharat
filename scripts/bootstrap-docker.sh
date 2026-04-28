#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with sudo or as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# Install Docker using the convenience script
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh

# Install Docker Compose plugin
apt-get update -y
apt-get install -y docker-compose-plugin

# Start and enable Docker
systemctl enable --now docker

# Create deploy directory
mkdir -p /opt/hiremebharat
chmod 755 /opt/hiremebharat

echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"
echo "Ready for CI to scp compose + .env and run deploy-full-stack.sh"
echo "Directory created: /opt/hiremebharat"
