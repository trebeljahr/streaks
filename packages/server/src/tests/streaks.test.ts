import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_REPAIR_TOKENS,
  addDays,
  applyTokenEarnings,
  computeMomentum,
  computeStreak,
  countEarnedTokens,
  daysBetween,
  isRepairable,
  isWithinCadenceBudget,
  resolveCreditedDay,
} from "@starter/shared";
import type { Cadence } from "@starter/shared";

const DAILY: Cadence = { kind: "daily" };
const FOUR_A_WEEK: Cadence = { kind: "perWeek", times: 4 };
const TODAY = "2026-09-01";

/** Credited-day keys for the given offsets back from TODAY. */
function daysBack(offsets: readonly number[]): string[] {
  return offsets.map((n) => addDays(TODAY, -n));
}

// ── Calendar arithmetic ──────────────────────────────────────────────

test("addDays crosses month, year and leap-day boundaries", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
});

test("daysBetween is signed and spans years", () => {
  assert.equal(daysBetween("2026-09-01", "2026-09-08"), 7);
  assert.equal(daysBetween("2026-09-08", "2026-09-01"), -7);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
  assert.equal(daysBetween("2026-09-01", "2026-09-01"), 0);
});

// ── Day boundary ─────────────────────────────────────────────────────

test("a session before the day-start hour credits the previous day", () => {
  // 01:30 local in Berlin (UTC+2 in September).
  const lateNight = Date.parse("2026-09-01T23:30:00Z");
  assert.equal(resolveCreditedDay(lateNight, "Europe/Berlin", 4), "2026-09-01");

  // 05:30 local — past the 4am boundary, so it belongs to the new day.
  const morning = Date.parse("2026-09-02T03:30:00Z");
  assert.equal(resolveCreditedDay(morning, "Europe/Berlin", 4), "2026-09-02");
});

test("dayStartHour 0 makes the boundary midnight", () => {
  const justAfterMidnight = Date.parse("2026-09-01T22:30:00Z"); // 00:30 Berlin
  assert.equal(
    resolveCreditedDay(justAfterMidnight, "Europe/Berlin", 0),
    "2026-09-02",
  );
});

test("spring-forward DST does not move the credited day", () => {
  // Berlin 2026-03-29: 02:00 CET jumps to 03:00 CEST.
  // 01:30 local, still UTC+1.
  const before = Date.parse("2026-03-29T00:30:00Z");
  assert.equal(resolveCreditedDay(before, "Europe/Berlin", 4), "2026-03-28");

  // 03:30 local, now UTC+2 — the hour 02:00-03:00 never existed.
  const after = Date.parse("2026-03-29T01:30:00Z");
  assert.equal(resolveCreditedDay(after, "Europe/Berlin", 4), "2026-03-28");

  // 04:30 local — first instant of the new practice day.
  const past = Date.parse("2026-03-29T02:30:00Z");
  assert.equal(resolveCreditedDay(past, "Europe/Berlin", 4), "2026-03-29");
});

test("fall-back DST repeats a wall-clock hour without double-crediting", () => {
  // Berlin 2026-10-25: 03:00 CEST falls back to 02:00 CET, so 02:30 local
  // happens twice. Both instants belong to the previous practice day.
  const firstPass = Date.parse("2026-10-25T00:30:00Z"); // 02:30 CEST
  const secondPass = Date.parse("2026-10-25T01:30:00Z"); // 02:30 CET
  assert.equal(resolveCreditedDay(firstPass, "Europe/Berlin", 4), "2026-10-24");
  assert.equal(resolveCreditedDay(secondPass, "Europe/Berlin", 4), "2026-10-24");
});

test("the same instant credits different days in different timezones", () => {
  const instant = Date.parse("2026-09-01T20:00:00Z");
  assert.equal(resolveCreditedDay(instant, "Europe/Berlin", 4), "2026-09-01");
  assert.equal(resolveCreditedDay(instant, "Pacific/Auckland", 4), "2026-09-02");
  assert.equal(resolveCreditedDay(instant, "America/Los_Angeles", 4), "2026-09-01");
});

// ── Cadence budget ───────────────────────────────────────────────────

test("a daily practice has no budget for blank days", () => {
  const credited = new Set(daysBack([0, 1, 2, 4, 5, 6, 7]));
  assert.equal(isWithinCadenceBudget(addDays(TODAY, -3), credited, DAILY), false);
});

test("a blank day is forgiven while the weekly quota is met", () => {
  const credited = new Set(daysBack([0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 12]));
  assert.equal(
    isWithinCadenceBudget(addDays(TODAY, -3), credited, FOUR_A_WEEK),
    true,
  );

  const thin = new Set(daysBack([0, 1, 2, 6, 7]));
  assert.equal(
    isWithinCadenceBudget(addDays(TODAY, -3), thin, FOUR_A_WEEK),
    false,
  );
});

// ── Streak ───────────────────────────────────────────────────────────

test("an empty history has no streak", () => {
  assert.deepEqual(computeStreak([], DAILY, TODAY), { current: 0, longest: 0 });
});

test("a daily streak counts consecutive credited days", () => {
  const { current, longest } = computeStreak(
    daysBack([0, 1, 2, 3, 4]),
    DAILY,
    TODAY,
  );
  assert.equal(current, 5);
  assert.equal(longest, 5);
});

