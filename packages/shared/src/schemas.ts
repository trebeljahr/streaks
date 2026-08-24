import { z } from "zod";

export const createItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
});

export const updateItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  avatarUrl: z.url().optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
