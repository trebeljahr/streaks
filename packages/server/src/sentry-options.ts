// Options for the server's Sentry/GlitchTip client. Kept out of
// instrument.ts so tests can check them without starting the SDK.
//
// By default @sentry/node puts the request headers (Cookie included), the
// parsed cookies (the better-auth session token) and up to 10 KB of the
// request body on every event. Leaving `sendDefaultPii` unset does not
// stop that, so the body is never read and the hooks strip the rest.

import * as Sentry from "@sentry/node";

const CREDENTIAL_HEADERS = new Set(["cookie", "set-cookie", "authorization", "proxy-authorization"]);

/** Removes cookies, credential headers and the body from an event's request. */
export function scrubRequest<T extends Sentry.Event>(event: T): T {
  const request = event.request;
  if (!request) return event;
  delete request.cookies;
  delete request.data;
  if (request.headers) {
    for (const name of Object.keys(request.headers)) {
      if (CREDENTIAL_HEADERS.has(name.toLowerCase())) delete request.headers[name];
    }
  }
  return event;
}

export function sentryOptions(dsn: string): Sentry.NodeOptions {
  return {
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    integrations: [
      Sentry.httpIntegration({ maxIncomingRequestBodySize: "none" }),
      Sentry.requestDataIntegration({ include: { cookies: false, data: false } }),
    ],
    beforeSend: scrubRequest,
    beforeSendTransaction: scrubRequest,
  };
}