test("a daily streak breaks on any blank day", () => {
  const { current } = computeStreak(daysBack([0, 2, 3, 4]), DAILY, TODAY);
  assert.equal(current, 1);
});

test("today being blank does not break the streak — the day is not over", () => {
  const { current } = computeStreak(daysBack([1, 2, 3, 4]), DAILY, TODAY);
  assert.equal(current, 4);
});

test("a cadence-legal miss is stepped over, not counted", () => {
  // Blank at 3 and 8; both sit inside a 4-per-week budget.
  const { current, longest } = computeStreak(
    daysBack([0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 12]),
    FOUR_A_WEEK,
    TODAY,
  );
  assert.equal(current, 11);
  assert.equal(longest, 11);
});

test("a streak breaks once the weekly quota is genuinely missed", () => {
  // Only three credited days in the window around the blank at 3.
  const { current } = computeStreak(
    daysBack([0, 1, 2, 6, 7, 9, 10, 11, 12]),
    FOUR_A_WEEK,
    TODAY,
  );
  assert.equal(current, 3);
});

test("longest is never reported below the current run", () => {
  const { current, longest } = computeStreak(
    daysBack([0, 1, 2, 3]),
    DAILY,
    TODAY,
  );
  assert.equal(longest >= current, true);
});

// ── Momentum ─────────────────────────────────────────────────────────

test("momentum is empty with no history and full when every day is credited", () => {
  assert.equal(computeMomentum([], DAILY, TODAY), 0);

  const everyDay = daysBack(Array.from({ length: 30 }, (_, i) => i));
  assert.equal(computeMomentum(everyDay, DAILY, TODAY), 100);
});

test("a 4-per-week cadence reaches 100 without practising daily", () => {
  // Four days on, three off, repeated across the window.
  const offsets: number[] = [];
  for (let i = 0; i < 30; i += 1) if (i % 7 < 4) offsets.push(i);
  assert.equal(computeMomentum(daysBack(offsets), FOUR_A_WEEK, TODAY), 100);
});

test("coming back moves momentum far more than the same days long ago", () => {
  const recent = computeMomentum(daysBack([0, 1, 2]), DAILY, TODAY);
  const stale = computeMomentum(daysBack([27, 28, 29]), DAILY, TODAY);

  // Three days after two dead weeks has to feel like progress, not noise.
  assert.equal(recent >= 20, true, `recent comeback scored ${recent}`);
  assert.equal(
    recent > stale * 5,
    true,
    `recent ${recent} should dwarf stale ${stale}`,
  );
});

test("momentum stays inside 0-100", () => {
  const overshoot = daysBack(Array.from({ length: 30 }, (_, i) => i));
  const score = computeMomentum(overshoot, FOUR_A_WEEK, TODAY);
  assert.equal(score <= 100, true);
  assert.equal(score >= 0, true);
});

// ── Repair tokens ────────────────────────────────────────────────────

test("one token is earned per seven consecutive credited days", () => {
  assert.equal(countEarnedTokens([]), 0);
  assert.equal(countEarnedTokens(daysBack([0, 1, 2, 3, 4, 5])), 0);
  assert.equal(countEarnedTokens(daysBack([0, 1, 2, 3, 4, 5, 6])), 1);
  assert.equal(
    countEarnedTokens(daysBack(Array.from({ length: 14 }, (_, i) => i))),
    2,
  );
});

test("forgiven gaps do not extend a token-earning run", () => {
  // Two runs of seven, split by a blank — still two tokens, not three.
  const offsets = [...Array(7).keys(), ...Array(7).keys()].map((n, i) =>
    i < 7 ? n : n + 8,
  );
  assert.equal(countEarnedTokens(daysBack(offsets)), 2);

  // Thirteen consecutive days is one full run plus change.
  assert.equal(
    countEarnedTokens(daysBack(Array.from({ length: 13 }, (_, i) => i))),
    1,
  );
});

test("duplicate credited days do not inflate token earnings", () => {
  const seven = daysBack([0, 1, 2, 3, 4, 5, 6]);
  assert.equal(countEarnedTokens([...seven, ...seven]), 1);
});

test("the bank is capped and overflow is dropped silently", () => {
  assert.equal(applyTokenEarnings(2, 3, 5), MAX_REPAIR_TOKENS);
  assert.equal(applyTokenEarnings(0, 3, 4), 1);
  assert.equal(applyTokenEarnings(1, 4, 4), 1);
  // Earnings never go backwards, even if a recount comes in lower.
  assert.equal(applyTokenEarnings(2, 5, 3), 2);
});

test("only blank days inside the repair window can be repaired", () => {
  const credited = daysBack([0, 1, 5]);
  assert.equal(isRepairable(addDays(TODAY, -3), credited, TODAY), true);
  assert.equal(isRepairable(addDays(TODAY, -7), credited, TODAY), true);
  // Too old.
  assert.equal(isRepairable(addDays(TODAY, -8), credited, TODAY), false);
  // Already credited.
  assert.equal(isRepairable(addDays(TODAY, -5), credited, TODAY), false);
  // Today is not over, and the future is not repairable.
  assert.equal(isRepairable(TODAY, credited, TODAY), false);
  assert.equal(isRepairable(addDays(TODAY, 1), credited, TODAY), false);
});
