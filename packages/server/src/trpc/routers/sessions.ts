import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import {
  MIN_SESSION_MS,
  abandonSessionSchema,
  finishSessionSchema,
  setSessionMoodSchema,
  startSessionSchema,
} from "@starter/shared";
import type { Session as SessionDto } from "@starter/shared";
import { Session, type ISession } from "../../models/Session.js";
import { Practice } from "../../models/Practice.js";
import { creditedDayFor, getDayContext } from "../../services/dayContext.js";

function toDto(doc: ISession): SessionDto {
  return {
    id: String(doc._id),
    ownerId: doc.ownerId,
    practiceId: doc.practiceId,
    startedAt: doc.startedAt.toISOString(),
    endedAt: doc.endedAt?.toISOString(),
    pausedMs: doc.pausedMs,
    state: doc.state,
    durationMs: doc.durationMs,
    mood: doc.mood,
    note: doc.note,
    roomId: doc.roomId,
    creditedDay: doc.creditedDay,
  };
}

const ACTIVE_STATES = ["running", "paused"] as const;

/**
 * Resolve a session from whichever id the caller had to hand. The client id
 * exists before the start request is sent, so it is the one reference a
 * screen can always rely on.
 */
async function findOwned(
  ownerId: string,
  ref: { id?: string; clientId?: string },
): Promise<ISession | null> {
  if (ref.id) {
    const byId = await Session.findById(ref.id);
    return byId && byId.ownerId === ownerId ? byId : null;
  }
  if (ref.clientId) {
    return Session.findOne({ ownerId, clientId: ref.clientId });
  }
  return null;
}

export const sessionsRouter = router({
  /**
   * Start practising.
   *
   * Never errors on a double start: a replayed request (offline outbox,
   * flaky network, two taps) returns the session that already exists.
   * Losing a session is unacceptable; a duplicate is merely untidy.
   */
  start: protectedProcedure
    .input(startSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const replay = await Session.findOne({
        ownerId: ctx.user.id,
        clientId: input.clientId,
      });
      if (replay) return toDto(replay);

      const running = await Session.findOne({
        ownerId: ctx.user.id,
        state: { $in: ACTIVE_STATES },
      });
      if (running) return toDto(running);

      const practice = await Practice.findById(input.practiceId).lean();
      if (!practice || practice.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const doc = await Session.create({
        ownerId: ctx.user.id,
        practiceId: input.practiceId,
        clientId: input.clientId,
        roomId: input.roomId,
        startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
        pausedMs: 0,
        state: "running",
      });
      return toDto(doc);
    }),

  /** The running session, if any. Read at launch to recover from a crash. */
  active: protectedProcedure.query(async ({ ctx }) => {
    const doc = await Session.findOne({
      ownerId: ctx.user.id,
      state: { $in: ACTIVE_STATES },
    }).sort({ startedAt: -1 });
    return doc ? toDto(doc) : null;
  }),

  /** Record accumulated pause time so a recovered session stays accurate. */
  pause: protectedProcedure
    .input(z.object({ id: z.string(), pausedMs: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const doc = await Session.findById(input.id);
      if (!doc || doc.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (doc.state === "running") doc.state = "paused";
      doc.pausedMs = input.pausedMs;
      await doc.save();
      return toDto(doc);
    }),

  resume: protectedProcedure
    .input(z.object({ id: z.string(), pausedMs: z.number().int().min(0) }))
    .mutation(async ({ ctx, input }) => {
      const doc = await Session.findById(input.id);
      if (!doc || doc.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (doc.state === "paused") doc.state = "running";
      doc.pausedMs = input.pausedMs;
      await doc.save();
      return toDto(doc);
    }),

  /**
   * Close a session out.
   *
   * Idempotent: finishing an already-finished session returns it unchanged
   * rather than double-crediting the day.
   */
  finish: protectedProcedure
    .input(finishSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await findOwned(ctx.user.id, input);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      if (doc.state === "completed" || doc.state === "abandoned") {
        return toDto(doc);
      }

      const endedAt = input.endedAt ? new Date(input.endedAt) : new Date();
      const pausedMs = Math.max(doc.pausedMs, input.pausedMs);
      const durationMs = Math.max(
        0,
        endedAt.getTime() - doc.startedAt.getTime() - pausedMs,
      );

      doc.endedAt = endedAt;
      doc.pausedMs = pausedMs;
      doc.durationMs = durationMs;
      if (input.mood !== undefined) doc.mood = input.mood;
      if (input.note !== undefined) doc.note = input.note;

      if (durationMs < MIN_SESSION_MS) {
        // A mis-tap, not a practice. Recorded, but it credits nothing.
        doc.state = "abandoned";
        doc.creditedDay = undefined;
      } else {
        doc.state = "completed";
        const dayCtx = await getDayContext(ctx.user.id);
        doc.creditedDay = creditedDayFor(endedAt, dayCtx);
      }

      await doc.save();
      return toDto(doc);
    }),

  /**
   * The one-tap close-out. Separate from `finish` on purpose: the session is
   * already recorded and the day already credited by the time this runs, so
   * walking away from the mood screen can never cost someone their session.
   */
  setMood: protectedProcedure
    .input(setSessionMoodSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await findOwned(ctx.user.id, input);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      doc.mood = input.mood;
      if (input.note !== undefined) doc.note = input.note;
      await doc.save();
      return toDto(doc);
    }),

  abandon: protectedProcedure
    .input(abandonSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const doc = await findOwned(ctx.user.id, input);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      if (doc.state === "completed") return toDto(doc);
      doc.state = "abandoned";
      doc.endedAt = doc.endedAt ?? new Date();
      doc.creditedDay = undefined;
      await doc.save();
      return toDto(doc);
    }),
});
