import mongoose, { Schema, type Document } from "mongoose";
import type { Cadence, PracticeColor, PracticeIcon } from "@starter/shared";

export interface IPractice extends Document {
  ownerId: string;
  name: string;
  icon: PracticeIcon;
  color: PracticeColor;
  minimumMinutes: number;
  targetMinutes: number;
  cadence: Cadence;
  /** Committed repairs; append-only so array length is the spending revision. */
  repairDays: string[];
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cadenceSchema = new Schema<Cadence>(
  {
    kind: { type: String, enum: ["daily", "perWeek"], required: true },
    times: { type: Number, min: 1, max: 7 },
  },
  { _id: false },
);

const practiceSchema = new Schema<IPractice>(
  {
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 60 },
    icon: {
      type: String,
      enum: ["writing", "deepWork", "learning", "piano", "drawing", "custom"],
      default: "custom",
    },
    color: {
      type: String,
      enum: ["blue", "periwinkle", "teal", "violet", "amber"],
      default: "periwinkle",
    },
    // Small on purpose. Hitting this credits the day — starting is the win.
    minimumMinutes: { type: Number, required: true, min: 1, max: 120, default: 2 },
    // Aspirational only. Nothing anywhere treats falling short of it as a miss.
    targetMinutes: { type: Number, required: true, min: 1, max: 480, default: 25 },
    cadence: {
      type: cadenceSchema,
      required: true,
      default: () => ({ kind: "perWeek", times: 4 }),
    },
    repairDays: {
      type: [String],
      default: [],
    },
    // Soft archive: history is the reward surface, so nothing is ever deleted.
    archivedAt: { type: Date, sparse: true },
  },
  { timestamps: true },
);

practiceSchema.index({ ownerId: 1, archivedAt: 1 });

export const Practice = mongoose.model<IPractice>("Practice", practiceSchema);
