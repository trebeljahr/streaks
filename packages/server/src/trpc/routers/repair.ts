import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { isRepairable, spendRepairTokenSchema } from "@starter/shared";
import { Practice } from "../../models/Practice.js";
import { RepairSpend } from "../../models/RepairSpend.js";
import { statsForPractice } from "../../services/stats.js";
import { getDayContext, todayFor } from "../../services/dayContext.js";

export const repairRouter = router({
  /** Spend and credit commit together on one document, without transactions. */
  spend: protectedProcedure
    .input(spendRepairTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const ownerId = ctx.user.id;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const practice = await Practice.findOne({ _id: input.practiceId, ownerId });
        if (!practice) throw new TRPCError({ code: "NOT_FOUND" });

        const repairDays = practice.repairDays ?? [];
        // Replays succeed even when the first spend exhausted the bank.
        if (
          repairDays.includes(input.day) ||
          await RepairSpend.exists({ ownerId, practiceId: input.practiceId, day: input.day })
        ) {
          return statsForPractice(ownerId, practice);
        }

        const before = await statsForPractice(ownerId, practice);
        if (before.repairTokens < 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "No repair tokens in the bank yet.",
          });
        }

        const dayCtx = await getDayContext(ownerId);
        const today = todayFor(dayCtx);
        const creditedDays = before.days.filter((d) => d.credited).map((d) => d.day);
        if (!isRepairable(input.day, creditedDays, today)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "That day cannot be repaired.",
          });
        }

        // Every successful spend appends one day. Matching the observed length
        // makes the balance check conditional on no intervening spend, across
        // all server processes. Missing arrays support existing practices.
        const updated = await Practice.findOneAndUpdate(
          {
            _id: practice._id,
            ownerId,
            $or: [
              { repairDays: { $size: repairDays.length } },
              ...(repairDays.length === 0 ? [{ repairDays: { $exists: false } }] : []),
            ],
          },
          { $push: { repairDays: input.day } },
          { new: true },
        );
        if (updated) return statsForPractice(ownerId, updated);
        // Another repair won. Re-read its credit and recompute the bank before
        // retrying; never reuse the losing request's balance snapshot.
      }
      throw new TRPCError({
        code: "CONFLICT",
        message: "Repair history changed. Please retry.",
      });
    }),
});
