#!/usr/bin/env bash
set -euo pipefail

# In CI, GitHub Actions services provide MongoDB/Redis/local S3.
# Locally, spin up Docker containers for E2E testing.

if [ -z "${CI:-}" ]; then
  echo "[e2e] Starting local test infrastructure..."

  # MongoDB on port 27018
  if ! docker ps --format '{{.Names}}' | grep -q starter-e2e-mongo; then
    docker run -d --name starter-e2e-mongo -p 27018:27017 --tmpfs /data/db mongo:7
    echo "[e2e] Started MongoDB on port 27018"
  fi

  # Redis on port 6380
  if ! docker ps --format '{{.Names}}' | grep -q starter-e2e-redis; then
    docker run -d --name starter-e2e-redis -p 6380:6379 --tmpfs /data redis:7-alpine
    echo "[e2e] Started Redis on port 6380"
  fi

  # SeaweedFS S3 on port 9002
  if ! docker ps --format '{{.Names}}' | grep -q starter-e2e-seaweedfs; then
    docker run -d --name starter-e2e-seaweedfs -p 9002:8333 \
      -e S3_BUCKET=starter-e2e \
      --tmpfs /data chrislusf/seaweedfs:latest
    echo "[e2e] Started SeaweedFS S3 on port 9002"

    # Wait for SeaweedFS. The image creates S3_BUCKET on startup.
    for i in $(seq 1 30); do
      curl -s http://127.0.0.1:9002/ >/dev/null && break
      sleep 1
    done
    echo "[e2e] SeaweedFS bucket ready"
  fi

  # Wait for MongoDB
  for i in $(seq 1 30); do
    node -e "
      const { MongoClient } = require('mongodb');
      MongoClient.connect('mongodb://127.0.0.1:27018')
        .then(c => { c.close(); process.exit(0); })
        .catch(() => process.exit(1));
    " 2>/dev/null && break
    sleep 1
  done
  echo "[e2e] MongoDB ready"

  # Wait for Redis
  for i in $(seq 1 10); do
    docker exec starter-e2e-redis redis-cli ping 2>/dev/null | grep -q PONG && break
    sleep 1
  done
  echo "[e2e] Redis ready"
fi

echo "[e2e] Starting server..."
exec pnpm --filter @starter/server run dev
