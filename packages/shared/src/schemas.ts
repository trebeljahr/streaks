import { z } from "zod";

export const practiceColorSchema = z.enum([
  "blue",
  "periwinkle",
  "teal",
  "violet",
  "amber",
]);

export const practiceIconSchema = z.enum([
  "writing",
  "deepWork",
  "learning",
  "piano",
  "drawing",
  "custom",
]);

export const cadenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({ kind: z.literal("perWeek"), times: z.number().int().min(1).max(7) }),
]);

export const createPracticeSchema = z.object({
  name: z.string().min(1, "Give it a name").max(60),
  icon: practiceIconSchema.default("custom"),
  color: practiceColorSchema.default("periwinkle"),
  minimumMinutes: z.number().int().min(1).max(120).default(2),
  targetMinutes: z.number().int().min(1).max(480).default(25),
  cadence: cadenceSchema.default({ kind: "perWeek", times: 4 }),
});

export const updatePracticeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(60).optional(),
  icon: practiceIconSchema.optional(),
  color: practiceColorSchema.optional(),
  minimumMinutes: z.number().int().min(1).max(120).optional(),
  targetMinutes: z.number().int().min(1).max(480).optional(),
  cadence: cadenceSchema.optional(),
});

export const archivePracticeSchema = z.object({
  id: z.string(),
  archived: z.boolean().default(true),
});

export const startSessionSchema = z.object({
  practiceId: z.string(),
  /** Client-generated, so a replayed start after a network drop is deduped. */
  clientId: z.string().min(8).max(64),
  roomId: z.string().max(64).optional(),
  /** Client wall clock at start, for offline sessions synced later. */
  startedAt: z.iso.datetime().optional(),
});

/**
 * A session is addressable by either id. The client generates `clientId`
 * before the start request is even sent, so finishing never has to wait for
 * the server's id to come back — which matters, because the screen that
 * fires the start request has already navigated away by then.
 */
const sessionRef = {
  id: z.string().optional(),
  clientId: z.string().optional(),
};

export const finishSessionSchema = z.object({
  ...sessionRef,
  pausedMs: z.number().int().min(0).default(0),
  mood: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
  note: z.string().max(2000).optional(),
  /** Client wall clock at finish, for offline sessions synced later. */
  endedAt: z.iso.datetime().optional(),
}).refine((v) => !!v.id || !!v.clientId, {
  message: "Provide either id or clientId",
});

export const abandonSessionSchema = z
  .object(sessionRef)
  .refine((v) => !!v.id || !!v.clientId, {
    message: "Provide either id or clientId",
  });

export const setSessionMoodSchema = z
  .object({
    ...sessionRef,
    mood: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => !!v.id || !!v.clientId, {
    message: "Provide either id or clientId",
  });

export const spendRepairTokenSchema = z.object({
  practiceId: z.string(),
  /** `YYYY-MM-DD`, must be blank and within REPAIR_WINDOW_DAYS. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export const practiceStatsSchema = z.object({
  practiceId: z.string(),
  days: z.number().int().min(7).max(365).default(90),
});

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  avatarUrl: z.url().optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      notifications: z.boolean().optional(),
      timezone: z.string().min(1).max(64).optional(),
      dayStartHour: z.number().int().min(0).max(23).optional(),
    })
    .optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
