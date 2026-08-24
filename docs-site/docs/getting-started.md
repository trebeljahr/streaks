---
sidebar_position: 2
description: Install dependencies, configure local services, run development servers, and execute tests for the Node realtime starter.
---

# Getting Started

## Prerequisites

- **Node.js 22** (see `.nvmrc`)
- **pnpm** (corepack enabled: `corepack enable`)
- **Docker** (for local MongoDB, Redis, S3-compatible storage)

## Setup

```bash
# Clone and install
git clone <repo-url> my-app
cd my-app
pnpm install

# Start local infrastructure (one-time)
pnpm run dev:infra

# Start development servers
pnpm run dev         # random ports (for agents/worktrees)
pnpm run dev:fixed   # fixed ports (client=3000, server=5000)
```

## Configuration

1. Copy `packages/server/.env.example` to `packages/server/.env` and fill in your values
2. Copy `packages/client/.env.example` to `packages/client/.env` and fill in your values
3. For local development, the `.env.development` files provide sensible defaults

## Running Tests

```bash
pnpm run test:unit     # server unit tests
pnpm run test:client   # client unit tests
pnpm run test:e2e      # Playwright E2E tests
```
