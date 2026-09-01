import mongoose, { Schema, type Document } from "mongoose";
import type { Mood, SessionState } from "@starter/shared";

export interface ISession extends Document {
  ownerId: string;
  practiceId: string;
  /** Client-generated id, so a replayed start after a drop is deduped. */
  clientId: string;
  startedAt: Date;
  endedAt?: Date;
  pausedMs: number;
  state: SessionState;
  durationMs?: number;
  mood?: Mood;
  note?: string;
  roomId?: string;
  /** `YYYY-MM-DD`, resolved from the owner's timezone and dayStartHour. */
  creditedDay?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    ownerId: { type: String, required: true },
    practiceId: { type: String, required: true },
    clientId: { type: String, required: true, maxlength: 64 },
    startedAt: { type: Date, required: true },
    endedAt: Date,
    pausedMs: { type: Number, required: true, min: 0, default: 0 },
    state: {
      type: String,
      enum: ["running", "paused", "completed", "abandoned"],
      required: true,
      default: "running",
    },
    durationMs: { type: Number, min: 0 },
    mood: { type: Number, min: 1, max: 5 },
    note: { type: String, maxlength: 2000 },
    roomId: { type: String, maxlength: 64 },
    creditedDay: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true },
);

// The history scan behind streaks and momentum.
sessionSchema.index({ ownerId: 1, practiceId: 1, creditedDay: 1 });
// Recovering the running session at app launch.
sessionSchema.index({ ownerId: 1, state: 1 });
// Offline replay: the same client id must never create two sessions.
sessionSchema.index({ ownerId: 1, clientId: 1 }, { unique: true });

export const Session = mongoose.model<ISession>("Session", sessionSchema);
