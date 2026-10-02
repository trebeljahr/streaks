// Sentry must be imported first
import "./instrument.js";

import { createServer } from "http";
import { createApp } from "./app.js";
import { connectToDB, disconnectFromDB } from "./db/connection.js";
import { connectRedis, disconnectRedis } from "./db/redis.js";
import { initAuth, disconnectAuth } from "./auth/auth.js";
import { setupWebSocket } from "./ws/handler.js";
import { env } from "./config/env.js";
import { beginDrain } from "./readiness.js";

const app = createApp();
const server = createServer(app);
const wss = setupWebSocket(server);

async function start(): Promise<void> {
  try {
    // 1. Connect to databases
    await connectToDB();
    await connectRedis();

    // 2. Initialize auth (needs DB connection)
    await initAuth();

    // 3. Start listening
    server.listen(env.PORT, () => {
      console.log(`[server] Listening on http://127.0.0.1:${env.PORT}`);
      console.log(`[server] Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error("[server] Failed to start:", err);
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────────

let stopping = false;
async function shutdown(signal: string): Promise<void> {
  if (stopping) return;
  stopping = true;
  console.log(`\n[server] ${signal} received, shutting down gracefully...`);

  // PID 1 is Node. Fail the local readiness probe before closing sockets so
  // Traefik can stop routing to this instance during an overlapping rollout.
  beginDrain();
  const drainSeconds = Number(process.env.SHUTDOWN_DRAIN_SECONDS ?? 0);
  if (signal === "SIGTERM" && Number.isFinite(drainSeconds) && drainSeconds > 0) {
    await new Promise((resolve) => setTimeout(resolve, drainSeconds * 1000));
  }

  const forceExit = setTimeout(() => {
    console.error("[server] Forced exit after shutdown timeout");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  // Close all WebSocket connections
  for (const client of wss.clients) {
    client.close(1001, "Server shutting down");
  }

  // Stop accepting new connections
  await new Promise<void>((resolve) => server.close(() => resolve()));

  // Disconnect from databases and auth
  await disconnectAuth();
  await disconnectRedis();
  await disconnectFromDB();

  console.log("[server] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start();
