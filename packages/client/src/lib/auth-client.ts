import { createAuthClient } from "better-auth/react";

// NEXT_PUBLIC_API_URL is inlined at BUILD time (Dockerfile build args /
// release-workflow env) — production builds fail loudly in next.config.ts
// when it's missing, so the localhost fallback only ever applies to
// `next dev`. The empty-string fallback resolves to same-origin /api
// paths, matching trpc.ts.
const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

export const authClient = createAuthClient({
  baseURL: `${apiUrl}/api/auth`,
});

// Re-export commonly used methods
export const { signIn, signUp, signOut, useSession } = authClient;
