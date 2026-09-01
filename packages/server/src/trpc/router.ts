import { router } from "./trpc.js";
import { healthRouter } from "./routers/health.js";
import { profileRouter } from "./routers/profile.js";
import { practicesRouter } from "./routers/practices.js";
import { sessionsRouter } from "./routers/sessions.js";
import { statsRouter } from "./routers/stats.js";
import { repairRouter } from "./routers/repair.js";
import { billingRouter } from "./routers/billing.js";

export const appRouter = router({
  health: healthRouter,
  profile: profileRouter,
  practices: practicesRouter,
  sessions: sessionsRouter,
  stats: statsRouter,
  repair: repairRouter,
  billing: billingRouter,
});

export type AppRouter = typeof appRouter;
