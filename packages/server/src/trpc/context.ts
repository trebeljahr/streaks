import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getAuth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const auth = getAuth();
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return {
    req,
    res,
    session,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
