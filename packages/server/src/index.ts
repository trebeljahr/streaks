// Sentry must be imported first
import "./instrument.js";

import { createServer } from "http";
import { createApp } from "./app.js";
import { connectToDB, disconnectFromDB } from "./db/connection.js";
import { connectRedis, disconnectRedis } from "./db/redis.js";
import { initAuth, disconnectAuth } from "./auth/auth.js";
import { setupWebSocket } from "./ws/handler.js";
import { warnStripeStatus } from "./services/stripe.js";
import { env } from "./config/env.js";

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

    // 3. Surface "Stripe is not configured" warnings before serving
    //    traffic so the gap is visible in dev terminals AND prod logs.
    //    Non-fatal — non-Stripe features keep working.
    warnStripeStatus();

    // 4. Start listening
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

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[server] ${signal} received, shutting down gracefully...`);

  // Close all WebSocket connections
  for (const client of wss.clients) {
    client.close(1001, "Server shutting down");
  }

  // Stop accepting new connections
  server.close();

  // Disconnect from databases and auth
  await disconnectAuth();
  await disconnectRedis();
  await disconnectFromDB();

  console.log("[server] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Force exit after 10 seconds
const FORCE_EXIT_MS = 10_000;
process.on("SIGTERM", () => {
  setTimeout(() => {
    console.error("[server] Forced exit after timeout");
    process.exit(1);
  }, FORCE_EXIT_MS).unref();
});

start();
