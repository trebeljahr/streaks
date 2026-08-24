import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { createItemSchema, paginationSchema } from "@starter/shared";
import { Item } from "../../models/Item.js";

export const itemsRouter = router({
  list: protectedProcedure.input(paginationSchema).query(async ({ ctx, input }) => {
    const query: Record<string, unknown> = { ownerId: ctx.user.id };
    if (input.cursor) {
      query._id = { $lt: input.cursor };
    }

    const items = await Item.find(query)
      .sort({ _id: -1 })
      .limit(input.limit + 1)
      .lean();

    const hasMore = items.length > input.limit;
    if (hasMore) items.pop();

    return {
      items: items.map((item) => ({
        id: String(item._id),
        title: item.title,
        description: item.description,
        status: item.status,
        ownerId: item.ownerId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      nextCursor: hasMore ? String(items[items.length - 1]._id) : undefined,
    };
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await Item.findById(input.id).lean();
      if (!item || item.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return {
        id: String(item._id),
        title: item.title,
        description: item.description,
        status: item.status,
        ownerId: item.ownerId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    }),

  create: protectedProcedure
    .input(createItemSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await Item.create({
        ...input,
        ownerId: ctx.user.id,
      });
      return {
        id: String(item._id),
        title: item.title,
        description: item.description,
        status: item.status,
        ownerId: item.ownerId,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await Item.findById(input.id);
      if (!item || item.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await item.deleteOne();
      return { success: true };
    }),
});
