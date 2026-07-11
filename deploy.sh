#!/bin/bash
# KovošrotSoft – deployment script
# Usage: ./deploy.sh [SERVER_IP] [SSH_USER]
# Example: ./deploy.sh 123.456.789.0 root

SERVER=${1:-"YOUR_SERVER_IP"}
USER=${2:-"root"}
APP_DIR="/opt/kovosrotsoft"

echo "=== Deploying KovošrotSoft to ${USER}@${SERVER} ==="

# Copy files to server
ssh "${USER}@${SERVER}" "mkdir -p ${APP_DIR}"
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude 'data' --exclude '.git' \
  ./ "${USER}@${SERVER}:${APP_DIR}/"

# Install Docker on server (skip if already installed)
ssh "${USER}@${SERVER}" "
  if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
  fi
  if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose-plugin || pip install docker-compose
  fi
"

# Start the application
ssh "${USER}@${SERVER}" "
  cd ${APP_DIR}
  docker compose down --remove-orphans
  docker compose up -d --build
  echo 'Waiting for startup...'
  sleep 5
  docker compose ps
"

echo "=== Deploy done! App running at http://${SERVER}:3001 ==="
