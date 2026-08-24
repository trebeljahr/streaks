import type { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";

/** 404 handler — must be mounted after all routes. */
export function notFoundHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  res.status(404).json({ error: "Not found" });
}

/** Global error handler — must be mounted last. */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Capture 500-level errors in Sentry/GlitchTip
  Sentry.captureException(err);

  const statusCode =
    "statusCode" in err ? (err as Error & { statusCode: number }).statusCode : 500;

  console.error(`[error] ${err.message}`, err.stack);

  res.status(statusCode).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
}
