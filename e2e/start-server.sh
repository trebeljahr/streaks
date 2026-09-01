#!/usr/bin/env bash
set -euo pipefail

# In CI, GitHub Actions services provide MongoDB/Redis/local S3.
# Locally, spin up Docker containers for E2E testing.

if [ -z "${CI:-}" ]; then
  echo "[e2e] Starting local test infrastructure..."

  # `docker ps` lists only RUNNING containers, so a container that exists but
  # is stopped (an interrupted run, a machine reboot) makes `docker run --name`
  # fail with a name conflict. Start what is already there, create what is not.
  ensure_container() {
    local name="$1"
    shift
    if docker ps --format '{{.Names}}' | grep -qx "$name"; then
      return 0
    fi
    if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
      docker start "$name" >/dev/null
      echo "[e2e] Restarted $name"
      return 0
    fi
    "$@"
  }

  # MongoDB on port 27018
  ensure_container starter-e2e-mongo \
    docker run -d --name starter-e2e-mongo -p 27018:27017 --tmpfs /data/db mongo:7

  # Redis on port 6380
  ensure_container starter-e2e-redis \
    docker run -d --name starter-e2e-redis -p 6380:6379 --tmpfs /data redis:7-alpine

  # SeaweedFS S3 on port 9002. The image creates S3_BUCKET on startup.
  ensure_container starter-e2e-seaweedfs \
    docker run -d --name starter-e2e-seaweedfs -p 9002:8333 \
      -e S3_BUCKET=streaks-e2e \
      --tmpfs /data chrislusf/seaweedfs:4.47
    echo "[e2e] Started SeaweedFS S3 on port 9002"

  for i in $(seq 1 30); do
    curl -s http://127.0.0.1:9002/ >/dev/null && break
    sleep 1
  done

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
