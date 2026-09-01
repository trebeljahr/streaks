import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { practiceStatsSchema } from "@starter/shared";
import { Practice } from "../../models/Practice.js";
import { statsForPractice } from "../../services/stats.js";
import { getDayContext, todayFor } from "../../services/dayContext.js";

export const statsRouter = router({
  /** One row per active practice — what the Today screen renders. */
  overview: protectedProcedure
    .input(z.object({ days: z.number().int().min(7).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const windowDays = input?.days ?? 30;
      const practices = await Practice.find({
        ownerId: ctx.user.id,
        archivedAt: { $exists: false },
      }).sort({ createdAt: 1 });

      const stats = await Promise.all(
        practices.map((p) => statsForPractice(ctx.user.id, p, windowDays)),
      );
      const dayCtx = await getDayContext(ctx.user.id);
      return { today: todayFor(dayCtx), stats };
    }),

  forPractice: protectedProcedure
    .input(practiceStatsSchema)
    .query(async ({ ctx, input }) => {
      const practice = await Practice.findById(input.practiceId);
      if (!practice || practice.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return statsForPractice(ctx.user.id, practice, input.days);
    }),
});
