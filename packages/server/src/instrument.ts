// Sentry/GlitchTip initialization — MUST be imported first in index.ts.
// GlitchTip is Sentry SDK-compatible: just use a GlitchTip DSN.

import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  });
}
