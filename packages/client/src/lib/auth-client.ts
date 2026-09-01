import { createAuthClient } from "better-auth/react";

// NEXT_PUBLIC_API_URL is inlined at BUILD time (Dockerfile build args /
// release-workflow env). The native shells REQUIRE it — a Capacitor or
// Electron build has no meaningful same-origin to fall back to, and one
// built without it will not reach the API.
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

// better-auth insists on an absolute URL, so same-origin has to be resolved
// rather than left relative. The literal below is only ever reached while
// prerendering in Node, where no request is made.
function resolveBaseURL(): string {
  if (apiUrl) return `${apiUrl}/api/auth`;
  if (typeof window !== "undefined") return `${window.location.origin}/api/auth`;
  return "http://localhost/api/auth";
}

export const authClient = createAuthClient({
  baseURL: resolveBaseURL(),
});

// Re-export commonly used methods
export const { signIn, signUp, signOut, useSession } = authClient;
