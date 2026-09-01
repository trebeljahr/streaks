import { resolveCreditedDay } from "@starter/shared";
import { Profile } from "../models/Profile.js";

/** The owner's timezone and day-start hour, with safe defaults. */
export type DayContext = {
  timezone: string;
  dayStartHour: number;
};

const DEFAULTS: DayContext = { timezone: "UTC", dayStartHour: 4 };

/**
 * Where a user's day boundary sits. Read from the profile rather than the
 * request, so a session started abroad still credits the day the user
 * thinks it does.
 */
export async function getDayContext(userId: string): Promise<DayContext> {
  const profile = await Profile.findOne({ userId }).lean();
  if (!profile?.preferences) return DEFAULTS;
  return {
    timezone: profile.preferences.timezone || DEFAULTS.timezone,
    dayStartHour: profile.preferences.dayStartHour ?? DEFAULTS.dayStartHour,
  };
}

/** The day key an instant belongs to for this user. */
export function creditedDayFor(instant: Date, ctx: DayContext): string {
  return resolveCreditedDay(instant.getTime(), ctx.timezone, ctx.dayStartHour);
}

/** Today's day key for this user. */
export function todayFor(ctx: DayContext): string {
  return creditedDayFor(new Date(), ctx);
}
