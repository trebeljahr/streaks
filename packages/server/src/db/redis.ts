import { Redis } from "ioredis";
import { env } from "../config/env.js";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  return redis;
}

export async function connectRedis(): Promise<void> {
  if (!env.REDIS_URL) {
    console.log("[redis] No REDIS_URL configured, skipping Redis connection");
    return;
  }

  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect();
  console.log("[redis] Connected to Redis");
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return;
  await redis.quit();
  redis = null;
  console.log("[redis] Disconnected from Redis");
}
