import mongoose, { Schema, type Document } from "mongoose";
import type { ThemePreference } from "@starter/shared";

export interface IProfile extends Document {
  userId: string;
  avatarUrl?: string;
  bio?: string;
  preferences: {
    theme: ThemePreference;
    notifications: boolean;
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
    },
  },
  { timestamps: true },
);

export const Profile = mongoose.model<IProfile>("Profile", profileSchema);
