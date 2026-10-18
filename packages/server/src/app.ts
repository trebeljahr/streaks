import express, { type RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import { getAuth } from "./auth/auth.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/context.js";
import { isDatabaseReady } from "./db/connection.js";
import { notFoundHandler, errorHandler } from "./middleware/error-handler.js";
import { restoreApiPrefix } from "./middleware/api-prefix.js";
import { env, getTrustedOrigins } from "./config/env.js";
import { isDraining, isProxyDraining, isTraefikProbe } from "./readiness.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Traefik's drain probe — ahead of everything, so a request that arrives
  // every few seconds skips CORS, logging and the database. It reports only
  // whether this container is draining; readiness is the /api/health check
  // Docker runs. Traefik sends it straight to this container with an
  // X-Hatchkit-Drain header; a visitor's request is forwarded by Traefik,
  // which always adds X-Forwarded-For, so a visitor can't pose as it.
  app.use((req, res, next) => {
    if (!isTraefikProbe(req.headers)) return next();
    const draining = isProxyDraining();
    res
      .status(draining ? 503 : 200)
      .set("cache-control", "no-store")
      .type("text/plain")
      .send(draining ? "draining\n" : "serving\n");
  });

  // Coolify may strip the /api route prefix; put it back before routing.
  app.use(restoreApiPrefix);

  // ── 0. CORS — must be before all route handlers so preflight works ─
  const trustedOrigins = getTrustedOrigins();
  app.use(
    cors({
      origin: trustedOrigins.length > 0 ? trustedOrigins : false,
      credentials: true,
    }),
  );

  // ── 1. better-auth — BEFORE express.json() ────────────────────────
  // better-auth handles its own body parsing. Mounting express.json()
  // before this will consume the body and break auth.
  app.all("/api/auth/{*any}", (req, res, next) => {
    try {
      const auth = getAuth();
      return toNodeHandler(auth)(req, res);
    } catch (err) {
      next(err);
    }
  });

  // ── 3. Body parsing (for everything else) ──────────────────────────
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── 4. Security + logging ──────────────────────────────────────────
  app.use(helmet());
  app.use(morgan(env.isProduction ? "combined" : "dev"));

  // ── 5. tRPC ────────────────────────────────────────────────────────
  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
  }) as RequestHandler;
  app.use("/api/trpc", trpcMiddleware);

  // ── 6. Health endpoint ─────────────────────────────────────────────
  app.get("/api/health", (req, res) => {
    const db = isDatabaseReady();
    const peer = req.socket.remoteAddress;
    const localProbe = peer === "127.0.0.1" || peer === "::1" || peer === "::ffff:127.0.0.1";
    if (!db || (isDraining() && localProbe)) res.status(503);
    res.json({
      status: isDraining() ? "draining" : db ? "ok" : "unready",
      db,
      // The deploy workflow waits for this to equal the commit it pushed
      // before it switches the client (Cloudflare Worker) over. Empty
      // for a locally run server; treat it as optional.
      version: env.COMMIT_SHA,
      timestamp: new Date().toISOString(),
    });
  });

  // ── 7. Error handlers (must be last) ───────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
