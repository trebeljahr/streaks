// Sentry/GlitchTip initialization — MUST be imported first in index.ts.
// GlitchTip is Sentry SDK-compatible: just use a GlitchTip DSN.

import * as Sentry from "@sentry/node";
import { sentryOptions } from "./sentry-options.js";

if (process.env.SENTRY_DSN) {
  Sentry.init(sentryOptions(process.env.SENTRY_DSN));
}
