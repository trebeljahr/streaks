import { router, publicProcedure } from "../trpc.js";
import { isDatabaseReady } from "../../db/connection.js";

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return {
      status: "ok" as const,
      db: isDatabaseReady(),
      timestamp: new Date().toISOString(),
    };
  }),
});
