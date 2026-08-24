---
sidebar_position: 3
description: Architecture notes for the Node realtime starter monorepo, server middleware, WebSocket flow, data stores, and production deployment stack.
---

# Architecture

## Monorepo Structure

```
packages/
  shared/   — Types, schemas, WebSocket protocol (used by both client and server)
  server/   — Express + tRPC + better-auth + WebSocket
  client/   — Next.js + Tailwind + shadcn/ui + tRPC client
```

Managed with **pnpm workspaces**. The `@starter/shared` package is a build dependency of both server and client.

## Server Architecture

The Express server uses a strict middleware ordering:

1. **better-auth** handler — handles its own body parsing
2. **Stripe webhook** — needs raw body for signature verification
3. **express.json()** — JSON parsing for everything else
4. **helmet + cors + morgan** — security and logging
5. **tRPC middleware** — type-safe API layer
6. **Health endpoint** — for Docker/Coolify healthchecks
7. **Error handlers** — 404 + 500 with Sentry capture

WebSocket connections use the native `ws` library on the same HTTP server, with session cookie authentication during the upgrade handshake.

## Data Flow

```
Client (Next.js)
  ├── tRPC (HTTP)  →  Express  →  MongoDB (via Mongoose)
  ├── Auth (HTTP)  →  better-auth  →  MongoDB (native driver)
  └── WebSocket    →  ws server  →  RoomManager (in-memory)
```

## Deployment

- **Docker Compose** stack deployed as a Coolify Service
- **GitHub Actions** builds Docker images, pushes to GHCR, triggers Coolify
- Server and client are separate containers
- MongoDB and Redis run as services within the same stack
