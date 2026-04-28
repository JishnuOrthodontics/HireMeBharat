#!/usr/bin/env bash
# Phase 3 ? First boot on a fresh Ubuntu VM: Docker Engine + Compose plugin + deploy directory.
# Run ON THE GCP VM via SSH (not on your laptop).
#
# Usage: curl -fsSL ... | bash   OR   sudo bash vm-bootstrap.sh
set -eu

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with sudo or as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
fi

. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

mkdir -p /opt/hiremebharat
chmod 755 /opt/hiremebharat

echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"
echo "Ready for CI to scp compose + .env and run deploy-full-stack.sh"
echo "Directory created: /opt/hiremebharat"


