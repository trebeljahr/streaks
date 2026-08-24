import { router, protectedProcedure } from "../trpc.js";
import { updateProfileSchema } from "@starter/shared";
import { Profile } from "../../models/Profile.js";

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    let profile = await Profile.findOne({ userId: ctx.user.id });
    if (!profile) {
      profile = await Profile.create({
        userId: ctx.user.id,
        preferences: { theme: "system", notifications: true },
      });
    }
    return {
      userId: profile.userId,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      preferences: profile.preferences,
    };
  }),

  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const update: Record<string, unknown> = {};
      if (input.bio !== undefined) update.bio = input.bio;
      if (input.avatarUrl !== undefined) update.avatarUrl = input.avatarUrl;
      if (input.preferences) {
        if (input.preferences.theme !== undefined) {
          update["preferences.theme"] = input.preferences.theme;
        }
        if (input.preferences.notifications !== undefined) {
          update["preferences.notifications"] = input.preferences.notifications;
        }
      }

      const profile = await Profile.findOneAndUpdate(
        { userId: ctx.user.id },
        { $set: update },
        { new: true, upsert: true },
      );

      return {
        userId: profile.userId,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        preferences: profile.preferences,
      };
    }),
});
