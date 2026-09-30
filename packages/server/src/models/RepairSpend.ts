import mongoose, { Schema, type Document } from "mongoose";

export interface IRepairSpend extends Document {
  ownerId: string;
  practiceId: string;
  /** `YYYY-MM-DD` the token was spent on. */
  day: string;
  createdAt: Date;
  updatedAt: Date;
}

const repairSpendSchema = new Schema<IRepairSpend>(
  {
    ownerId: { type: String, required: true },
    practiceId: { type: String, required: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true },
);

// Legacy repair history remains readable. New spends commit atomically to
// Practice.repairDays; keep this index for existing records.
repairSpendSchema.index(
  { ownerId: 1, practiceId: 1, day: 1 },
  { unique: true },
);

export const RepairSpend = mongoose.model<IRepairSpend>(
  "RepairSpend",
  repairSpendSchema,
);
