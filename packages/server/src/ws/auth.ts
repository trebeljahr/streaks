import type { IncomingMessage } from "http";
import { getAuth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";

/**
 * Authenticate a WebSocket upgrade request using the session cookie.
 * Returns the session/user or null if unauthenticated.
 */
export async function authenticateUpgrade(req: IncomingMessage) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session;
  } catch {
    return null;
  }
}
