import mongoose, { Schema, type Document } from "mongoose";
import type { ItemStatus } from "@starter/shared";

export interface IItem extends Document {
  title: string;
  description?: string;
  status: ItemStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
  {
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 2000 },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    ownerId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const Item = mongoose.model<IItem>("Item", itemSchema);
