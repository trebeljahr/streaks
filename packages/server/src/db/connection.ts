import mongoose from "mongoose";
import { env } from "../config/env.js";

let isConnecting = false;

export async function connectToDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;

  isConnecting = true;
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("[db] Connected to MongoDB");
  } finally {
    isConnecting = false;
  }
}

export async function disconnectFromDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  console.log("[db] Disconnected from MongoDB");
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}

/** Get the underlying MongoClient (for better-auth adapter). */
export function getMongoClient() {
  return mongoose.connection.getClient();
}
