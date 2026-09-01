import {
  MAX_REPAIR_TOKENS,
  addDays,
  computeMomentum,
  computeStreak,
  countEarnedTokens,
} from "@starter/shared";
import type { Cadence, DayFlag, PracticeStats } from "@starter/shared";
import { Session } from "../models/Session.js";
import { RepairSpend } from "../models/RepairSpend.js";
import { getDayContext, todayFor } from "./dayContext.js";
import type { IPractice } from "../models/Practice.js";

/** Minutes practised per credited day, from completed sessions only. */
async function minutesByDay(
  ownerId: string,
  practiceId: string,
  since: string,
): Promise<Map<string, number>> {
  const rows = await Session.aggregate<{ _id: string; ms: number }>([
    {
      $match: {
        ownerId,
        practiceId,
        state: "completed",
        creditedDay: { $gte: since },
      },
    },
    { $group: { _id: "$creditedDay", ms: { $sum: "$durationMs" } } },
  ]);

  const byDay = new Map<string, number>();
  for (const row of rows) byDay.set(row._id, Math.round(row.ms / 60_000));
  return byDay;
}

/**
 * Everything the Today and Practice Detail screens need for one practice.
 *
 * Repaired days are credited exactly like practised ones — that is the
 * whole point of a token — but they are flagged so the history can show
 * honestly how the day was filled.
 */
export async function statsForPractice(
  ownerId: string,
  practice: IPractice,
  windowDays = 90,
): Promise<PracticeStats> {
  const practiceId = String(practice._id);
  const dayCtx = await getDayContext(ownerId);
  const today = todayFor(dayCtx);
  const since = addDays(today, -(windowDays - 1));

  const [byDay, spends] = await Promise.all([
    minutesByDay(ownerId, practiceId, since),
    RepairSpend.find({ ownerId, practiceId, day: { $gte: since } }).lean(),
  ]);
  const repaired = new Set(spends.map((s) => s.day));

  const days: DayFlag[] = [];
  const creditedDays: string[] = [];
  for (let back = windowDays - 1; back >= 0; back -= 1) {
    const day = addDays(today, -back);
    const minutes = byDay.get(day) ?? 0;
    const practised = minutes >= practice.minimumMinutes;
    const wasRepaired = repaired.has(day);
    const credited = practised || wasRepaired;
    if (credited) creditedDays.push(day);
    days.push({ day, minutes, credited, repaired: wasRepaired && !practised });
  }

  const cadence = practice.cadence as Cadence;
  const { current, longest } = computeStreak(creditedDays, cadence, today);

  // Tokens are earned by actually showing up, so repaired days are excluded
  // from the earning history — otherwise a token could pay for itself.
  const earnedFrom = creditedDays.filter((d) => !repaired.has(d));
  const earned = countEarnedTokens(earnedFrom);
  const allSpends = await RepairSpend.countDocuments({ ownerId, practiceId });
  const bank = Math.max(0, Math.min(MAX_REPAIR_TOKENS, earned - allSpends));

  return {
    practiceId,
    momentum: computeMomentum(creditedDays, cadence, today),
    streak: current,
    longestStreak: longest,
    repairTokens: bank,
    days,
  };
}
