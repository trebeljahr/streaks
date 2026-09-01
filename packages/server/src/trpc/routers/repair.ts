import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { isRepairable, spendRepairTokenSchema } from "@starter/shared";
import { Practice } from "../../models/Practice.js";
import { RepairSpend } from "../../models/RepairSpend.js";
import { statsForPractice } from "../../services/stats.js";
import { getDayContext, todayFor } from "../../services/dayContext.js";

export const repairRouter = router({
  /**
   * Spend one repair token on a blank day.
   *
   * Idempotent by unique index: a replayed request cannot fabricate a
   * second credit, and it cannot spend a second token either.
   */
  spend: protectedProcedure
    .input(spendRepairTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const practice = await Practice.findById(input.practiceId);
      if (!practice || practice.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const before = await statsForPractice(ctx.user.id, practice);
      if (before.repairTokens < 1) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No repair tokens in the bank yet.",
        });
      }

      const dayCtx = await getDayContext(ctx.user.id);
      const today = todayFor(dayCtx);
      const creditedDays = before.days.filter((d) => d.credited).map((d) => d.day);
      if (!isRepairable(input.day, creditedDays, today)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "That day cannot be repaired.",
        });
      }

      try {
        await RepairSpend.create({
          ownerId: ctx.user.id,
          practiceId: input.practiceId,
          day: input.day,
        });
      } catch (err) {
        // Duplicate key: the day is already repaired. Treat the replay as
        // success rather than charging a second token.
        const code = (err as { code?: number }).code;
        if (code !== 11000) throw err;
      }

      return statsForPractice(ctx.user.id, practice);
    }),
});
