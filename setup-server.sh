#!/bin/bash
# Run this ONCE on a fresh Hetzner server to set up prerequisites
# Usage: bash setup-server.sh

set -e
echo "=== Setting up Hetzner server for KovosrotSoft ==="

apt-get update -y
apt-get install -y git curl

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install docker compose plugin
apt-get install -y docker-compose-plugin

# Create app directory
mkdir -p /opt/kovosrotsoft

echo ""
echo "=== Server setup complete! ==="
echo "Now add GitHub Secrets and push to trigger deploy."
