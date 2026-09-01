import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import {
  PRACTICE_PRESETS,
  archivePracticeSchema,
  createPracticeSchema,
  updatePracticeSchema,
} from "@starter/shared";
import type { Practice as PracticeDto } from "@starter/shared";
import { Practice, type IPractice } from "../../models/Practice.js";

function toDto(doc: IPractice): PracticeDto {
  return {
    id: String(doc._id),
    ownerId: doc.ownerId,
    name: doc.name,
    icon: doc.icon,
    color: doc.color,
    minimumMinutes: doc.minimumMinutes,
    targetMinutes: doc.targetMinutes,
    cadence: doc.cadence,
    archivedAt: doc.archivedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const practicesRouter = router({
  /** The onboarding catalogue. Public: it is the same for everyone. */
  presets: protectedProcedure.query(() => PRACTICE_PRESETS),

  list: protectedProcedure
    .input(
      z
        .object({ includeArchived: z.boolean().default(false) })
        .default(() => ({ includeArchived: false })),
    )
    .query(async ({ ctx, input }) => {
      const query: Record<string, unknown> = { ownerId: ctx.user.id };
      if (!input.includeArchived) query.archivedAt = { $exists: false };
      const docs = await Practice.find(query).sort({ createdAt: 1 });
      return docs.map(toDto);
    }),

  create: protectedProcedure
    .input(createPracticeSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await Practice.create({ ...input, ownerId: ctx.user.id });
      return toDto(doc);
    }),

  /** Onboarding creates several at once; one round trip beats five. */
  createMany: protectedProcedure
    .input(z.object({ practices: z.array(createPracticeSchema).min(1).max(12) }))
    .mutation(async ({ ctx, input }) => {
      const docs = await Practice.create(
        input.practices.map((p) => ({ ...p, ownerId: ctx.user.id })),
      );
      return docs.map(toDto);
    }),

  update: protectedProcedure
    .input(updatePracticeSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const doc = await Practice.findById(id);
      if (!doc || doc.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      Object.assign(doc, rest);
      await doc.save();
      return toDto(doc);
    }),

  /**
   * Soft archive only. History is the reward surface — nothing here is ever
   * hard-deleted.
   */
  archive: protectedProcedure
    .input(archivePracticeSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await Practice.findById(input.id);
      if (!doc || doc.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      doc.archivedAt = input.archived ? new Date() : undefined;
      await doc.save();
      return toDto(doc);
    }),
});
