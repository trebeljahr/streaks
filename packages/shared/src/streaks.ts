/**
 * Streak, momentum and day-boundary maths.
 *
 * Pure functions with no I/O so the client can compute optimistically and
 * the server can compute authoritatively from the same source. This is
 * where the subtle bugs live (DST, timezone travel, cadence edges), so it
 * is deliberately isolated and heavily tested.
 */

import type { Cadence } from "./types.js";

/** Most tokens that can sit in the bank at once. */
export const MAX_REPAIR_TOKENS = 3;
/** How far back a blank day may be repaired. */
export const REPAIR_WINDOW_DAYS = 7;
/** Days considered by the momentum score. */
export const MOMENTUM_WINDOW_DAYS = 30;
/**
 * Recency half-life. Short on purpose: it is what makes a comeback move
 * the number fast enough to be worth looking at.
 */
export const MOMENTUM_HALF_LIFE_DAYS = 10;
/** Consecutive credited days that earn one repair token. */
export const TOKEN_EARN_RUN_DAYS = 7;
/** How wide the rolling window is when checking a cadence budget. */
export const CADENCE_WINDOW_DAYS = 7;
/**
 * Below this a session is recorded as abandoned rather than completed —
 * a mis-tap should not enter the history, but the threshold stays well
 * under any real minimum so it never eats a genuine attempt.
 */
export const MIN_SESSION_MS = 30_000;

const DAY_MS = 86_400_000;
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timezone, fmt);
  return fmt;
}

/** Parse a `YYYY-MM-DD` key into its numeric parts. */
export function parseDay(day: string): { year: number; month: number; date: number } {
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  return { year, month, date };
}

/** Shift a `YYYY-MM-DD` key by whole days. Calendar arithmetic, no timezone. */
export function addDays(day: string, delta: number): string {
  const { year, month, date } = parseDay(day);
  const shifted = new Date(Date.UTC(year, month - 1, date) + delta * DAY_MS);
  return shifted.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  const ms =
    Date.UTC(b.year, b.month - 1, b.date) - Date.UTC(a.year, a.month - 1, a.date);
  return Math.round(ms / DAY_MS);
}

/**
 * Which day an instant belongs to, given the owner's timezone and the hour
 * at which their day starts.
 *
 * Works off local wall-clock parts rather than shifting the instant, so a
 * DST transition inside the pre-dawn window cannot move the answer.
 */
export function resolveCreditedDay(
  instantMs: number,
  timezone: string,
  dayStartHour: number,
): string {
  const parts = formatterFor(timezone).formatToParts(new Date(instantMs));
  let year = "";
  let month = "";
  let date = "";
  let hour = "";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") date = part.value;
    else if (part.type === "hour") hour = part.value;
  }
  const day = `${year}-${month}-${date}`;
  // hourCycle h23 still renders midnight as "24" in some ICU builds.
  const localHour = Number(hour) % 24;
  return localHour < dayStartHour ? addDays(day, -1) : day;
}

/**
 * Whether a blank day is inside the cadence budget and so does not break a
 * streak. Daily practices have no budget: every day counts.
 */
export function isWithinCadenceBudget(
  day: string,
  credited: ReadonlySet<string>,
  cadence: Cadence,
): boolean {
  if (cadence.kind === "daily") return false;
  let hits = 0;
  for (let back = 0; back < CADENCE_WINDOW_DAYS; back += 1) {
    if (credited.has(addDays(day, -back))) hits += 1;
  }
  return hits >= cadence.times;
}

/**
 * Current and longest streaks, counted in credited days.
 *
 * A blank day inside the cadence budget is stepped over rather than
 * breaking the run. Today being blank is never held against you — the day
 * isn't over — so the walk starts at yesterday in that case.
 */
export function computeStreak(
  creditedDays: readonly string[],
  cadence: Cadence,
  today: string,
): { current: number; longest: number } {
  const credited = new Set(creditedDays);
  if (credited.size === 0) return { current: 0, longest: 0 };

  let cursor = credited.has(today) ? today : addDays(today, -1);
  let current = 0;
  for (let guard = 0; guard < 3650; guard += 1) {
    if (credited.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (isWithinCadenceBudget(cursor, credited, cadence)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }

  const sorted = [...credited].sort();
  const first = sorted[0];
  let longest = 0;
  let run = 0;
  const span = Math.min(daysBetween(first, today), 3650);
  for (let offset = 0; offset <= span; offset += 1) {
    const day = addDays(first, offset);
    if (credited.has(day)) {
      run += 1;
      if (run > longest) longest = run;
    } else if (!isWithinCadenceBudget(day, credited, cadence)) {
      run = 0;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

/**
 * Recency-weighted share of the cadence budget met over the last 30 days,
 * as 0-100.
 *
 * The denominator is what the cadence asks for, so a 4-per-week practice
 * reaches 100 at four days a week rather than seven.
 */
export function computeMomentum(
  creditedDays: readonly string[],
  cadence: Cadence,
  today: string,
): number {
  const credited = new Set(creditedDays);
  const needPerDay = cadence.kind === "daily" ? 1 : cadence.times / 7;

  let earned = 0;
  let asked = 0;
  for (let back = 0; back < MOMENTUM_WINDOW_DAYS; back += 1) {
    const weight = Math.pow(0.5, back / MOMENTUM_HALF_LIFE_DAYS);
    asked += weight * needPerDay;
    if (credited.has(addDays(today, -back))) earned += weight;
  }
  if (asked === 0) return 0;

  const score = Math.round((earned / asked) * 100);
  return Math.min(100, Math.max(0, score));
}

/**
 * Lifetime repair tokens earned: one per seven calendar-consecutive
 * credited days. Forgiven gaps do not extend a run for this purpose —
 * tokens are earned by actually showing up.
 */
export function countEarnedTokens(creditedDays: readonly string[]): number {
  if (creditedDays.length === 0) return 0;
  const sorted = [...new Set(creditedDays)].sort();

  let earned = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (daysBetween(sorted[i - 1], sorted[i]) === 1) {
      run += 1;
    } else {
      earned += Math.floor(run / TOKEN_EARN_RUN_DAYS);
      run = 1;
    }
  }
  earned += Math.floor(run / TOKEN_EARN_RUN_DAYS);
  return earned;
}

/**
 * Whether a repair token may be spent on `day`: blank, not in the future,
 * and inside the repair window.
 */
export function isRepairable(
  day: string,
  creditedDays: readonly string[],
  today: string,
): boolean {
  if (new Set(creditedDays).has(day)) return false;
  const age = daysBetween(day, today);
  return age > 0 && age <= REPAIR_WINDOW_DAYS;
}

/**
 * How many tokens a bank gains, given lifetime earned before and now.
 * The bank is capped; overflow is dropped silently rather than surfaced
 * as something lost.
 */
export function applyTokenEarnings(
  bank: number,
  earnedBefore: number,
  earnedNow: number,
): number {
  const gained = Math.max(0, earnedNow - earnedBefore);
  return Math.min(MAX_REPAIR_TOKENS, bank + gained);
}
