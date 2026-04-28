#!/usr/bin/env bash
# Bootstrap script for Debian VM: Docker Engine + Compose plugin + deploy directory.
# Run ON THE GCP VM via SSH (not on your laptop).
set -euo pipefail

if [[ "${EUID:-}" -ne 0 ]]; then
  echo "Run with sudo or as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release

# Create keyrings directory
install -m 0755 -d /etc/apt/keyrings

# Download Docker's official GPG key and store in keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker service
systemctl enable --now docker

# Create deploy directory
mkdir -p /opt/hiremebharat
chmod 755 /opt/hiremebharat

echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"
echo "Ready for CI to scp compose + .env and run deploy-full-stack.sh"
echo "Directory created: /opt/hiremebharat"
