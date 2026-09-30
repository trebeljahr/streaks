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
import { env, getTrustedOrigins } from "./config/env.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

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
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      db: isDatabaseReady(),
      timestamp: new Date().toISOString(),
    });
  });

  // ── 7. Error handlers (must be last) ───────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
