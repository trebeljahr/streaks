import mongoose, { Schema, type Document } from "mongoose";
import type { ThemePreference } from "@starter/shared";

export interface IProfile extends Document {
  userId: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    theme: ThemePreference;
    notifications: boolean;
    timezone: string;
    dayStartHour: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: { type: String, required: true, unique: true },
    avatarUrl: String,
    bio: { type: String, maxlength: 500 },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notifications: { type: Boolean, default: true },
      // Streak days are resolved in this zone, so travel doesn't break a
      // streak and DST doesn't shift one.
      timezone: { type: String, default: "UTC" },
      // A session at 1am belongs to the previous day. Night owls are the
      // norm here, not the exception.
      dayStartHour: { type: Number, min: 0, max: 23, default: 4 },
    },
  },
  { timestamps: true },
);

export const Profile = mongoose.model<IProfile>("Profile", profileSchema);
